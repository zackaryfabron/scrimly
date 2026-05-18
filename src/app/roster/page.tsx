import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import RosterClient from "@/components/RosterClient";
import type { Player } from "@/types/player";

export const metadata = {
  title: "Roster — Scrimly",
};

export default async function RosterPage() {
  const supabase = await createClient();
  const { username, teamId } = await getAuthContext(supabase);

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  return (
    <RosterClient
      initialPlayers={(players as Player[]) ?? []}
      username={username}
    />
  );
}
