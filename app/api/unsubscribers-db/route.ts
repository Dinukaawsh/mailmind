import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

/**
 * Fetches unsubscribers from MongoDB
 *
 * Data Flow:
 * External API → Writes to MongoDB (Email, Timestamp, Action)
 * This endpoint → Reads from MongoDB (for frontend display)
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

export async function GET() {
  try {
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DATABASE) {
      return NextResponse.json(
        {
          error:
            "MongoDB configuration missing. Please set MONGODB_URI and MONGODB_DATABASE.",
        },
        { status: 500 }
      );
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE);
    const collection = db.collection("unsubscribers");

    // Fetch all unsubscribers, sorted by timestamp (newest first)
    const data = await collection
      .find({})
      .sort({ Timestamp: -1 })
      .project({ _id: 0, Email: 1, Timestamp: 1, Action: 1 })
      .toArray();

    // Transform to match frontend format
    const formattedData = data.map((item) => ({
      Email: item.Email,
      Timestamp: item.Timestamp,
      Action: item.Action || "Unsubscribed",
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch unsubscribers from MongoDB",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
