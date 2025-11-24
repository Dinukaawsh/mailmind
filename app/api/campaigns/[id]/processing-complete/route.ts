import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

/**
 * Processing Complete Callback Route
 * Called by the n8n webhook when campaign processing is complete
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

// POST: Mark campaign processing as complete
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid campaign ID" },
        { status: 400 }
      );
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collection = db.collection("campaigns");

    // Check if campaign exists
    const campaign = await collection.findOne({ _id: new ObjectId(id) });

    if (!campaign) {
      console.error(`❌ Campaign ${id} not found`);
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    console.log(`📥 Received processing-complete callback for campaign ${id}`);
    console.log(`   Current status: isProcessing=${campaign.isProcessing}`);

    // Mark processing as complete
    const updateResult = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isProcessing: false,
          processedAt: new Date().toISOString(),
        },
      }
    );

    console.log(`✅ Campaign ${id} processing marked as complete`);
    console.log(`   Updated ${updateResult.modifiedCount} document(s)`);

    return NextResponse.json({
      success: true,
      message: "Campaign processing marked as complete",
      campaignId: id,
    });
  } catch (error: any) {
    console.error("Processing Complete Callback Error:", error);
    return NextResponse.json(
      {
        error: "Failed to mark campaign processing as complete",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
