import type { TopAgent } from "@/types/player";

const HENRIK_BASE = "https://api.henrikdev.xyz";

async function henrikFetch(path: string) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.HENRIKDEV_API_KEY) {
    headers["Authorization"] = process.env.HENRIKDEV_API_KEY;
  }

  const res = await fetch(`${HENRIK_BASE}${path}`, {
    headers,
    cache: "no-store",
  });

  if (res.status === 404) throw new Error("Player not found on Riot servers");

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.errors?.[0]?.message ?? `Valorant API error ${res.status}`
    );
  }

  return res.json();
}

export interface AccountData {
  puuid: string;
  region: string;
  account_level: number;
  name: string;
  tag: string;
}

export interface MMRData {
  currenttier: number;
  currenttierpatched: string;
  ranking_in_tier: number;
}

interface MatchPlayer {
  puuid: string;
  team: string;
  character: string;
  stats: { kills: number; deaths: number; assists: number };
  assets?: { agent?: { small?: string } };
}

interface Match {
  players: { all_players: MatchPlayer[] };
  teams: { red: { has_won: boolean }; blue: { has_won: boolean } };
}

export async function getAccount(name: string, tag: string): Promise<AccountData> {
  const json = await henrikFetch(
    `/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`
  );
  return json.data as AccountData;
}

export async function getMMR(
  region: string,
  name: string,
  tag: string
): Promise<MMRData | null> {
  try {
    const json = await henrikFetch(
      `/valorant/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`
    );
    return json.data as MMRData;
  } catch {
    return null;
  }
}

export async function getMatches(
  region: string,
  name: string,
  tag: string,
  size = 20
): Promise<Match[]> {
  try {
    const json = await henrikFetch(
      `/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=${size}&mode=competitive`
    );
    return (json.data as Match[]) ?? [];
  } catch {
    return [];
  }
}

export interface ProcessedStats {
  topAgents: TopAgent[];
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
}

export function processMatchData(matches: Match[], puuid: string): ProcessedStats {
  type AgentBucket = {
    name: string;
    imageUrl: string;
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
  };

  const agentMap: Record<string, AgentBucket> = {};
  let totalKills = 0;
  let totalDeaths = 0;
  let totalAssists = 0;
  let matchCount = 0;

  for (const match of matches) {
    const player = match.players.all_players.find((p) => p.puuid === puuid);
    if (!player) continue;

    const agentName = player.character;
    if (!agentMap[agentName]) {
      agentMap[agentName] = {
        name: agentName,
        imageUrl: player.assets?.agent?.small ?? "",
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
      };
    }

    const ag = agentMap[agentName];
    ag.games++;
    ag.kills += player.stats.kills;
    ag.deaths += player.stats.deaths;
    ag.assists += player.stats.assists;

    const team = player.team.toLowerCase() as "red" | "blue";
    if (match.teams[team]?.has_won) ag.wins++;

    totalKills += player.stats.kills;
    totalDeaths += player.stats.deaths;
    totalAssists += player.stats.assists;
    matchCount++;
  }

  const topAgents: TopAgent[] = Object.values(agentMap)
    .sort((a, b) => b.games - a.games)
    .slice(0, 3)
    .map((a) => ({
      name: a.name,
      imageUrl: a.imageUrl,
      games: a.games,
      winrate: a.games > 0 ? Math.round((a.wins / a.games) * 100) : 0,
      kda:
        a.deaths > 0
          ? ((a.kills + a.assists) / a.deaths).toFixed(2)
          : "Perfect",
    }));

  return {
    topAgents,
    avgKills: matchCount > 0 ? totalKills / matchCount : 0,
    avgDeaths: matchCount > 0 ? totalDeaths / matchCount : 0,
    avgAssists: matchCount > 0 ? totalAssists / matchCount : 0,
  };
}
