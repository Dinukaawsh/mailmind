import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

/**
 * Campaigns API Routes
 * GET: Fetch all campaigns from MongoDB
 * POST: Create a new campaign in MongoDB
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

// GET: Fetch all campaigns
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
    const collection = db.collection("campaigns");

    // Fetch all campaigns, sorted by createdAt (newest first)
    const data = await collection.find({}).sort({ createdAt: -1 }).toArray();

    // Transform to match frontend format
    const formattedData = data.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      sentCount: item.sentCount || 0,
      openRate: item.openRate || 0,
      replyRate: item.replyRate || 0,
      bounceRate: item.bounceRate || 0,
      unsubscribeCount: item.unsubscribeCount || 0,
      status: item.status || "paused",
      createdAt: item.createdAt || new Date().toISOString(),
      startDate: item.startDate,
      startTime: item.startTime,
      domainId: item.domainId,
      template: item.template,
      subject: item.subject,
      bodyImage: item.bodyImage,
      followUpTemplate: item.followUpTemplate,
      followUpDelay: item.followUpDelay || 7,
      csvData: item.csvData || [],
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch campaigns from MongoDB",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// POST: Create a new campaign
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
    const {
      name,
      domainId,
      template,
      subject,
      subjectImage,
      bodyImage,
      followUpTemplate,
      followUpDelay,
      startDate,
      startTime,
      csvData,
    } = body;

    // Validate required fields
    if (!name || !domainId || !template) {
      return NextResponse.json(
        { error: "Missing required fields: name, domainId, template" },
        { status: 400 }
      );
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collection = db.collection("campaigns");

    // Create campaign document
    const campaignDoc = {
      name,
      domainId,
      template,
      subject: subject || "",
      bodyImage: bodyImage || "",
      followUpTemplate: followUpTemplate || "",
      followUpDelay: parseInt(followUpDelay),
      startDate: startDate || "",
      startTime: startTime || "",
      csvData: csvData || [],
      sentCount: 0,
      openRate: 0,
      replyRate: 0,
      bounceRate: 0,
      unsubscribeCount: 0,
      status: "paused", // New campaigns start as paused
      createdAt: new Date().toISOString(),
    };

    const result = await collection.insertOne(campaignDoc);

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        ...campaignDoc,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create campaign in MongoDB",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
