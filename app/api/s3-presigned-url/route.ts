import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME =
  process.env.S3_BUCKET_NAME ||
  "vocalitics-israland-prod-real-state-temp-audio-files";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { s3Url } = body;

    if (!s3Url) {
      return NextResponse.json(
        { error: "S3 URL is required" },
        { status: 400 }
      );
    }

    // Extract the key from the S3 URL
    // URL format: https://bucket-name.s3.region.amazonaws.com/key
    // Example: https://bucket.s3.eu-north-1.amazonaws.com/private/images/file.jpg
    const urlPattern = new RegExp(
      `https://${BUCKET_NAME.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}\\.s3\\.[^/]+/(.+)`
    );
    const match = s3Url.match(urlPattern);

    if (!match || !match[1]) {
      return NextResponse.json(
        { error: "Invalid S3 URL format" },
        { status: 400 }
      );
    }

    const key = decodeURIComponent(match[1]);

    // Create command to get the object
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return NextResponse.json({
      url: presignedUrl,
    });
  } catch (error: any) {
    console.error("Presigned URL Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate presigned URL",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
