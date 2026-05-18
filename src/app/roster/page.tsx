import { createClient } from "@/lib/supabase/server";
import RosterClient from "@/components/RosterClient";
import type { Player } from "@/types/player";

export const metadata = {
  title: "Roster — Scrimly",
};

export default async function RosterPage() {
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .order("created_at", { ascending: false });

  return <RosterClient initialPlayers={(players as Player[]) ?? []} />;
}
