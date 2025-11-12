import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

/**
 * Exports unsubscribers from MongoDB as CSV
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

function convertToCSV(data: any[]): string {
  if (data.length === 0) {
    return "Email,Timestamp,Action\n";
  }

  // CSV header
  const headers = ["Email", "Timestamp", "Action"];
  const csvRows = [headers.join(",")];

  // CSV rows
  data.forEach((item) => {
    const row = [
      `"${item.Email.replace(/"/g, '""')}"`, // Escape quotes in email
      `"${item.Timestamp}"`,
      `"${item.Action || "Unsubscribed"}"`,
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

export async function GET() {
  try {
    // Check if MongoDB is configured
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
    const collection = db.collection("unsubscribeLogs");

    // Fetch all unsubscribers
    const data = await collection
      .find({})
      .sort({ Timestamp: -1 })
      .project({ _id: 0, Email: 1, Timestamp: 1, Action: 1 })
      .toArray();

    // Convert to CSV
    const csv = convertToCSV(data);

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="unsubscribers-${
          new Date().toISOString().split("T")[0]
        }.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export Error:", error);
    return NextResponse.json(
      {
        error: "Failed to export unsubscribers",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
