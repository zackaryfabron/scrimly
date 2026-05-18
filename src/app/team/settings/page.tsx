"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/components/LogoutButton";

interface TeamData {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
}

export default function TeamSettingsPage() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"owner" | "member">("member");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUsername((user.user_metadata?.username as string) ?? "");

      const { data: membership } = await supabase
        .from("team_members")
        .select("team_id, role, teams(id, name, invite_code, owner_id)")
        .single();

      if (membership?.teams) {
        const t = membership.teams as unknown as TeamData;
        setTeam(t);
        setRole(membership.role as "owner" | "member");
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleCopy() {
    if (!team) return;
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              <span className="text-green-500">Scrim</span>ly
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-medium text-white">Team Settings</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/roster"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Roster
            </Link>
            <Link
              href="/maps"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Maps
            </Link>
            <div className="w-px h-4 bg-white/[0.08]" />
            <span className="text-xs text-gray-500">{username}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 max-w-xl">
        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : !team ? (
          <p className="text-sm text-red-400">Could not load team data.</p>
        ) : (
          <div className="space-y-8">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-600 mb-1">
                Team
              </p>
              <h2 className="text-2xl font-bold text-white">{team.name}</h2>
              <p className="text-xs text-gray-600 mt-1 capitalize">{role}</p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-6 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-600 mb-3">
                  Invite Code
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Share this code with teammates so they can join your team at{" "}
                  <span className="text-gray-400 font-mono">/auth/join</span>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-4 py-3">
                  <span className="font-mono text-xl font-bold tracking-[0.25em] text-white">
                    {team.invite_code}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="rounded-lg border border-white/[0.07] bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:border-white/20 transition-colors whitespace-nowrap"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
