import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

/**
 * Historical Campaign Logs Route
 * GET: Fetch historical logs from MongoDB database
 */

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

// GET: Fetch historical logs from database
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

    if (!process.env.MONGODB_URI || !process.env.MONGODB_DATABASE) {
      return NextResponse.json(
        {
          error: "MongoDB configuration missing",
          logs: [],
          isComplete: false,
        },
        { status: 200 } // Return empty logs instead of error
      );
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collection = db.collection("campaignLogs");

    // Find logs for this campaign
    const logDocument = await collection.findOne({ campaignId: id });

    if (!logDocument) {
      return NextResponse.json({
        logs: [],
        isComplete: false,
        completionMessage: null,
        count: 0,
        lastUpdated: null,
      });
    }

    // Extract logs array (flatten if it's nested)
    const logs = Array.isArray(logDocument.logs) ? logDocument.logs : [];

    return NextResponse.json({
      logs,
      isComplete: logDocument.isComplete || false,
      completionMessage: logDocument.completionMessage || null,
      count: logs.length,
      lastUpdated: logDocument.lastUpdated || null,
    });
  } catch (error: any) {
    console.error("Historical Logs GET Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch historical logs",
        message: error.message,
        logs: [],
        isComplete: false,
      },
      { status: 500 }
    );
  }
}
