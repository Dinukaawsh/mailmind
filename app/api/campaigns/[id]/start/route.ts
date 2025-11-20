import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { ensureStartDateTime } from "../../utils/schedule";

/**
 * Start Campaign Route
 * Sends campaign data to webhook URL (n8n)
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

// POST: Start campaign and send to webhook
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
    const domainsCollection = db.collection("domains");

    // Fetch campaign from database
    const campaign = await collection.findOne({ _id: new ObjectId(id) });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Get webhook URL from environment
    const webhookUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL not configured" },
        { status: 500 }
      );
    }

    // Get base URL for logs endpoint
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const logsEndpointUrl = `${baseUrl}/api/campaigns/${id}/logs`;

    // Normalize email column in CSV data to ensure it's always "Email" before sending to webhook
    const normalizeEmailColumn = (data: any[]): any[] => {
      if (!data || data.length === 0) return data || [];

      const firstRow = data[0];
      const columns = Object.keys(firstRow).filter((key) => key.trim() !== "");

      // Find email column (case-insensitive, can contain "email" anywhere)
      // Prioritize exact matches first, then partial matches
      let emailColumnKey = columns.find(
        (col) => col.toLowerCase().trim() === "email"
      );

      // If no exact match, find any column containing "email"
      if (!emailColumnKey) {
        emailColumnKey = columns.find((col) =>
          col.toLowerCase().includes("email")
        );
      }

      // If no email column found, return data as-is (might be empty or invalid)
      if (!emailColumnKey) {
        return data;
      }

      // If already normalized to "Email", return as-is
      if (emailColumnKey === "Email") {
        return data;
      }

      // Normalize the email column to "Email" in all rows
      return data.map((row) => {
        const newRow = { ...row };
        // Copy email value to "Email" field
        newRow["Email"] = newRow[emailColumnKey];
        // Remove the old email column if it's different from "Email"
        if (emailColumnKey !== "Email") {
          delete newRow[emailColumnKey];
        }
        return newRow;
      });
    };

    // Normalize CSV data before sending to webhook
    const normalizedCsvData = normalizeEmailColumn(campaign.csvData || []);

    const startDateTimeValue =
      ensureStartDateTime({
        startDateTime: campaign.startDateTime,
        startDate: campaign.startDate,
        startTime: campaign.startTime,
      }) || "";

    // Resolve domain name for the webhook payload
    let domainName = campaign.domainName || "";
    if (!domainName && campaign.domainId) {
      try {
        const domainFilter = ObjectId.isValid(campaign.domainId)
          ? { _id: new ObjectId(campaign.domainId) }
          : { name: campaign.domainId };

        const domain = await domainsCollection.findOne(domainFilter);
        domainName = domain?.name || "";
      } catch (domainError) {
        console.warn(
          `Failed to resolve domain name for campaign ${campaign._id.toString()}:`,
          domainError
        );
      }
    }

    // Prepare ALL campaign data for webhook
    // Send complete campaign object with all fields
    const campaignData = {
      campaignId: campaign._id.toString(),
      id: campaign._id.toString(),
      name: campaign.name,
      domainId: campaign.domainId,
      domainName,
      template: campaign.template || "",
      subject: campaign.subject || "",
      bodyImage: campaign.bodyImage || "",
      followUpTemplate: campaign.followUpTemplate || "",
      followUpDelay: campaign.followUpDelay || 7,
      startDateTime: startDateTimeValue,
      csvData: normalizedCsvData, // Use normalized CSV data
      sentCount: campaign.sentCount || 0,
      openRate: campaign.openRate || 0,
      replyRate: campaign.replyRate || 0,
      bounceRate: campaign.bounceRate || 0,
      unsubscribeCount: campaign.unsubscribeCount || 0,
      status: campaign.status || "paused",
      createdAt: campaign.createdAt || new Date().toISOString(),
      // Include logs endpoint URL so n8n can send logs back
      logsEndpoint: logsEndpointUrl,
    };

    // Send to webhook with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Get response from webhook (even if status is not ok, we want to return the response)
      let webhookResponseData: any = {};
      const contentType = webhookResponse.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        try {
          webhookResponseData = await webhookResponse.json();
        } catch (e) {
          // If JSON parsing fails, try to get text
          webhookResponseData = { rawResponse: await webhookResponse.text() };
        }
      } else {
        webhookResponseData = { rawResponse: await webhookResponse.text() };
      }

      // Include webhook status and headers in response
      const webhookResponseInfo = {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        headers: Object.fromEntries(webhookResponse.headers.entries()),
        data: webhookResponseData,
      };

      // Track when it was last sent for activity feed (regardless of webhook response)
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { lastSentAt: new Date().toISOString() } }
      );

      // If webhook returned an error status, still return the response but indicate it
      if (!webhookResponse.ok) {
        return NextResponse.json(
          {
            success: false,
            message: `Webhook returned ${webhookResponse.status}: ${webhookResponse.statusText}`,
            webhookResponse: webhookResponseInfo,
          },
          { status: 200 } // Return 200 to frontend so it can see the webhook response
        );
      }

      // Don't change status - keep it as paused so button can be clicked again
      // Campaign stays in "paused" state, allowing multiple sends

      return NextResponse.json({
        success: true,
        message: "Campaign sent to webhook successfully",
        webhookResponse: webhookResponseInfo,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        throw new Error("Webhook request timed out after 30 seconds");
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error("Start Campaign Error:", error);
    return NextResponse.json(
      {
        error: "Failed to start campaign",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
