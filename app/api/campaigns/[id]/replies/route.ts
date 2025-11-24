import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

/**
 * Campaign Replies Route
 * GET: Fetch replies for a campaign (supports pagination & status filtering)
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

const VALID_STATUSES = new Set(["unread", "read", "flagged"]);

function parseNumberParam(
  value: string | null,
  fallback: number,
  { min, max }: { min?: number; max?: number } = {}
) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  let result = parsed;
  if (typeof min === "number") {
    result = Math.max(result, min);
  }
  if (typeof max === "number") {
    result = Math.min(result, max);
  }
  return result;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const page = parseNumberParam(url.searchParams.get("page"), 1, { min: 1 });
  const pageSize = parseNumberParam(url.searchParams.get("pageSize"), 25, {
    min: 1,
    max: 100,
  });
  const statusParam = url.searchParams.get("status")?.toLowerCase();
  const statusFilter =
    statusParam && VALID_STATUSES.has(statusParam) ? statusParam : undefined;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
  }

  const defaultResponse = {
    replies: [] as any[],
    total: 0,
    unreadCount: 0,
    page,
    pageSize,
  };

  if (!process.env.MONGODB_URI || !process.env.MONGODB_DATABASE) {
    return NextResponse.json({
      ...defaultResponse,
      message:
        "MongoDB configuration missing. Returning empty replies response.",
    });
  }

  try {
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collectionsPreference = Array.from(
      new Set([
        process.env.CAMPAIGN_REPLIES_COLLECTION || "campaignReplies",
        "replies",
      ])
    );

    const campaignObjectId = new ObjectId(id);
    const campaignMatch = [
      { campaignId: id },
      { campaignId: campaignObjectId },
      { campaignObjectId: campaignObjectId },
    ];

    const baseClause = { $or: campaignMatch };
    const filterClauses: any[] = [baseClause];
    if (statusFilter) {
      filterClauses.push({ status: statusFilter });
    }
    const repliesFilter =
      filterClauses.length > 1 ? { $and: filterClauses } : filterClauses[0];

    const skip = (page - 1) * pageSize;

    let responsePayload = {
      replies: [] as any[],
      total: 0,
      unreadCount: 0,
      page,
      pageSize,
    };

    for (let index = 0; index < collectionsPreference.length; index++) {
      const collectionName = collectionsPreference[index];
      const collection = db.collection(collectionName);

      const total = await collection.countDocuments(repliesFilter);
      const unreadCount = await collection.countDocuments({
        $and: [baseClause, { status: "unread" }],
      });

      const replyDocs = await collection
        .find(repliesFilter)
        .sort({ receivedAt: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray();

      responsePayload = {
        replies: replyDocs.map((doc) => ({
          id:
            doc._id?.toString() ??
            `${doc.messageId || doc.threadId || doc.receivedAt}`,
          campaignId: doc.campaignId?.toString?.() || doc.campaignId || id,
          leadEmail: doc.leadEmail || doc.email || "",
          leadName: doc.leadName || doc.name,
          subject: doc.subject,
          body: doc.body || doc.message || "",
          receivedAt: doc.receivedAt
            ? new Date(doc.receivedAt).toISOString()
            : doc.createdAt
            ? new Date(doc.createdAt).toISOString()
            : new Date().toISOString(),
          status: doc.status || "unread",
          threadId: doc.threadId,
          messageId: doc.messageId,
          leadData: doc.leadData || doc.metadata,
          attachments: Array.isArray(doc.attachments)
            ? doc.attachments
            : undefined,
        })),
        total,
        unreadCount,
        page,
        pageSize,
      };

      if (total > 0 || index === collectionsPreference.length - 1) {
        break;
      }
    }

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Campaign replies GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch campaign replies",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
