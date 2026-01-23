import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { sourceTeamId, targetSlot } = body;

    console.log("[SWAP] Incoming request:", body);

    if (!sourceTeamId || !targetSlot) {
      console.error("[SWAP] Missing params");
      return NextResponse.json(
        { error: "sourceTeamId and targetSlot are required" },
        { status: 400 }
      );
    }

    if (targetSlot < 1 || targetSlot > 25) {
      console.error("[SWAP] Invalid slot:", targetSlot);
      return NextResponse.json(
        { error: "Invalid slot number (1-25)" },
        { status: 400 }
      );
    }

    const sourceTeam = await prisma.team.findUnique({
      where: { id: sourceTeamId },
    });

    if (!sourceTeam) {
      console.error("[SWAP] Source team not found:", sourceTeamId);
      return NextResponse.json(
        { error: "Source team not found" },
        { status: 404 }
      );
    }

    const targetTeam = await prisma.team.findUnique({
      where: { slotNumber: targetSlot },
    });

    console.log("[SWAP] Source team:", {
      id: sourceTeam.id,
      slot: sourceTeam.slotNumber,
    });

    console.log("[SWAP] Target team:", targetTeam
      ? { id: targetTeam.id, slot: targetTeam.slotNumber }
      : "EMPTY SLOT");

    // 🧠 TRANSACTION = SAFE SWAP
    await prisma.$transaction(async (tx) => {
      // Move source team to target slot
      await tx.team.update({
        where: { id: sourceTeam.id },
        data: { slotNumber: targetSlot },
      });

      // If target slot had a team → move it to source slot
      if (targetTeam) {
        await tx.team.update({
          where: { id: targetTeam.id },
          data: { slotNumber: sourceTeam.slotNumber },
        });
      }
    });

    console.log("[SWAP] Swap successful");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[SWAP] ERROR:", err);
    return NextResponse.json(
      { error: "Failed to swap slots" },
      { status: 500 }
    );
  }
}
