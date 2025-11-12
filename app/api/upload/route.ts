import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

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
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as string; // "image" or "csv"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate unique filename with folder structure: private/csv/ or private/images/
    const fileExtension = file.name.split(".").pop();
    const folderName = fileType === "csv" ? "csv" : "images";
    const fileName = `private/${folderName}/${randomUUID()}.${fileExtension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    const contentType =
      file.type || (fileType === "csv" ? "text/csv" : "image/jpeg");

    // Upload to S3 (objects are private, accessed via presigned URLs)
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Generate S3 URL
    const s3Url = `https://${BUCKET_NAME}.s3.${
      process.env.AWS_REGION || "eu-north-1"
    }.amazonaws.com/${fileName}`;

    return NextResponse.json({
      url: s3Url,
      fileName: fileName,
    });
  } catch (error: any) {
    console.error("S3 Upload Error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file to S3",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
