"use client";

import Image from "next/image";
import { useState } from "react";
import type { Player, TopAgent } from "@/types/player";
import KdaTrendChart from "./KdaTrendChart";

function getRankStyle(tier: string | null): { text: string; bg: string } {
  if (!tier) return { text: "text-gray-500", bg: "bg-gray-500/10" };
  const t = tier.toLowerCase();
  if (t.startsWith("iron"))      return { text: "text-gray-400",    bg: "bg-gray-400/10" };
  if (t.startsWith("bronze"))    return { text: "text-amber-600",   bg: "bg-amber-600/10" };
  if (t.startsWith("silver"))    return { text: "text-gray-300",    bg: "bg-gray-300/10" };
  if (t.startsWith("gold"))      return { text: "text-yellow-400",  bg: "bg-yellow-400/10" };
  if (t.startsWith("platinum"))  return { text: "text-teal-400",    bg: "bg-teal-400/10" };
  if (t.startsWith("diamond"))   return { text: "text-blue-400",    bg: "bg-blue-400/10" };
  if (t.startsWith("ascendant")) return { text: "text-emerald-400", bg: "bg-emerald-400/10" };
  if (t.startsWith("immortal"))  return { text: "text-red-400",     bg: "bg-red-400/10" };
  if (t.startsWith("radiant"))   return { text: "text-yellow-300",  bg: "bg-yellow-300/10" };
  return { text: "text-gray-400", bg: "bg-gray-400/10" };
}

function timeAgo(date: string | null): string {
  if (!date) return "Never synced";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60)  return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function kdaRatio(k: number | null, d: number | null, a: number | null): string {
  if (k === null || d === null || a === null) return "—";
  if (d === 0) return "Perfect";
  return ((k + a) / d).toFixed(2);
}

function AgentBubble({ agent }: { agent: TopAgent }) {
  return (
    <div className="flex flex-col items-center gap-1 w-16">
      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0 ring-1 ring-white/[0.08]">
        {agent.imageUrl ? (
          <Image src={agent.imageUrl} alt={agent.name} fill sizes="40px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-500">
            {agent.name[0]}
          </span>
        )}
      </div>
      <span className="text-[11px] font-medium text-white truncate w-full text-center">{agent.name}</span>
      <span className="text-[10px] text-gray-600">{agent.games}G</span>
      <span className={`text-[10px] font-semibold ${agent.winrate >= 50 ? "text-green-400" : "text-red-400"}`}>
        {agent.winrate}% WR
      </span>
      <span className="text-[10px] text-gray-600">{agent.kda} KDA</span>
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  onDelete: (id: string) => Promise<void>;
  onSync: (id: string) => Promise<void>;
}

export default function PlayerCard({ player, onDelete, onSync }: PlayerCardProps) {
  const [syncing, setSyncing]       = useState(false);
  const [syncError, setSyncError]   = useState<string | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [showChart, setShowChart]   = useState(false);

  const rankStyle = getRankStyle(player.rank_tier);
  const history = player.kda_history ?? [];

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      await onSync(player.id);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove ${player.game_name}#${player.tag_line} from the roster?`)) return;
    setDeleting(true);
    await onDelete(player.id);
  }

  return (
    <div className={`rounded-2xl border border-white/[0.07] bg-[#111111] p-5 flex flex-col gap-4 transition-all hover:border-green-500/25 ${deleting ? "opacity-40 pointer-events-none" : ""}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-white leading-tight truncate">
            {player.game_name}
            <span className="text-gray-500 font-normal text-sm">#{player.tag_line}</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${rankStyle.text} ${rankStyle.bg}`}>
              {player.rank_tier ?? "Unranked"}
            </span>
            {player.rank_rr != null && player.rank_tier && (
              <span className="text-xs text-gray-500 tabular-nums">{player.rank_rr} RR</span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            Lv.&nbsp;{player.account_level ?? "—"} &middot; {player.region.toUpperCase()}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowChart((v) => !v)}
            title={showChart ? "Hide trend" : "Show KDA trend"}
            className={`p-1.5 rounded-lg transition-colors ${showChart ? "text-green-400 bg-green-400/10" : "text-gray-600 hover:text-green-400 hover:bg-green-400/10"}`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Re-sync stats"
            className="p-1.5 rounded-lg text-gray-600 hover:text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-40"
          >
            <svg className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            title="Remove player"
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {syncError && (
        <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-1.5">{syncError}</p>
      )}

      <div className="h-px bg-white/[0.05]" />

      {/* Top agents */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-600 mb-3">
          Top Agents · last 20 competitive
        </p>
        {player.top_agents.length > 0 ? (
          <div className="flex gap-3">
            {player.top_agents.map((agent) => (
              <AgentBubble key={agent.name} agent={agent} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600 italic">No competitive match data</p>
        )}
      </div>

      {/* KDA Trend chart */}
      {showChart && (
        <>
          <div className="h-px bg-white/[0.05]" />
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-600 mb-2">
              KDA Trend{history.length > 0 ? ` · ${history.length} games` : ""}
            </p>
            <KdaTrendChart data={history} />
          </div>
        </>
      )}

      <div className="h-px bg-white/[0.05]" />

      {/* KDA footer */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-600 mb-1">
            Avg KDA
          </p>
          <p className="text-sm font-medium text-white">
            <span className="text-green-400">{player.kda_kills?.toFixed(1) ?? "—"}</span>
            <span className="text-gray-600 mx-1">/</span>
            <span className="text-red-400">{player.kda_deaths?.toFixed(1) ?? "—"}</span>
            <span className="text-gray-600 mx-1">/</span>
            <span className="text-blue-400">{player.kda_assists?.toFixed(1) ?? "—"}</span>
            <span className="text-gray-500 text-xs ml-2">
              ({kdaRatio(player.kda_kills, player.kda_deaths, player.kda_assists)})
            </span>
          </p>
        </div>
        <p className="text-[10px] text-gray-700">{timeAgo(player.last_synced_at)}</p>
      </div>
    </div>
  );
}
