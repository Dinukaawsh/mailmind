import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

/**
 * Campaign Logs Route
 * POST: Receive logs from n8n webhook
 * GET: Fetch logs for frontend
 */

// In-memory storage for logs (could be replaced with Redis or MongoDB for production)
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
    const isComplete =
      body.complete === true ||
      body.completed === true ||
      body.done === true ||
      body.status === "complete" ||
      body.status === "completed" ||
      body.status === "done" ||
      body.finished === true;

    // Extract completion message if present
    const completionMessage =
      body.completionMessage ||
      body.completion ||
      body.message ||
      body.statusMessage;

    // Extract log message(s) from request body
    let logMessages: string[] = [];

    if (typeof body === "string") {
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
      }
    }

    logsStore[id].lastUpdated = new Date();

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

// GET: Fetch logs for frontend
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

    const logs = logsStore[id]?.logs || [];
    const lastUpdated = logsStore[id]?.lastUpdated || null;
    const isComplete = logsStore[id]?.isComplete || false;
    const completionMessage = logsStore[id]?.completionMessage || null;

    return NextResponse.json({
      logs,
      lastUpdated,
      count: logs.length,
      isComplete,
      completionMessage,
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
