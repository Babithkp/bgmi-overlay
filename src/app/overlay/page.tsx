"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";


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
  playerName: string;
  teamName: string;
  teamImage: string;
  playerImage: string;
  color: string | null;
  score: number;
}


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


const defaultUI = {
  TeamShortLogoTop: 57,
  TeamShortLogoLeft: 10,
  TeamShortLogoWidth: 100,
  TeamShortLogoHeight: 32,
  TeamLogoTop: 866,
  TeamLogoLeft: 644,
  TeamLogoSize: 70,
  PlayerImgTop: 897,
  PlayerImgLeft: 1280,
  PlayerImgSize: 174,
};

export default function OverlayPage() {
  const [dbTeams, setDbTeams] = useState<Team[]>([]);
  const [matchDebug, setMatchDebug] = useState<MatchDebug | null>(null);
  const [uiposion, setUiposition] = useState(defaultUI);
  const isClient = typeof window !== "undefined";

  useEffect(() => {
    if (!isClient) return;

    fetch("/api/teams")
      .then((res) => res.json())
      .then((data: Team[]) => {
        setDbTeams(Array.isArray(data) ? data : []);
      })
      .catch(() => console.error("Failed to load admin teams"));
  }, [isClient]);



  const missCountRef = useRef(0);
  const lastStableMatchRef = useRef<MatchDebug | null>(null);
  const MISS_THRESHOLD = 5;
  
  const CHAR_EQUIV: Record<string, string[]> = {
    "8": ["b"],
    "b": ["8"],
    "0": ["o"],
    "o": ["0"],
    "1": ["l"],
    "l": ["1"],
  };
  
  useEffect(() => {
    if (!isClient) return;
    if (dbTeams.length === 0) return;
  
    const source = new EventSource("/api/ocr-stream");
  
    function hasFuzzyAnchor(a: string, b: string): boolean {
      if (a.length < 4 || b.length < 4) return false;
  
      for (let i = 0; i <= a.length - 4; i++) {
        const sub = a.slice(i, i + 4);
  
        for (let j = 0; j <= b.length - 4; j++) {
          const target = b.slice(j, j + 4);
  
          let ok = true;
          for (let k = 0; k < 4; k++) {
            const ca = sub[k];
            const cb = target[k];
  
            if (ca === cb) continue;
            if (
              CHAR_EQUIV[ca]?.includes(cb) ||
              CHAR_EQUIV[cb]?.includes(ca)
            ) continue;
  
            ok = false;
            break;
          }
  
          if (ok) return true;
        }
      }
      return false;
    }
  
    const normalizeOCR = (text: string): string =>
      text
        .toLowerCase()
        .replace(/@/g, "q")
        .replace(/d/g, "q")
        .replace(/0/g, "o")
        .replace(/[1il]/g, "l")
        .replace(/7/g, "l")
        .replace(/5/g, "s")
        .replace(/(.)\1{2,}/g, "$1")
        .replace(/[^a-z0-9]/g, "")
        .trim();
  
    source.onmessage = (event) => {
      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
  
      const ocrPayload = payload as any;
  
      if (ocrPayload.ui_position) {
        setUiposition((prev) => ({
          ...prev,
          ...ocrPayload.ui_position,
        }));
      }
  
      const ocrTokens: string[] = [
        ...(ocrPayload.parsed?.players?.map((p: any) => p.name) ?? []),
        ...(ocrPayload.raw_text ?? []),
      ];
  
      const cleanTokens = ocrTokens
        .map(normalizeOCR)
        .filter((t) => t.length >= 3 && t.length <= 25);
  
      let bestScore = 0;
      let bestTeam: Team | null = null;
      let bestPlayer: Player | null = null;
  
      for (const token of cleanTokens) {
        for (const team of dbTeams) {
          if (!team.teamImage) continue;
  
          for (const player of team.players) {
            if (!player.playerImage) continue;
  
            const playerKey = normalizeOCR(player.playerName);
            if (!hasFuzzyAnchor(token, playerKey)) continue;
  
            const score = similarity(token, playerKey);
            if (score > bestScore) {
              bestScore = score;
              bestTeam = team;
              bestPlayer = player;
            }
          }
        }
      }
  
      if (bestTeam && bestPlayer && bestScore >= 0.75) {
        const match: MatchDebug = {
          playerName: bestPlayer.playerName,
          teamName: bestTeam.teamName,
          teamImage: bestTeam.teamImage!,
          playerImage: bestPlayer.playerImage!,
          color: bestTeam.teamColor,
          score: bestScore,
        };
  
        lastStableMatchRef.current = match;
        missCountRef.current = 0;
        setMatchDebug(match);
        return;
      }
  
      missCountRef.current++;
  
      if (
        lastStableMatchRef.current &&
        missCountRef.current < MISS_THRESHOLD
      ) {
        setMatchDebug(lastStableMatchRef.current);
        return;
      }
  
      lastStableMatchRef.current = null;
      missCountRef.current = 0;
      setMatchDebug(null);
    };
  
    source.onerror = () => source.close();
    return () => source.close();
  }, [dbTeams, isClient]);
  

  


  // if (!isClient) {
  //   return <div style={{ width: "1920px", height: "1080px" }} />;
  // }


  return (
    <div
    // className="bg-black"
    >
      {matchDebug && (
        <div className="relative ">
          <div
            style={{
              position: "absolute",
              top: `${uiposion.TeamShortLogoTop}px`,
              left: `${uiposion.TeamShortLogoLeft}px`,
              width: `${uiposion.TeamShortLogoWidth}px`,
              height: `${uiposion.TeamShortLogoHeight}px`,
            }}
            className=" bg-white  overflow-hidden"
          >
            <Image
              src={matchDebug.teamImage}
              alt="team logo"
              fill
              className="object-cover object-center -rotate-20 scale-[1.6]"
              unoptimized
            />
          </div>

          <div className="absolute flex overflow-hidden"
            style={{
              top: `${uiposion.TeamLogoTop}px`,
              left: `${uiposion.TeamLogoLeft}px`,
            }}
          >
            <div
              style={{
                width: `${uiposion.TeamLogoSize}px`,
                height: `${uiposion.TeamLogoSize}px`,
              }}
              className="bg-black/90"
            >

              <Image
                src={matchDebug.teamImage}
                height={150}
                width={62}
                alt="team logo"
                className="object-cover object-center size-full"
                unoptimized
              />
            </div>
            <div className={`   text-white top-0 left-17 w-60 h-10 pt-1`}
              style={{ background: matchDebug.color ?? "black", clipPath: "polygon(0 0, 85% 0, 100% 100%, 0% 100%)", }}
            >
              <p className="text-2xl font-bold w-full ml-3 font-overlay">
                {matchDebug.playerName}
              </p>
            </div>

          </div>
          <div
            style={{
              top: `${uiposion.PlayerImgTop}px`,
              left: `${uiposion.PlayerImgLeft}px`,
              width: `${uiposion.PlayerImgSize}px`,
              height: `${uiposion.PlayerImgSize}px`,
            }}
            className="absolute overflow-hidden 
             bg-black/70">
              
            <Image
              src={matchDebug.playerImage}
              alt="player"
              fill
              className="object-cover object-center"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
