import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { deleteFromS3, extractS3Key } from '../../../../lib/s3';

export async function POST() {
  try {
    const teams = await prisma.team.findMany({
      include: { players: true },
    });

    // Delete all images from S3
    for (const team of teams) {
      if (team.teamImage) {
        const teamKey = extractS3Key(team.teamImage);
        if (teamKey) {
          try {
            await deleteFromS3(teamKey);
          } catch (error) {
            console.error('Error deleting team image from S3:', error);
          }
        }
      }

      for (const player of team.players) {
        if (player.playerImage) {
          const playerKey = extractS3Key(player.playerImage);
          if (playerKey) {
            try {
              await deleteFromS3(playerKey);
            } catch (error) {
              console.error('Error deleting player image from S3:', error);
            }
          }
        }
      }
    }

    // Delete all teams (cascade will delete players)
    await prisma.team.deleteMany({});

    return NextResponse.json({ success: true, message: 'All teams reset successfully' });
  } catch {
    return NextResponse.json({ error: "Error resetting all teams" }, { status: 500 });
  }
}
