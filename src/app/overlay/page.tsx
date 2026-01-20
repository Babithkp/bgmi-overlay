"use client";

import { useEffect, useState } from "react";

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
  const [dbTeams, setDbTeams] = useState<any[]>([]);
  const [ocrDebug, setOcrDebug] = useState<any>(null);
  const [matchDebug, setMatchDebug] = useState<any>(null);

  const [mounted, setMounted] = useState(false);

  // =========================
  // MOUNT FLAG (HYDRATION SAFE)
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
      })
      .catch(() =>
        console.error("Failed to load admin teams")
      );
  }, []);

  // =========================
  // OCR STREAM (POLLING VIA SSE)
  // =========================
  useEffect(() => {
    if (!mounted) return;

    const source = new EventSource("/api/ocr-stream");

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      const ocrPlayer =
        payload?.parsed?.players?.[0]?.name || "";
      const ocrTeam = payload?.parsed?.team || "";

      // Show OCR input always
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
              teamImage: team.teamImage,
              playerImage: player.playerImage,
              score,
            };
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
  // RENDER (DEBUG UI)
  // =========================
  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
        }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "",
        color: "#0000",
        padding: 14,
        paddingTop: 300,
        fontFamily: "monospace",
        fontSize: 24,
      }}
    >
      <h3>🧪 OCR → DB MATCH DEBUG</h3>

      <hr />

      {/* OCR DATA */}
      <div>
        <strong>OCR PLAYER:</strong>{" "}
        {ocrDebug?.ocrPlayer || "—"}
      </div>

      <div>
        <strong>OCR TEAM:</strong>{" "}
        {ocrDebug?.ocrTeam || "—"}
      </div>

      <hr />

      {/* MATCH RESULT */}
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
            <strong>STATUS:</strong>{" "}
            {matchDebug.status}
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>TEAM LOGO:</strong>
            <br />
            <img
              src={matchDebug.teamImage}
              height={20}
              width={200}
              alt="team logo"
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>PLAYER IMAGE:</strong>
            <br />
            <img
              src={matchDebug.playerImage}
              height={40}
              width={200}
              alt="player"
            />
          </div>
        </>
      ) : (
        <div>No match found</div>
      )}
    </div>
  );
}
