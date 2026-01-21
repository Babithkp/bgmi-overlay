"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/* ===================== TYPES ===================== */

interface Player {
  id: string;
  playerName: string;
  playerImage: string | null;
  position: number;
}

interface Team {
  id: string;
  teamName: string;
  slotNumber: number;
  teamImage: string | null;
  players: Player[];
  teamColor: string | null;
}

interface MatchDebug {
  matchedPlayer: string;
  matchedTeam: string;
  teamImage: string;
  playerImage: string;
  color: string | null;
  score: number;
}

/* ===================== SIMILARITY ===================== */

function similarity(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();

  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.8;

  let matches = 0;
  for (const ch of a) {
    if (b.includes(ch)) matches++;
  }

  return matches / Math.max(a.length, b.length);
}

/* ===================== THRESHOLDS ===================== */

const DIRECT_PLAYER_THRESHOLD = 0.75;
const TEAM_THRESHOLD = 0.45;
const PLAYER_IN_TEAM_THRESHOLD = 0.55;

/* ===================== PAGE ===================== */

export default function OverlayPage() {
  const [dbTeams, setDbTeams] = useState<Team[]>([]);
  const [matchDebug, setMatchDebug] = useState<MatchDebug | null>(null);
  const [ocrresult, setOcrResult] = useState<string>("");

  const isClient = typeof window !== "undefined";

  /* ===================== LOAD TEAMS ===================== */
  useEffect(() => {
    if (!isClient) return;

    fetch("/api/teams")
      .then((res) => res.json())
      .then((data: Team[]) => {
        setDbTeams(Array.isArray(data) ? data : []);
      })
      .catch(() => console.error("Failed to load admin teams"));
  }, [isClient]);

  /* ===================== OCR STREAM ===================== */
  useEffect(() => {
    if (!isClient) return;
    if (dbTeams.length === 0) return;

    const source = new EventSource("/api/ocr-stream");

    source.onmessage = (event) => {
      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      const ocrPlayer =
        (payload as {
          parsed?: { players?: { name?: string }[] };
        })?.parsed?.players?.[0]?.name ?? "";
        console.log(payload);

      if (!ocrPlayer) {
        setMatchDebug(null);
        return;
      }

      /* =====================================================
         PHASE 1: DIRECT PLAYER MATCH (GLOBAL)
      ===================================================== */
      let bestDirectScore = 0;
      let directTeam: Team | null = null;
      let directPlayer: Player | null = null;

      for (const team of dbTeams) {
        if (!team.teamImage) continue;

        for (const player of team.players) {
          if (!player.playerImage) continue;

          const score = similarity(ocrPlayer, player.playerName);

          if (score > bestDirectScore) {
            bestDirectScore = score;
            directTeam = team;
            directPlayer = player;
          }
        }
      }

      if (
        directTeam &&
        directPlayer &&
        bestDirectScore >= DIRECT_PLAYER_THRESHOLD
      ) {
        setMatchDebug({
          matchedPlayer: directPlayer.playerName,
          matchedTeam: directTeam.teamName,
          teamImage: directTeam.teamImage!,
          playerImage: directPlayer.playerImage!,
          color: directTeam.teamColor,
          score: bestDirectScore,
        });
        return;
      }

      /* =====================================================
         PHASE 2: TEAM MATCH → PLAYER MATCH
      ===================================================== */
      let bestTeam: Team | null = null;
      let bestTeamScore = 0;

      for (const team of dbTeams) {
        const score = similarity(ocrPlayer, team.teamName);
        if (score > bestTeamScore) {
          bestTeamScore = score;
          bestTeam = team;
        }
      }

      if (!bestTeam || bestTeamScore < TEAM_THRESHOLD) {
        setMatchDebug(null);
        return;
      }

      let bestPlayer: Player | null = null;
      let bestPlayerScore = 0;

      for (const player of bestTeam.players) {
        const score = similarity(ocrPlayer, player.playerName);
        if (score > bestPlayerScore) {
          bestPlayerScore = score;
          bestPlayer = player;
        }
      }

      if (
        !bestPlayer ||
        !bestTeam.teamImage ||
        !bestPlayer.playerImage ||
        bestPlayerScore < PLAYER_IN_TEAM_THRESHOLD
      ) {
        setMatchDebug(null);
        return;
      }

      setMatchDebug({
        matchedPlayer: bestPlayer.playerName,
        matchedTeam: bestTeam.teamName,
        teamImage: bestTeam.teamImage,
        playerImage: bestPlayer.playerImage,
        color: bestTeam.teamColor,
        score: bestPlayerScore,
      });
    };

    source.onerror = () => source.close();
    return () => source.close();
  }, [dbTeams, isClient]);


  if (!isClient) {
    return <div style={{ width: "1920px", height: "1080px" }} />;
  }


  return (
    <div
      style={{
        width: "1920px",
        height: "1080px",
      }}
    // className="bg-black"
    >

      {matchDebug && (
        <div className="relative">


          <div
            style={{ marginTop: 51, marginLeft: 3 }}
            className="relative w-20 h-9 overflow-hidden"
          >
            <Image
              src={matchDebug.teamImage}
              alt="team logo"
              fill
              className="object-cover object-center h-10 w-10"
              unoptimized
            />
          </div>

          <div className=" w-fit mt-196 ml-161 flex">
            <Image
              src={matchDebug.teamImage}
              height={150}
              width={62}
              alt="team logo"
              className="object-cover h-17 w-17 bg-black"
            />
            <div className={`   text-white top-0 left-17 w-50 h-fit`}
              style={{ background: matchDebug.color ?? "black", clipPath: "polygon(0 0, 85% 0, 100% 100%, 0% 100%)", }}
            >
              <p className="text-2xl font-boldD ml-3 font-overlay">{matchDebug.matchedTeam}</p>
            </div>
          </div>

          <div className="absolute top-213 left-325 bg-black/90">
            <Image
              src={matchDebug.playerImage}
              height={40}
              width={200}
              alt="player"
              className="object-cover h-50 w-50 object-center"
            />
          </div>
        </div>
      )}
    </div>
  );
}
