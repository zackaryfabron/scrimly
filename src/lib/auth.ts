import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export interface AuthContext {
  userId: string;
  username: string;
  teamId: string;
  role: "owner" | "member";
}

export async function getAuthContext(
  supabase: SupabaseClient
): Promise<AuthContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/auth/login");

  return {
    userId: user.id,
    username: (user.user_metadata?.username as string) ?? "Unknown",
    teamId: membership.team_id as string,
    role: membership.role as "owner" | "member",
  };
}

export async function getTeamIdFromRequest(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .single();

  return (data?.team_id as string) ?? null;
}

export async function getAuthFromRequest(
  supabase: SupabaseClient
): Promise<{ teamId: string; role: "owner" | "member" } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .single();

  if (!data) return null;
  return { teamId: data.team_id as string, role: data.role as "owner" | "member" };
}
