export interface TopAgent {
  name: string;
  imageUrl: string;
  games: number;
  winrate: number;
  kda: string;
}

export interface Player {
  id: string;
  puuid: string | null;
  riot_id: string;
  game_name: string;
  tag_line: string;
  region: string;
  account_level: number | null;
  rank_tier: string | null;
  rank_rr: number | null;
  rank_tier_number: number | null;
  top_agents: TopAgent[];
  kda_kills: number | null;
  kda_deaths: number | null;
  kda_assists: number | null;
  last_synced_at: string | null;
  created_at: string;
}
