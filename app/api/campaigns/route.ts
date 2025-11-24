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
        processingStatus: item.processingStatus || "ready", // Default to ready for backward compatibility
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
    };

    if (startDateTimeValue) {
      campaignDoc.startDateTime = startDateTimeValue;
    }

    const result = await collection.insertOne(campaignDoc);
    const campaignId = result.insertedId.toString();

    // Check if webhook processing is enabled
    const enableWebhookProcessing =
      process.env.ENABLE_WEBHOOK_PROCESSING === "true";

    if (enableWebhookProcessing) {
      // Send campaign ID to webhook for processing
      const webhookUrl =
        process.env.CAMPAIGN_PROCESSING_WEBHOOK_URL ||
        "https://n8n.isra-land.com/webhook/65395249-d5f5-42ea-a45b-87382122cc1a";

      console.log(
        `🚀 Sending campaign ${campaignId} to webhook for processing...`
      );

      try {
        // Send to webhook and wait for response
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
          const webhookData = await webhookResponse.json();

          // Check if webhook returned success
          if (webhookData.status === "success") {
            // Mark campaign as ready
            await collection.updateOne(
              { _id: result.insertedId },
              { $set: { processingStatus: "ready" } }
            );

            console.log(
              `✅ Campaign ${campaignId} processed successfully by webhook`
            );

            return NextResponse.json(
              {
                id: campaignId,
                ...campaignDoc,
                processingStatus: "ready",
              },
              { status: 201 }
            );
          } else {
            // Webhook returned error status
            await collection.updateOne(
              { _id: result.insertedId },
              { $set: { processingStatus: "error" } }
            );

            console.error(
              `❌ Webhook returned error for campaign ${campaignId}:`,
              webhookData
            );

            return NextResponse.json(
              {
                id: campaignId,
                ...campaignDoc,
                processingStatus: "error",
                error: webhookData.message || "Webhook processing failed",
              },
              { status: 201 }
            );
          }
        } else {
          // Webhook request failed
          await collection.updateOne(
            { _id: result.insertedId },
            { $set: { processingStatus: "error" } }
          );

          console.error(
            `❌ Webhook request failed for campaign ${campaignId}: ${webhookResponse.statusText}`
          );

          return NextResponse.json(
            {
              id: campaignId,
              ...campaignDoc,
              processingStatus: "error",
              error: `Webhook request failed: ${webhookResponse.statusText}`,
            },
            { status: 201 }
          );
        }
      } catch (error: any) {
        // Network error or webhook unreachable
        console.error(
          `❌ Error calling webhook for campaign ${campaignId}:`,
          error
        );

        // Mark as error in database
        await collection.updateOne(
          { _id: result.insertedId },
          { $set: { processingStatus: "error" } }
        );

        return NextResponse.json(
          {
            id: campaignId,
            ...campaignDoc,
            processingStatus: "error",
            error: `Webhook error: ${error.message}`,
          },
          { status: 201 }
        );
      }
    } else {
      // Webhook processing disabled - mark as ready immediately
      await collection.updateOne(
        { _id: result.insertedId },
        { $set: { processingStatus: "ready" } }
      );

      console.log(
        `✅ Campaign ${campaignId} created and marked as ready (webhook processing disabled)`
      );

      return NextResponse.json(
        {
          id: campaignId,
          ...campaignDoc,
          processingStatus: "ready",
        },
        { status: 201 }
      );
    }
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
