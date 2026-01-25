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


const DIRECT_PLAYER_THRESHOLD = 0.65;
const TEAM_THRESHOLD = 0.45;
const PLAYER_IN_TEAM_THRESHOLD = 0.55;
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



      type OCRPayload = {
        parsed?: {
          players?: { name?: string }[];
        };
        raw_text?: string[];
        ui_position?: {
          TeamShortLogoTop: number;
          TeamShortLogoLeft: number;
          TeamShortLogoWidth: number;
          TeamShortLogoHeight: number;
          TeamLogoTop: number;
          TeamLogoLeft: number;
          TeamLogoSize: number;
          PlayerImgTop: number;
          PlayerImgLeft: number;
          PlayerImgSize: number;
        };
      };

      const ocrPayload = payload as OCRPayload;

      const ui = ocrPayload.ui_position;
      console.log(payload);
      

      if (ui && Object.keys(ui).length > 0) {
        setUiposition(prev => ({
          ...prev,
          ...ui,
        }));
      }
      

      const ocrTokens: string[] = [
        ...(ocrPayload.parsed?.players
          ?.map((p) => p.name)
          .filter((v): v is string => Boolean(v)) ?? []),
        ...(ocrPayload.raw_text
          ?.filter((v): v is string => Boolean(v)) ?? []),
      ];

      if (ocrTokens.length === 0) {
        setMatchDebug(null);
        return;
      }

      const normalizeOCR = (text: string): string =>
        text
          .toLowerCase()
          .replace(/[0]/g, "o")
          .replace(/[1|i|l]/g, "l")
          .replace(/[7]/g, "l")
          .replace(/[5]/g, "s")
          .replace(/[^a-z]/g, "")
          .trim();

      const cleanTokens = ocrTokens
        .map(normalizeOCR)
        .filter((t) => t.length >= 3 && t.length <= 25);

      if (cleanTokens.length === 0) {
        setMatchDebug(null);
        return;
      }


      let bestDirectScore = 0;
      let directTeam: Team | null = null;
      let directPlayer: Player | null = null;

      for (const token of cleanTokens) {
        for (const team of dbTeams) {
          if (!team.teamImage) continue;

          for (const player of team.players) {
            if (!player.playerImage) continue;

            const score = similarity(
              token,
              normalizeOCR(player.playerName)
            );

            if (score > bestDirectScore) {
              bestDirectScore = score;
              directTeam = team;
              directPlayer = player;
            }
          }
        }
      }

      if (
        directTeam &&
        directPlayer &&
        bestDirectScore >= DIRECT_PLAYER_THRESHOLD
      ) {
        setMatchDebug({
          playerName: directPlayer.playerName,
          teamName: directTeam.teamName,
          teamImage: directTeam.teamImage!,
          playerImage: directPlayer.playerImage!,
          color: directTeam.teamColor,
          score: bestDirectScore,
        });
        return;
      }


      let bestTeam: Team | null = null;
      let bestTeamScore = 0;

      for (const token of cleanTokens) {
        for (const team of dbTeams) {
          const score = similarity(
            token,
            normalizeOCR(team.teamName)
          );

          if (score > bestTeamScore) {
            bestTeamScore = score;
            bestTeam = team;
          }
        }
      }

      if (!bestTeam || bestTeamScore < TEAM_THRESHOLD) {
        setMatchDebug(null);
        return;
      }

      let bestPlayer: Player | null = null;
      let bestPlayerScore = 0;

      for (const token of cleanTokens) {
        for (const player of bestTeam.players) {
          const score = similarity(
            token,
            normalizeOCR(player.playerName)
          );

          if (score > bestPlayerScore) {
            bestPlayerScore = score;
            bestPlayer = player;
          }
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
        playerName: bestPlayer.playerName,
        teamName: bestTeam.teamName,
        teamImage: bestTeam.teamImage,
        playerImage: bestPlayer.playerImage,
        color: bestTeam.teamColor,
        score: bestPlayerScore,
      });
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
                {matchDebug.teamName}
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
