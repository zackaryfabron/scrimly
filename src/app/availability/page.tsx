import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import AvailabilityClient from "@/components/AvailabilityClient";

export const metadata = {
  title: "Availability — Scrimly",
};

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { userId, username, teamId } = await getAuthContext(supabase);

  const { data: availability } = await supabase
    .from("player_availability")
    .select("user_id, username, schedule")
    .eq("team_id", teamId);

  return (
    <AvailabilityClient
      userId={userId}
      username={username}
      initialAvailability={availability ?? []}
    />
  );
}
