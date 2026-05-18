import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTeamIdFromRequest } from "@/lib/auth";
import type { CompositionSlot, CompType } from "@/types/maps";

export async function POST(req: NextRequest) {
  const { map_id, composition_type, slots } = (await req.json()) as {
    map_id: string;
    composition_type: CompType;
    slots: CompositionSlot[];
  };

  const supabase = await createClient();
  const teamId = await getTeamIdFromRequest(supabase);
  if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("map_compositions")
    .upsert(
      {
        map_id,
        composition_type,
        slots,
        team_id: teamId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "map_id,composition_type,team_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
