import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";
import { getValorantMaps } from "@/lib/valorant-data";
import ScrimsClient from "@/components/ScrimsClient";
import type { Player } from "@/types/player";

export const metadata = {
  title: "Scrims — Scrimly",
};

export default async function ScrimsPage() {
  const supabase = await createClient();
  const { userId, username, teamId, role } = await getAuthContext(supabase);

  // Use admin client for scrim_results + stats: the scrim_player_stats SELECT
  // RLS policy silently returns empty arrays in nested joins for normal clients.
  // Team membership is already verified by getAuthContext above.
  const admin = createAdminClient();

  const [
    { data: scrims },
    { data: results },
    { data: availability },
    { data: players },
    { data: scheduled },
    maps,
  ] = await Promise.all([
    supabase
      .from("scrims")
      .select("*")
      .eq("team_id", teamId)
      .order("day_of_week", { ascending: true })
      .order("start_hour", { ascending: true }),
    admin
      .from("scrim_results")
      .select("*, scrim_player_stats(*)")
      .eq("team_id", teamId)
      .order("played_at", { ascending: false }),
    supabase
      .from("player_availability")
      .select("user_id, username, schedule")
      .eq("team_id", teamId),
    supabase
      .from("players")
      .select("id, game_name, tag_line")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false }),
    supabase
      .from("scheduled_scrims")
      .select("*")
      .eq("team_id", teamId)
      .order("scheduled_at", { ascending: true }),
    getValorantMaps(),
  ]);

  return (
    <ScrimsClient
      initialScrims={scrims ?? []}
      initialResults={results ?? []}
      initialScheduled={scheduled ?? []}
      availability={availability ?? []}
      players={
        (players ?? []) as Pick<Player, "id" | "game_name" | "tag_line">[]
      }
      mapNames={maps.map((m) => m.name)}
      username={username}
      userId={userId}
      role={role}
    />
  );
}
