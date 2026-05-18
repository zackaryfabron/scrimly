import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import { getValorantMaps, getValorantAgents } from "@/lib/valorant-data";
import MapPlannerClient from "@/components/MapPlannerClient";
import type { Player } from "@/types/player";
import type { MapComposition } from "@/types/maps";

export const metadata = {
  title: "Maps — Scrimly",
};

export default async function MapsPage() {
  const supabase = await createClient();
  const { username, teamId } = await getAuthContext(supabase);

  const [maps, agents, { data: players }, { data: compositions }] =
    await Promise.all([
      getValorantMaps(),
      getValorantAgents(),
      supabase
        .from("players")
        .select("id, game_name, tag_line")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false }),
      supabase
        .from("map_compositions")
        .select("*")
        .eq("team_id", teamId),
    ]);

  return (
    <MapPlannerClient
      maps={maps}
      agents={agents}
      players={(players ?? []) as Pick<Player, "id" | "game_name" | "tag_line">[]}
      initialCompositions={(compositions ?? []) as MapComposition[]}
      username={username}
    />
  );
}
