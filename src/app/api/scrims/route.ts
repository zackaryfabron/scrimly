import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTeamIdFromRequest } from "@/lib/auth";

export async function GET() {
  const supabase = await createClient();
  const teamId = await getTeamIdFromRequest(supabase);
  if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("scrims")
    .select("*")
    .eq("team_id", teamId)
    .order("day_of_week", { ascending: true })
    .order("start_hour", { ascending: true });

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

  const { data, error } = await supabase
    .from("scrims")
    .insert({
      team_id: teamId,
      day_of_week: body.day_of_week,
      start_hour: body.start_hour,
      duration_hours: body.duration_hours ?? 2,
      opponent: body.opponent ?? "",
      notes: body.notes ?? "",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
