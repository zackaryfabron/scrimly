import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTeamIdFromRequest } from "@/lib/auth";

export async function GET() {
  const supabase = await createClient();
  const teamId = await getTeamIdFromRequest(supabase);
  if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("scheduled_scrims")
    .select("*")
    .eq("team_id", teamId)
    .order("scheduled_at", { ascending: true });

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

  const body = await request.json();
  const { scheduled_at, opponent, map_names, notes, duration_hours } = body;

  const { data, error } = await supabase
    .from("scheduled_scrims")
    .insert({
      team_id: teamId,
      scheduled_at,
      opponent: opponent ?? "",
      map_names: Array.isArray(map_names) ? map_names : [],
      notes: notes ?? "",
      duration_hours: Number(duration_hours) || 2,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
