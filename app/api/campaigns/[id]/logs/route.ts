import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

/**
 * Campaign Logs Route
 * POST: Receive logs from n8n webhook (saves to MongoDB)
 * GET: Fetch logs for frontend (from in-memory cache or MongoDB)
 */

// In-memory storage for active/streaming logs
// Format: { campaignId: { logs: string[], lastUpdated: Date, isComplete: boolean, completionMessage?: string } }
const logsStore: Record<
  string,
  {
    logs: string[];
    lastUpdated: Date;
    isComplete: boolean;
    completionMessage?: string;
  }
> = {};

let client: MongoClient | null = null;

async function getMongoClient() {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

// Save logs to MongoDB
async function saveLogsToDatabase(
  campaignId: string,
  logs: string[],
  isComplete: boolean,
  completionMessage?: string
) {
  try {
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DATABASE) {
      console.warn("MongoDB not configured, skipping database save");
      return;
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collection = db.collection("campaignLogs");

    // Upsert: Update existing or create new document
    // First, try to get existing document
    const existing = await collection.findOne({ campaignId: campaignId });

    if (existing) {
      // Update existing: replace logs array and update status
      // Merge existing logs with new logs to avoid duplicates
      const existingLogs = existing.logs || [];
      const allLogs = [...existingLogs, ...logs];

      await collection.updateOne(
        { campaignId: campaignId },
        {
          $set: {
            logs: allLogs,
            isComplete: isComplete,
            completionMessage: completionMessage || null,
            lastUpdated: new Date(),
          },
        }
      );
    } else {
      // Create new document
      await collection.insertOne({
        campaignId: campaignId,
        logs: logs,
        isComplete: isComplete,
        completionMessage: completionMessage || null,
        lastUpdated: new Date(),
      });
    }
  } catch (error) {
    console.error("Failed to save logs to database:", error);
    // Don't throw - we still want to return success even if DB save fails
  }
}

// POST: Receive logs from n8n webhook
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid campaign ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if this is a completion message
    // Support multiple formats including campaign statistics
    const isComplete =
      body.complete === true ||
      body.completed === true ||
      body.done === true ||
      body.status === "complete" ||
      body.status === "completed" ||
      body.status === "done" ||
      body.finished === true ||
      // Detect campaign statistics format (indicates completion)
      (body.Campaign_ID !== undefined &&
        body.Total_Emails_Sent !== undefined) ||
      (body.campaignId !== undefined && body.totalEmailsSent !== undefined);

    // Extract completion message if present
    let completionMessage =
      body.completionMessage ||
      body.completion ||
      body.message ||
      body.statusMessage;

    // If it's a campaign statistics format, create a completion message
    if (isComplete && !completionMessage) {
      if (body.Campaign_ID || body.campaignId) {
        const totalSent = body.Total_Emails_Sent || body.totalEmailsSent || 0;
        const startTime = body.Start_Time || body.startTime;
        const endTime = body.End_Time || body.endTime;
        const duration = body.Duration_Minutes || body.durationMinutes;

        // Format the completion message nicely
        let message = `✅ Campaign completed successfully!\n📧 Total emails sent: ${totalSent}`;

        if (startTime && endTime) {
          const start = new Date(startTime);
          const end = new Date(endTime);
          message += `\n⏰ Started: ${start.toLocaleString()}\n⏰ Ended: ${end.toLocaleString()}`;

          // Calculate duration if not provided
          if (duration === null || duration === undefined) {
            const diffMs = end.getTime() - start.getTime();
            const diffMins = Math.round(diffMs / 60000);
            if (diffMins > 0) {
              message += `\n⏱️ Duration: ${diffMins} minutes`;
            }
          }
        }

        if (duration !== null && duration !== undefined && duration > 0) {
          message += `\n⏱️ Duration: ${duration} minutes`;
        }

        completionMessage = message;
      }
    }

    // Extract log message(s) from request body
    let logMessages: string[] = [];

    // If it's a completion message with statistics, don't add raw JSON as log
    // The completion message will be added separately
    if (isComplete && (body.Campaign_ID || body.campaignId)) {
      // Don't add the statistics JSON as a log entry
      // The completion message will be added instead
      logMessages = [];
    } else if (typeof body === "string") {
      logMessages = [body];
    } else if (Array.isArray(body)) {
      logMessages = body.map((item: any) =>
        typeof item === "string" ? item : JSON.stringify(item)
      );
    } else if (body.message && !isComplete) {
      logMessages = [body.message];
    } else if (body.log) {
      logMessages = [body.log];
    } else if (body.logs && Array.isArray(body.logs)) {
      logMessages = body.logs;
    } else if (body.logs && typeof body.logs === "string") {
      logMessages = body.logs.split("\n").filter((line: string) => line.trim());
    } else if (!isComplete) {
      // Fallback: stringify the entire body (only if not a completion message)
      logMessages = [JSON.stringify(body, null, 2)];
    }

    // Initialize logs array for this campaign if it doesn't exist
    if (!logsStore[id]) {
      logsStore[id] = {
        logs: [],
        lastUpdated: new Date(),
        isComplete: false,
      };
    }

    // Append new logs (if any)
    if (logMessages.length > 0) {
      logsStore[id].logs.push(...logMessages);
    }

    // Update completion status
    if (isComplete) {
      logsStore[id].isComplete = true;
      if (completionMessage) {
        logsStore[id].completionMessage = completionMessage;
        // Add completion message as the last log entry if not already added
        const lastLog = logsStore[id].logs[logsStore[id].logs.length - 1];
        if (lastLog !== completionMessage) {
          logsStore[id].logs.push(completionMessage);
        }
      } else if (logMessages.length > 0) {
        // If no explicit completion message but we have logs, use the last one
        logsStore[id].completionMessage = logMessages[logMessages.length - 1];
      } else {
        // Fallback completion message if none provided
        logsStore[id].completionMessage = "Campaign processing completed";
        logsStore[id].logs.push("Campaign processing completed");
      }
    }

    logsStore[id].lastUpdated = new Date();

    // Save logs to MongoDB (async, don't wait)
    // Save all current logs, not just new ones
    if (logMessages.length > 0 || isComplete) {
      saveLogsToDatabase(
        id,
        logsStore[id].logs, // Save all logs
        logsStore[id].isComplete,
        logsStore[id].completionMessage
      ).catch((error) => {
        console.error("Background save to database failed:", error);
      });
    }

    // Keep only last 1000 logs per campaign to prevent memory issues
    if (logsStore[id].logs.length > 1000) {
      logsStore[id].logs = logsStore[id].logs.slice(-1000);
    }

    return NextResponse.json({
      success: true,
      message: "Logs received",
      logsCount: logsStore[id].logs.length,
    });
  } catch (error: any) {
    console.error("Logs POST Error:", error);
    return NextResponse.json(
      {
        error: "Failed to receive logs",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// GET: Fetch logs for frontend (always from database - webhook saves logs there)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid campaign ID" },
        { status: 400 }
      );
    }

    // Always fetch from database - webhook saves logs there
    if (process.env.MONGODB_URI && process.env.MONGODB_DATABASE) {
      try {
        const mongoClient = await getMongoClient();
        const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
        const collection = db.collection("campaignLogs");

        const logDocument = await collection.findOne({ campaignId: id });

        if (logDocument) {
          const logs = Array.isArray(logDocument.logs) ? logDocument.logs : [];
          return NextResponse.json({
            logs,
            lastUpdated: logDocument.lastUpdated || null,
            count: logs.length,
            isComplete: logDocument.isComplete || false,
            completionMessage: logDocument.completionMessage || null,
          });
        }
      } catch (dbError) {
        console.error("Database fetch error:", dbError);
        // Fall through to return empty logs
      }
    }

    // Also check in-memory store as fallback for active streaming (before saved to DB)
    if (logsStore[id]) {
      const logs = logsStore[id].logs || [];
      const lastUpdated = logsStore[id].lastUpdated || null;
      const isComplete = logsStore[id].isComplete || false;
      const completionMessage = logsStore[id].completionMessage || null;

      return NextResponse.json({
        logs,
        lastUpdated,
        count: logs.length,
        isComplete,
        completionMessage,
      });
    }

    // Return empty if nothing found
    return NextResponse.json({
      logs: [],
      lastUpdated: null,
      count: 0,
      isComplete: false,
      completionMessage: null,
    });
  } catch (error: any) {
    console.error("Logs GET Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch logs",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE: Clear logs for a campaign (optional cleanup)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid campaign ID" },
        { status: 400 }
      );
    }

    delete logsStore[id];

    return NextResponse.json({
      success: true,
      message: "Logs cleared",
    });
  } catch (error: any) {
    console.error("Logs DELETE Error:", error);
    return NextResponse.json(
      {
        error: "Failed to clear logs",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
