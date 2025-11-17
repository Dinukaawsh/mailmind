import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

/**
 * Single Campaign API Routes
 * GET: Fetch campaign by ID
 * PUT: Update campaign
 * DELETE: Delete campaign
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

// GET: Fetch campaign by ID
export async function GET(
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

    const campaign = await collection.findOne({ _id: new ObjectId(id) });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Transform to match frontend format
    const formattedCampaign = {
      id: campaign._id.toString(),
      name: campaign.name,
      sentCount: campaign.sentCount || 0,
      openRate: campaign.openRate || 0,
      replyRate: campaign.replyRate || 0,
      bounceRate: campaign.bounceRate || 0,
      unsubscribeCount: campaign.unsubscribeCount || 0,
      status: campaign.status || "paused",
      createdAt: campaign.createdAt || new Date().toISOString(),
      startDate: campaign.startDate,
      startTime: campaign.startTime,
      domainId: campaign.domainId,
      template: campaign.template,
      subject: campaign.subject,
      bodyImage: campaign.bodyImage,
      bodyImageS3Url: campaign.bodyImageS3Url || "",
      csvFileS3Url: campaign.csvFileS3Url || "",
      followUpTemplate: campaign.followUpTemplate,
      followUpDelay: campaign.followUpDelay || 7,
      csvData: campaign.csvData || [],
    };

    return NextResponse.json(formattedCampaign);
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch campaign from MongoDB",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT: Update campaign
export async function PUT(
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

    const body = await request.json();
    const {
      name,
      domainId,
      subject,
      template,
      bodyImage,
      bodyImageS3Url,
      csvFileS3Url,
      followUpTemplate,
      followUpDelay,
      startDate,
      startTime,
      csvData,
    } = body;

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collection = db.collection("campaigns");

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (domainId !== undefined) updateData.domainId = domainId;
    if (subject !== undefined) updateData.subject = subject;
    if (template !== undefined) updateData.template = template;
    if (bodyImageS3Url !== undefined) {
      // Allow empty string to clear the image
      updateData.bodyImage = bodyImageS3Url;
      updateData.bodyImageS3Url = bodyImageS3Url;
    } else if (bodyImage !== undefined) {
      // Allow empty string to clear the image
      updateData.bodyImage = bodyImage;
      // If bodyImage is empty, also clear bodyImageS3Url
      if (bodyImage === "") {
        updateData.bodyImageS3Url = "";
      }
    }
    if (csvFileS3Url !== undefined) updateData.csvFileS3Url = csvFileS3Url;
    if (followUpTemplate !== undefined)
      updateData.followUpTemplate = followUpTemplate;
    if (followUpDelay !== undefined) updateData.followUpDelay = followUpDelay;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (csvData !== undefined) updateData.csvData = csvData; // Updated lead data from edits
    if (body.status !== undefined) updateData.status = body.status;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to update campaign in MongoDB",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete campaign
export async function DELETE(
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

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete campaign from MongoDB",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
