import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamIdFromRequest } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const teamId = await getTeamIdFromRequest(supabase);
  if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: stat } = await admin
    .from("scrim_player_stats")
    .select("id, scrim_result_id")
    .eq("id", id)
    .single();

  if (!stat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: scrimResult } = await admin
    .from("scrim_results")
    .select("team_id")
    .eq("id", stat.scrim_result_id)
    .single();

  if (!scrimResult || scrimResult.team_id !== teamId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { kills, deaths, assists, acs } = body;

  const { data, error } = await admin
    .from("scrim_player_stats")
    .update({
      kills: Math.max(0, Number(kills) || 0),
      deaths: Math.max(0, Number(deaths) || 0),
      assists: Math.max(0, Number(assists) || 0),
      acs: Math.max(0, Number(acs) || 0),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
