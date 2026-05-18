import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTeamIdFromRequest } from "@/lib/auth";
import { getAccount, getMMR, getMatches, processMatchData } from "@/lib/valorant";

export async function GET() {
  const supabase = await createClient();
  const teamId = await getTeamIdFromRequest(supabase);
  if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { riotId, region } = (await req.json()) as {
    riotId: string;
    region: string;
  };

  const parts = riotId.trim().split("#");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return NextResponse.json(
      { error: "Invalid Riot ID — use the format Name#Tag (e.g. TenZ#000)" },
      { status: 400 }
    );
  }
  const [gameName, tagLine] = parts;

  const supabase = await createClient();
  const teamId = await getTeamIdFromRequest(supabase);
  if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("team_id", teamId)
    .ilike("riot_id", riotId.trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This player is already in the roster" },
      { status: 409 }
    );
  }

  let account, mmr, matches;
  try {
    [account, mmr, matches] = await Promise.all([
      getAccount(gameName, tagLine),
      getMMR(region, gameName, tagLine),
      getMatches(region, gameName, tagLine),
    ]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch player data";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { topAgents, avgKills, avgDeaths, avgAssists, matchHistory } =
    processMatchData(matches, account.puuid);

  const { data, error } = await supabase
    .from("players")
    .insert({
      puuid: account.puuid,
      riot_id: `${account.name}#${account.tag}`,
      game_name: account.name,
      tag_line: account.tag,
      region,
      account_level: account.account_level,
      rank_tier: mmr?.currenttierpatched ?? null,
      rank_rr: mmr?.ranking_in_tier ?? null,
      rank_tier_number: mmr?.currenttier ?? null,
      top_agents: topAgents,
      kda_kills: avgKills,
      kda_deaths: avgDeaths,
      kda_assists: avgAssists,
      kda_history: matchHistory,
      last_synced_at: new Date().toISOString(),
      team_id: teamId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
