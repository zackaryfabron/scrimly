import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import RosterClient from "@/components/RosterClient";
import type { Player } from "@/types/player";
import type { ReliabilityStats } from "@/types/attendance";
import { computeReliability } from "@/lib/attendance";

export const metadata = {
  title: "Roster — Scrimly",
};

export default async function RosterPage() {
  const supabase = await createClient();
  const { username, teamId, role } = await getAuthContext(supabase);

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  let reliabilityStats: Record<string, ReliabilityStats> = {};
  if (role === "owner") {
    const { data: attendance } = await supabase
      .from("scrim_attendance")
      .select("player_id, status, late_minutes")
      .eq("team_id", teamId);
    reliabilityStats = computeReliability(attendance ?? []);
  }

  return (
    <RosterClient
      initialPlayers={(players as Player[]) ?? []}
      username={username}
      role={role}
      reliabilityStats={reliabilityStats}
    />
  );
}
