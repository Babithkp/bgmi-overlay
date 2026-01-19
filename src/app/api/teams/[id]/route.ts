import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToS3, deleteFromS3, extractS3Key } from '@/lib/s3';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const teamId = typeof resolvedParams === 'object' && 'id' in resolvedParams ? resolvedParams.id : String(resolvedParams);

    // Check if request is FormData (for updating with images) or JSON (for slot change)
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle team update with images
      const formData = await req.formData();
      const slotNumberStr = formData.get('slotNumber') as string;
      
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { players: true },
      });

      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      // Handle slot number change if provided
      if (slotNumberStr) {
        const slotNumber = parseInt(slotNumberStr);
        if (slotNumber >= 1 && slotNumber <= 25) {
          const existing = await prisma.team.findUnique({
            where: { slotNumber },
          });
          if (existing && existing.id !== teamId) {
            return NextResponse.json({ error: `Slot ${slotNumber} is already taken` }, { status: 400 });
          }
        }
      }





      // Handle player updates
      for (let i = 0; i < 4; i++) {
        const playerName = formData.get(`playerName-${i}`) as string;
        const playerImageFile = formData.get(`playerImage-${i}`) as File | null;
        
        const existingPlayer = team.players.find((p) => p.position === i + 1);
        
        if (playerImageFile && playerImageFile.size > 0) {
          const buffer = Buffer.from(await playerImageFile.arrayBuffer());
          const ext = playerImageFile.name.split('.').pop() || 'jpg';
          const key = `players/${team.slotNumber}-${i}-${Date.now()}.${ext}`;
          const playerImageUrl = await uploadToS3(buffer, key, playerImageFile.type);
          
          // Delete old player image if exists
          if (existingPlayer?.playerImage) {
            const oldKey = extractS3Key(existingPlayer.playerImage);
            if (oldKey) await deleteFromS3(oldKey);
          }

          if (existingPlayer) {
            await prisma.player.update({
              where: { id: existingPlayer.id },
              data: {
                playerName: playerName || existingPlayer.playerName,
                playerImage: playerImageUrl,
              },
            });
          } else {
            await prisma.player.create({
              data: {
                teamId: teamId,
                playerName: playerName || '',
                playerImage: playerImageUrl,
                position: i + 1,
              },
            });
          }
        } else if (playerName && existingPlayer) {
          // Update player name only
          await prisma.player.update({
            where: { id: existingPlayer.id },
            data: { playerName },
          });
        } else if (playerName && !existingPlayer) {
          // Create new player without image
          await prisma.player.create({
            data: {
              teamId: teamId,
              playerName,
              playerImage: null,
              position: i + 1,
            },
          });
        }
      }

      // Fetch updated team with players
      const finalTeam = await prisma.team.findUnique({
        where: { id: teamId },
        include: { players: true },
      });

      return NextResponse.json(finalTeam);
    } else {
      // Handle slot number change only (JSON)
      const { slotNumber } = await req.json();

      if (!slotNumber || slotNumber < 1 || slotNumber > 25) {
        return NextResponse.json({ error: 'Invalid slot number (1-25)' }, { status: 400 });
      }

      // Check if new slot is already taken by another team
      const existing = await prisma.team.findUnique({
        where: { slotNumber: parseInt(slotNumber) },
      });

      if (existing && existing.id !== teamId) {
        return NextResponse.json({ error: `Slot ${slotNumber} is already taken` }, { status: 400 });
      }

      const team = await prisma.team.update({
        where: { id: teamId },
        data: { slotNumber: parseInt(slotNumber) },
        include: { players: true },
      });

      return NextResponse.json(team);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
