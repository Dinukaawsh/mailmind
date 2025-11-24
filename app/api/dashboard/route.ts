import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

/**
 * Dashboard API Route
 * Calculates and returns dashboard metrics from MongoDB data
 */

// Helper function to format time ago
function formatTimeAgo(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
}

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

// GET: Fetch dashboard metrics
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

    // Fetch campaigns
    const campaignsCollection = db.collection("campaigns");
    const allCampaigns = await campaignsCollection.find({}).toArray();
    // Filter to only include active (not archived) campaigns
    const campaigns = allCampaigns.filter(
      (c) => c.isActive !== false // Default to true for backward compatibility
    );

    // Fetch unsubscribers
    const unsubscribersCollection = db.collection("unsubscribeLogs");
    const unsubscribers = await unsubscribersCollection.find({}).toArray();

    // Calculate metrics (only for active campaigns)
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(
      (c) => c.status === "active"
    ).length;

    // Calculate total leads contacted (sum of all csvData lengths from active campaigns)
    const totalLeadsContacted = campaigns.reduce((sum, campaign) => {
      const csvData = campaign.csvData || [];
      return sum + csvData.length;
    }, 0);

    // Calculate average rates (only for active campaigns)
    const campaignsWithRates = campaigns.filter(
      (c) =>
        c.openRate !== undefined ||
        c.replyRate !== undefined ||
        c.bounceRate !== undefined
    );

    const averageOpenRate =
      campaignsWithRates.length > 0
        ? campaignsWithRates.reduce((sum, c) => sum + (c.openRate || 0), 0) /
          campaignsWithRates.length
        : 0;

    const averageReplyRate =
      campaignsWithRates.length > 0
        ? campaignsWithRates.reduce((sum, c) => sum + (c.replyRate || 0), 0) /
          campaignsWithRates.length
        : 0;

    const averageBounceRate =
      campaignsWithRates.length > 0
        ? campaignsWithRates.reduce((sum, c) => sum + (c.bounceRate || 0), 0) /
          campaignsWithRates.length
        : 0;

    // Total unsubscribes
    const totalUnsubscribes = unsubscribers.length;

    // Recent replies (last 7 days) - for now, we'll use a placeholder
    // In a real app, this would come from a replies collection or tracking system
    const recentReplies = 0; // TODO: Implement when reply tracking is available

    const metrics = {
      totalCampaigns,
      totalLeadsContacted,
      averageOpenRate: Math.round(averageOpenRate * 10) / 10, // Round to 1 decimal
      averageReplyRate: Math.round(averageReplyRate * 10) / 10,
      averageBounceRate: Math.round(averageBounceRate * 10) / 10,
      totalUnsubscribes,
      activeCampaigns,
      recentReplies,
    };

    // Fetch recent activity (only for active campaigns)
    // 1. Recently created campaigns (last 10, sorted by createdAt desc)
    const recentCampaigns = await campaignsCollection
      .find({ $or: [{ isActive: { $ne: false } }, { isActive: { $exists: false } }] })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // 2. Recently sent campaigns (campaigns with lastSentAt field, sorted by lastSentAt desc)
    const recentSentCampaigns = await campaignsCollection
      .find({
        lastSentAt: { $exists: true },
        $or: [{ isActive: { $ne: false } }, { isActive: { $exists: false } }]
      })
      .sort({ lastSentAt: -1 })
      .limit(10)
      .toArray();

    // 3. Recent unsubscribers (last 10, sorted by Timestamp desc)
    const recentUnsubscribers = await unsubscribersCollection
      .find({})
      .sort({ Timestamp: -1 })
      .limit(10)
      .toArray();

    // Combine and format activity items
    const activities: any[] = [];

    // Add campaign creation activities
    recentCampaigns.forEach((campaign) => {
      activities.push({
        type: "campaign_created",
        title: `Campaign "${campaign.name}" created`,
        subtitle: `${campaign.csvData?.length || 0} leads • ${formatTimeAgo(
          campaign.createdAt
        )}`,
        timestamp: campaign.createdAt,
        campaignName: campaign.name,
        badge: {
          text: "Created",
          color: "blue",
        },
      });
    });

    // Add campaign sent activities
    recentSentCampaigns.forEach((campaign) => {
      activities.push({
        type: "campaign_sent",
        title: `Campaign "${campaign.name}" sent`,
        subtitle: `${
          campaign.csvData?.length || 0
        } emails sent • ${formatTimeAgo(campaign.lastSentAt)}`,
        timestamp: campaign.lastSentAt,
        campaignName: campaign.name,
        badge: {
          text: "Sent",
          color: "green",
        },
      });
    });

    // Add unsubscribe activities
    recentUnsubscribers.forEach((unsubscriber) => {
      activities.push({
        type: "unsubscribe",
        title: `New unsubscribe from ${unsubscriber.Email || "unknown"}`,
        subtitle: `Unsubscribed • ${formatTimeAgo(unsubscriber.Timestamp)}`,
        timestamp: unsubscriber.Timestamp,
        email: unsubscriber.Email,
        badge: {
          text: "Unsubscribed",
          color: "red",
        },
      });
    });

    // Sort all activities by timestamp (most recent first) and limit to 10
    activities.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    const recentActivity = activities.slice(0, 10);

    return NextResponse.json({
      metrics,
      recentActivity,
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard metrics",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
