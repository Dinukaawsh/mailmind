import { NextResponse } from "next/server";

/**
 * Test endpoint to manually mark a campaign as processing complete
 * Use this to test if the callback works
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Call the actual processing-complete endpoint
    const baseUrl = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const completeUrl = `${protocol}://${baseUrl}/api/campaigns/${id}/processing-complete`;

    console.log(`🧪 Testing callback for campaign ${id}`);
    console.log(`📞 Calling: ${completeUrl}`);

    const response = await fetch(completeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    console.log(`✅ Test callback result:`, data);

    return NextResponse.json({
      message: "Test completed",
      callbackUrl: completeUrl,
      callbackResponse: data,
      instructions: [
        "This is a test endpoint to manually mark campaign as complete",
        "Use this URL in your browser or Postman to test",
        "If this works, configure your n8n workflow to call the callback endpoint",
      ],
    });
  } catch (error: any) {
    console.error("❌ Test callback failed:", error.message);
    return NextResponse.json(
      {
        error: "Test failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
