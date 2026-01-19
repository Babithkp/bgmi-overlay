import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteFromS3, extractS3Key } from '@/lib/s3';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = typeof resolvedParams === 'object' && 'id' in resolvedParams ? resolvedParams.id : String(resolvedParams);
    
    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: { players: true },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Delete team image from S3
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

    // Delete player images from S3
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

    // Delete team and players from database (cascade)
    await prisma.team.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resetting team:', error);
    const errorMessage = error?.message || 'Internal server error';
    const errorStack = error?.stack || '';
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: 'Failed to reset team',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
