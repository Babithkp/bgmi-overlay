import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToS3, deleteFromS3, extractS3Key } from '@/lib/s3';

// GET all teams
export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: { players: true },
      orderBy: { slotNumber: 'asc' },
    });
    return NextResponse.json(teams);
  } catch  {
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// POST - Create or update teams (bulk or single)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const teamsJson = formData.get('teams') as string;
    
    if (!teamsJson) {
      return NextResponse.json({ error: 'No teams data provided' }, { status: 400 });
    }

    const teamsData = JSON.parse(teamsJson);
    const results = [];

    for (const teamData of teamsData) {
      const { slotNumber, teamName, players = [] } = teamData;

      // Check if slot already exists (for update)
      const existingTeam = await prisma.team.findUnique({
        where: { slotNumber: parseInt(slotNumber) },
        include: { players: true },
      });

      // Upload team image if provided
      let teamImageUrl = existingTeam?.teamImage || null;
      const teamImageFile = formData.get(`teamImage-${slotNumber}`) as File | null;
      
      if (teamImageFile && teamImageFile.size > 0) {
        const buffer = Buffer.from(await teamImageFile.arrayBuffer());
        const ext = teamImageFile.name.split('.').pop() || 'jpg';
        const key = `teams/${slotNumber}-${Date.now()}.${ext}`;
        teamImageUrl = await uploadToS3(buffer, key, teamImageFile.type);
        
        // Delete old team image if exists
        if (existingTeam?.teamImage) {
          const oldKey = extractS3Key(existingTeam.teamImage);
          if (oldKey) await deleteFromS3(oldKey);
        }
      }

      // Create or update team
      const team = await prisma.team.upsert({
        where: { slotNumber: parseInt(slotNumber) },
        update: {
          teamName,
          teamImage: teamImageUrl || undefined,
        },
        create: {
          slotNumber: parseInt(slotNumber),
          teamName,
          teamImage: teamImageUrl,
        },
      });

      // Delete existing players if updating
      if (existingTeam) {
        await prisma.player.deleteMany({ where: { teamId: team.id } });
      }

      // Upload and create players (always 4 players)
      for (let i = 0; i < 4; i++) {
        const player = players[i] || { playerName: '' };
        let playerImageUrl = null;

        const playerImageFile = formData.get(`playerImage-${slotNumber}-${i}`) as File | null;
        if (playerImageFile && playerImageFile.size > 0) {
          const buffer = Buffer.from(await playerImageFile.arrayBuffer());
          const ext = playerImageFile.name.split('.').pop() || 'jpg';
          const key = `players/${slotNumber}-${i}-${Date.now()}.${ext}`;
          playerImageUrl = await uploadToS3(buffer, key, playerImageFile.type);
        }

        await prisma.player.create({
          data: {
            teamId: team.id,
            playerName: player.playerName || '',
            playerImage: playerImageUrl,
            position: i + 1,
          },
        });
      }

      results.push(team);
    }

    // Fetch updated teams with players
    const updatedTeams = await prisma.team.findMany({
      include: { players: true },
      orderBy: { slotNumber: 'asc' },
    });

    return NextResponse.json({ success: true, teams: updatedTeams });
  } catch  {
    return NextResponse.json({ error: "Failed try again" }, { status: 500 }); 
  }
}
