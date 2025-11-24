import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import {
  ensureStartDateTime,
  getScheduleFieldsForResponse,
} from "./utils/schedule";

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
    const formattedData = data.map((item) => {
      const scheduleFields = getScheduleFieldsForResponse(item as any);
      return {
        id: item._id.toString(),
        name: item.name,
        sentCount: item.sentCount || 0,
        openRate: item.openRate || 0,
        replyRate: item.replyRate || 0,
        bounceRate: item.bounceRate || 0,
        unsubscribeCount: item.unsubscribeCount || 0,
        status: item.status || "paused",
        createdAt: item.createdAt || new Date().toISOString(),
        startDate: scheduleFields.startDate,
        startTime: scheduleFields.startTime,
        startDateTime: scheduleFields.startDateTime,
        domainId: item.domainId,
        template: item.template,
        subject: item.subject,
        bodyImage: item.bodyImage,
        bodyImageS3Url: item.bodyImageS3Url || "",
        csvFileS3Url: item.csvFileS3Url || "",
        followUpTemplate: item.followUpTemplate,
        followUpDelay: item.followUpDelay || 7,
        csvData: item.csvData || [],
        isActive: item.isActive !== undefined ? item.isActive : true, // Default to true for backward compatibility
        isProcessing: item.isProcessing || false, // Processing status
        processedAt: item.processedAt || undefined, // When processing completed
      };
    });

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
      bodyImageS3Url,
      csvFileS3Url,
      followUpTemplate,
      followUpDelay,
      startDate,
      startTime,
      startDateTime,
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
    const startDateTimeValue = ensureStartDateTime({
      startDateTime,
      startDate,
      startTime,
    });

    const campaignDoc: Record<string, any> = {
      name,
      domainId,
      template,
      subject: subject || "",
      bodyImage: bodyImageS3Url || bodyImage || "", // Prefer S3 URL over base64
      bodyImageS3Url: bodyImageS3Url || "",
      csvFileS3Url: csvFileS3Url || "",
      followUpTemplate: followUpTemplate || "",
      followUpDelay: parseInt(followUpDelay),
      csvData: csvData || [],
      sentCount: 0,
      openRate: 0,
      replyRate: 0,
      bounceRate: 0,
      unsubscribeCount: 0,
      status: "paused", // New campaigns start as paused
      createdAt: new Date().toISOString(),
      isActive: true, // New campaigns are active by default
      isProcessing: true, // Campaign is being processed by webhook
    };

    if (startDateTimeValue) {
      campaignDoc.startDateTime = startDateTimeValue;
    }

    const result = await collection.insertOne(campaignDoc);
    const campaignId = result.insertedId.toString();

    // Send campaign ID to webhook for processing
    const webhookUrl = process.env.CAMPAIGN_PROCESSING_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn(
        "⚠️ CAMPAIGN_PROCESSING_WEBHOOK_URL not configured. Skipping webhook call. Campaign will be marked as not processing."
      );
      // Mark as not processing if webhook URL is not configured
      await collection.updateOne(
        { _id: result.insertedId },
        { $set: { isProcessing: false } }
      );
    } else {
      try {
        console.log(
          `📤 Sending campaign ID ${campaignId} to webhook for processing...`
        );

        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaignId: campaignId,
          }),
        });

        if (webhookResponse.ok) {
          const responseData = await webhookResponse.json().catch(() => ({}));
          console.log(
            `✅ Webhook processing initiated for campaign ${campaignId}`,
            responseData
          );

          // Webhook will call back to /api/campaigns/[id]/processing-complete
          // to mark isProcessing as false when done
        } else {
          console.error(
            `❌ Webhook returned error status: ${webhookResponse.status}`
          );
          // Mark as not processing if webhook fails immediately
          await collection.updateOne(
            { _id: result.insertedId },
            { $set: { isProcessing: false } }
          );
        }
      } catch (webhookError: any) {
        console.error(
          "❌ Failed to send campaign ID to webhook:",
          webhookError.message
        );
        // Mark as not processing if webhook call fails
        await collection.updateOne(
          { _id: result.insertedId },
          { $set: { isProcessing: false } }
        );
      }
    }

    return NextResponse.json(
      {
        id: campaignId,
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
