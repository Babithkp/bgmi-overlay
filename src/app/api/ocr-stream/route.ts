import { NextRequest } from "next/server";

export const runtime = "nodejs";

let clients: WritableStreamDefaultWriter[] = [];

export async function GET(req: NextRequest) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  clients.push(writer);

  req.signal.addEventListener("abort", () => {
    clients = clients.filter((w) => w !== writer);
    try {
      writer.close();
    } catch {}
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// 🔥 OCR PUSH ENDPOINT
export async function POST(req: NextRequest) {
  const data = await req.json();

  const payload = `data: ${JSON.stringify(data)}\n\n`;

  clients = clients.filter((writer) => {
    try {
      writer.write(payload);
      return true;
    } catch {
      return false;
    }
  });

  return new Response(
    JSON.stringify({ ok: true, clients: clients.length }),
    { status: 200 }
  );
}
