import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// Simple health check endpoint for AWS load balancers
// Returns 200 if MongoDB is accessible, 503 if not
export async function GET() {
  try {
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DATABASE) {
      return NextResponse.json(
        {
          status: "unhealthy",
          message: "MongoDB configuration missing",
        },
        { status: 503 }
      );
    }

    // Try to connect to MongoDB
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    await client.db(process.env.MONGODB_DATABASE).admin().ping();
    await client.close();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
