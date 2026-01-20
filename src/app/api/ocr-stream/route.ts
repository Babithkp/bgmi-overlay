import { NextRequest } from "next/server";

let latestData: any = null;
const clients = new Set<ReadableStreamDefaultController>();

// ============================
// GET — Browser connects (SSE)
// ============================
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      console.log("[SSE] Client connected");
      clients.add(controller);

      // ✅ REPLAY LATEST DATA TO NEW CLIENT
      if (latestData) {
        controller.enqueue(
          `data: ${JSON.stringify(latestData)}\n\n`
        );
      }
    },
    cancel(controller) {
      console.log("[SSE] Client disconnected");
      clients.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ============================
// POST — OCR pushes data
// ============================
export async function POST(req: NextRequest) {
  const body = await req.json();
  latestData = body;

  console.log("[OCR → SSE] New OCR data received");

  for (const controller of clients) {
    try {
      controller.enqueue(
        `data: ${JSON.stringify(latestData)}\n\n`
      );
    } catch {
      console.warn("[SSE] Removing dead client");
      clients.delete(controller);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
