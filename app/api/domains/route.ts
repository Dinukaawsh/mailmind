import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

/**
 * Domains API Route
 * Handles fetching all domains and creating new domains
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

// GET: Fetch all domains
export async function GET() {
  try {
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
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collection = db.collection("domains");

    // Fetch all domains, sorted by createdAt (newest first)
    const data = await collection.find({}).sort({ createdAt: -1 }).toArray();

    // Transform to match frontend format
    const formattedData = data.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      status: item.status || "connected",
      lastSyncTime: item.lastSyncTime || new Date().toISOString(),
      emailsSentPerDay: item.emailsSentPerDay || 0,
      type: item.type || "custom",
      webhookUrl: item.webhookUrl || "",
      createdAt: item.createdAt || "",
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch domains from MongoDB",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// POST: Create a new domain
// NOTE: This endpoint is no longer used in the main flow.
// Domain creation is now handled by the n8n webhook which writes directly to MongoDB.
// This endpoint is kept for backward compatibility or manual testing purposes only.
export async function POST(request: Request) {
  try {
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DATABASE) {
      return NextResponse.json(
        {
          error:
            "MongoDB configuration missing. Please set MONGODB_URI and MONGODB_DATABASE.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, type, webhookUrl } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: "Missing required fields: name, type" },
        { status: 400 }
      );
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collection = db.collection("domains");

    // Check if domain already exists
    const existingDomain = await collection.findOne({ name });
    if (existingDomain) {
      return NextResponse.json(
        { error: "Domain already exists" },
        { status: 400 }
      );
    }

    // Create domain document
    const domainDoc = {
      name,
      type: type || "custom",
      status: "connected",
      emailsSentPerDay: 0,
      lastSyncTime: new Date().toISOString(),
      webhookUrl: webhookUrl || "",
      createdAt: new Date().toISOString(),
    };

    const result = await collection.insertOne(domainDoc);

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        ...domainDoc,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create domain in MongoDB",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
