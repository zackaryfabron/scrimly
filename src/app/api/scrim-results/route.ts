import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamIdFromRequest } from "@/lib/auth";

export async function GET() {
  const supabase = await createClient();
  const teamId = await getTeamIdFromRequest(supabase);
  if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("scrim_results")
    .select("*, scrim_player_stats(*)")
    .eq("team_id", teamId)
    .order("played_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = await getTeamIdFromRequest(supabase);
  if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { played_at, opponent, map_name, result, vod_url, stats: player_stats } = body;

    const { data: scrim, error: scrimErr } = await supabase
      .from("scrim_results")
      .insert({
        team_id: teamId,
        played_at,
        opponent: opponent ?? "",
        map_name: map_name ?? "",
        result,
        vod_url: vod_url ?? "",
        created_by: user.id,
      })
      .select()
      .single();

    if (scrimErr) return NextResponse.json({ error: scrimErr.message }, { status: 500 });

    const rows = (player_stats ?? []).filter(
      (s: Record<string, unknown>) =>
        s.kills !== "" || s.deaths !== "" || s.assists !== "" || s.acs !== ""
    );

    let stats: unknown[] = [];
    if (rows.length > 0) {
      // Use admin client: INSERT...RETURNING applies SELECT RLS which silently
      // returns empty when the scrim_player_stats policy evaluates against a
      // freshly inserted scrim_result. Team membership is already verified above.
      const admin = createAdminClient();
      const { data: insertedStats, error: statsErr } = await admin
        .from("scrim_player_stats")
        .insert(
          rows.map((s: Record<string, unknown>) => ({
            scrim_result_id: scrim.id,
            player_id: s.player_id ?? null,
            player_name: s.player_name ?? "",
            kills: Number(s.kills) || 0,
            deaths: Number(s.deaths) || 0,
            assists: Number(s.assists) || 0,
            acs: Number(s.acs) || 0,
          }))
        )
        .select();

      if (statsErr) return NextResponse.json({ error: statsErr.message }, { status: 500 });
      stats = insertedStats ?? [];
    }

    return NextResponse.json({ ...scrim, scrim_player_stats: stats });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
