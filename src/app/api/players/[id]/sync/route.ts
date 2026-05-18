import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTeamIdFromRequest } from "@/lib/auth";
import { getAccount, getMMR, getMatches, processMatchData } from "@/lib/valorant";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const teamId = await getTeamIdFromRequest(supabase);
  if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: player, error: fetchError } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .eq("team_id", teamId)
    .single();

  if (fetchError || !player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  let account, mmr, matches;
  try {
    [account, mmr, matches] = await Promise.all([
      getAccount(player.game_name, player.tag_line),
      getMMR(player.region, player.game_name, player.tag_line),
      getMatches(player.region, player.game_name, player.tag_line),
    ]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch player data";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { topAgents, avgKills, avgDeaths, avgAssists, matchHistory } =
    processMatchData(matches, account.puuid);

  const { data: updated, error: updateError } = await supabase
    .from("players")
    .update({
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
    })
    .eq("id", id)
    .eq("team_id", teamId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
