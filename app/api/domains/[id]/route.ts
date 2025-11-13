import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

/**
 * Domain API Route - Individual Domain Operations
 * Handles updating and deleting individual domains
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

// PUT: Update domain
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
      return NextResponse.json({ error: "Invalid domain ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, status, emailsSentPerDay, provider } = body;

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collection = db.collection("domains");

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (emailsSentPerDay !== undefined)
      updateData.emailsSentPerDay = emailsSentPerDay;
    if (provider !== undefined) updateData.provider = provider;

    // If name is being updated, check if it already exists (excluding current domain)
    if (name !== undefined) {
      const existingDomain = await collection.findOne({
        name,
        _id: { $ne: new ObjectId(id) },
      });
      if (existingDomain) {
        return NextResponse.json(
          { error: "Domain name already exists" },
          { status: 400 }
        );
      }
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Fetch updated domain
    const updatedDomain = await collection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      id: updatedDomain!._id.toString(),
      name: updatedDomain!.name,
      status: updatedDomain!.status || "connected",
      lastSyncTime: updatedDomain!.lastSyncTime || new Date().toISOString(),
      emailsSentPerDay: updatedDomain!.emailsSentPerDay || 0,
      type: updatedDomain!.type || "custom",
      provider: updatedDomain!.provider || "",
    });
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to update domain in MongoDB",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete domain
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
      return NextResponse.json({ error: "Invalid domain ID" }, { status: 400 });
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DATABASE || "mailmind");
    const collection = db.collection("domains");

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete domain from MongoDB",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
