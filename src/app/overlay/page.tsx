"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
}
// =========================
// SIMILARITY (NO NORMALIZATION)
// =========================
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

export default function OverlayPage() {
  const [dbTeams, setDbTeams] = useState<Team[]>([]);
  const [ocrDebug, setOcrDebug] = useState<any>(null);
  const [matchDebug, setMatchDebug] = useState<any>(null);

  const [mounted, setMounted] = useState(false);

  // =========================
  // MOUNT FLAG
  // =========================
  useEffect(() => {
    setMounted(true);
  }, []);

  // =========================
  // LOAD ADMIN DATA
  // =========================
  useEffect(() => {
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => {
        setDbTeams(Array.isArray(data) ? data : []);
      });
  }, []);

  // =========================
  // OCR STREAM
  // =========================
  useEffect(() => {
    if (!mounted) return;

    const source = new EventSource("/api/ocr-stream");

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      const ocrPlayer =
        payload?.parsed?.players?.[0]?.name || "";
      const ocrTeam = payload?.parsed?.team || "";

      setOcrDebug({
        ocrPlayer,
        ocrTeam,
      });

      if (!ocrPlayer || dbTeams.length === 0) {
        setMatchDebug(null);
        return;
      }

      // =========================
      // 🥇 PLAYER-FIRST MATCH
      // =========================
      let bestMatch: any = null;
      let bestScore = 0;

      for (const team of dbTeams) {
        if (!Array.isArray(team.players)) continue;

        for (const player of team.players) {
          const score = similarity(
            ocrPlayer,
            player.playerName
          );

          if (score > bestScore) {
            bestScore = score;
            bestMatch = {
              matchedPlayer: player.playerName,
              matchedTeam: team.teamName,
              matchedteamlogo: team.teamImage,
              matchedplayerimage: player.playerImage,
              score,
            };
            console.log(team.teamImage)
          }
        }
      }

      if (bestMatch) {
        setMatchDebug({
          ...bestMatch,
          status:
            bestScore >= 0.6 ? "MATCH" : "LOW CONFIDENCE",
        });
      } else {
        setMatchDebug(null);
      }
    };

    source.onerror = () => source.close();
    return () => source.close();
  }, [mounted, dbTeams]);

  // =========================
  // RENDER (DEBUG MODE)
  // =========================
  if (!mounted) {
    return <div style={{ background: "#000", minHeight: "100vh" }} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "",
        padding: 14,
        paddingTop: "400px",
        fontFamily: "monospace",
        fontSize: 34,
        height: "1080px",
        width: "1920px",
      }}
    >
      

      {matchDebug ? (
        <>
          <div>
            <strong>MATCHED PLAYER:</strong>{" "}
            {matchDebug.matchedPlayer}
          </div>

          <div>
            <strong>MATCHED TEAM:</strong>{" "}
            {matchDebug.matchedTeam}
          </div>

          <div>
            <strong>SCORE:</strong>{" "}
            {matchDebug.score.toFixed(2)}
          </div>

         
          <div>
            <strong>team logo:</strong>{" "}
            <Image
            src={matchDebug.matchedteamlogo} 
            height={150}
            width={200}
            alt= {"player name"}
            />
            
          </div>

          <div>
            <strong>player image:</strong>{" "}
            <Image
            src={matchDebug.matchedplayerimage} 
            height={150}
            width={200}
            alt= {"player name"}
            />
            
            
          </div>
        </>
      ) : (
        <div>No match found</div>
      )}
    </div>
  );
}
