import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

/**
 * Manual endpoint to mark a campaign as ready
 * POST: Manually mark a campaign as ready (for testing or recovery)
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`🔧 Manually marking campaign ${id} as ready`);

    if (!process.env.MONGODB_URI || !process.env.MONGODB_DATABASE) {
      return NextResponse.json(
        { error: "MongoDB configuration missing" },
        { status: 500 }
      );
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collection = db.collection("campaigns");

    // Validate campaign exists
    const campaign = await collection.findOne({ _id: new ObjectId(id) });
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Update processing status to ready
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          processingStatus: "ready",
        },
      }
    );

    console.log(`✅ Campaign ${id} marked as ready`);

    return NextResponse.json({
      success: true,
      message: `Campaign marked as ready`,
      campaignId: id,
      processingStatus: "ready",
    });
  } catch (error: any) {
    console.error("Error marking campaign as ready:", error);
    return NextResponse.json(
      {
        error: "Failed to mark campaign as ready",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
