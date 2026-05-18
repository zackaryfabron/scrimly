import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTeamIdFromRequest } from "@/lib/auth";

export async function GET() {
  const supabase = await createClient();
  const teamId = await getTeamIdFromRequest(supabase);
  if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("player_availability")
    .select("user_id, username, schedule")
    .eq("team_id", teamId);

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

  const { schedule } = await request.json();
  const username = (user.user_metadata?.username as string) ?? "Unknown";

  const { error } = await supabase.from("player_availability").upsert(
    {
      user_id: user.id,
      team_id: teamId,
      username,
      schedule,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,team_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
