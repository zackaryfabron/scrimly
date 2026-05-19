"use client";

import { useState } from "react";
import Link from "next/link";
import PlayerCard from "./PlayerCard";
import AddPlayerModal from "./AddPlayerModal";
import TeamComparisonView from "./TeamComparisonView";
import LogoutButton from "./LogoutButton";
import type { Player } from "@/types/player";
import type { ReliabilityStats } from "@/types/attendance";

interface RosterClientProps {
  initialPlayers: Player[];
  username: string;
  role: "owner" | "member";
  reliabilityStats: Record<string, ReliabilityStats>;
}

type View = "cards" | "team";

export default function RosterClient({ initialPlayers, username, role, reliabilityStats }: RosterClientProps) {
  const [players, setPlayers]     = useState<Player[]>(initialPlayers);
  const [showModal, setShowModal] = useState(false);
  const [view, setView]           = useState<View>("cards");

  function handlePlayerAdded(player: Player) {
    setPlayers((prev) => [player, ...prev]);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSync(id: string) {
    const res = await fetch(`/api/players/${id}/sync`, { method: "POST" });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Sync failed");
    }
    const updated = (await res.json()) as Player;
    setPlayers((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  async function handleNicknameUpdate(id: string, nickname: string) {
    const res = await fetch(`/api/players/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Failed to update nickname");
    }
    const updated = (await res.json()) as Player;
    setPlayers((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* App top bar */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/roster" className="text-lg font-bold tracking-tight">
              <span className="text-green-500">Scrim</span>ly
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-medium text-white">Roster</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/maps"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Maps
            </Link>
            <Link
              href="/availability"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Availability
            </Link>
            <Link
              href="/scrims"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Scrims
            </Link>

            {/* View toggle */}

            {players.length > 0 && (
              <div className="hidden sm:flex items-center rounded-lg border border-white/[0.08] overflow-hidden">
                <button
                  onClick={() => setView("cards")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === "cards"
                      ? "bg-green-600 text-white"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setView("team")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === "team"
                      ? "bg-green-600 text-white"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  Team
                </button>
              </div>
            )}

            <span className="text-xs text-gray-600 hidden sm:block">
              {players.length} player{players.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Player
            </button>

            <div className="w-px h-4 bg-white/[0.08]" />
            <span className="text-xs text-gray-500 hidden sm:block">{username}</span>
            <Link
              href="/team/settings"
              title="Team settings"
              className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-500">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No players yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Add your first player using their Riot ID and we&apos;ll pull their rank, agents, and KDA automatically.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
            >
              Add First Player
            </button>
          </div>
        ) : view === "team" ? (
          <TeamComparisonView players={players} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                canEdit={role === "owner"}
                reliability={reliabilityStats[player.id] ?? null}
                onDelete={handleDelete}
                onSync={handleSync}
                onNicknameUpdate={handleNicknameUpdate}
              />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <AddPlayerModal
          onClose={() => setShowModal(false)}
          onSuccess={handlePlayerAdded}
        />
      )}
    </div>
  );
}
