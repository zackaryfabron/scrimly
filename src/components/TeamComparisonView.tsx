"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Player } from "@/types/player";

function kdaRatio(k: number | null, d: number | null, a: number | null): number {
  if (k === null || d === null || a === null) return 0;
  return parseFloat(((k + a) / Math.max(d, 1)).toFixed(2));
}

function shortName(name: string): string {
  return name.length > 10 ? name.slice(0, 9) + "…" : name;
}

function getRankColor(tier: string | null): string {
  if (!tier) return "#6b7280";
  const t = tier.toLowerCase();
  if (t.startsWith("radiant"))   return "#fde68a";
  if (t.startsWith("immortal"))  return "#f87171";
  if (t.startsWith("ascendant")) return "#34d399";
  if (t.startsWith("diamond"))   return "#60a5fa";
  if (t.startsWith("platinum"))  return "#2dd4bf";
  if (t.startsWith("gold"))      return "#fbbf24";
  if (t.startsWith("silver"))    return "#d1d5db";
  if (t.startsWith("bronze"))    return "#d97706";
  return "#6b7280";
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#1a1a1a] border border-white/[0.1] px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-medium mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 leading-5">
          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-400 w-5">{p.name}</span>
          <span className="text-white ml-auto pl-3 tabular-nums">{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export default function TeamComparisonView({ players }: { players: Player[] }) {
  if (!players.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-gray-500">No players to compare.</p>
      </div>
    );
  }

  const chartData = players.map((p) => ({
    name: shortName(p.game_name),
    fullName: `${p.game_name}#${p.tag_line}`,
    K: parseFloat((p.kda_kills ?? 0).toFixed(1)),
    D: parseFloat((p.kda_deaths ?? 0).toFixed(1)),
    A: parseFloat((p.kda_assists ?? 0).toFixed(1)),
  }));

  const teamAvgKda =
    players.reduce((sum, p) => sum + kdaRatio(p.kda_kills, p.kda_deaths, p.kda_assists), 0) /
    players.length;

  const sorted = [...players].sort(
    (a, b) =>
      kdaRatio(b.kda_kills, b.kda_deaths, b.kda_assists) -
      kdaRatio(a.kda_kills, a.kda_deaths, a.kda_assists)
  );

  return (
    <div className="space-y-8">
      {/* Bar chart */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-6">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-white">Avg K / D / A — last 20 competitive</h3>
          <p className="text-xs text-gray-500 mt-0.5">Team avg KDA ratio: {teamAvgKda.toFixed(2)}</p>
        </div>
        <div className="w-full h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
              barCategoryGap="28%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "#4b5563", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#ffffff04" }} />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }}
              />
              <Bar dataKey="K" name="K" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="D" name="D" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="A" name="A" fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stat table */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#111111] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white">Player Rankings</h3>
          <p className="text-xs text-gray-500 mt-0.5">Sorted by KDA ratio · team avg {teamAvgKda.toFixed(2)}</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {sorted.map((player, rank) => {
            const ratio = kdaRatio(player.kda_kills, player.kda_deaths, player.kda_assists);
            const aboveAvg = ratio >= teamAvgKda;
            const rankColor = getRankColor(player.rank_tier);

            return (
              <div key={player.id} className="flex items-center gap-4 px-6 py-4">
                {/* Rank position */}
                <span className="text-sm font-bold text-gray-700 w-5 flex-shrink-0 tabular-nums">
                  {rank + 1}
                </span>

                {/* Player name + rank */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {player.game_name}
                    <span className="text-gray-600 font-normal text-xs">#{player.tag_line}</span>
                  </p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: rankColor }}>
                    {player.rank_tier ?? "Unranked"}
                    {player.rank_rr != null && player.rank_tier && (
                      <span className="opacity-60 font-normal ml-1">{player.rank_rr} RR</span>
                    )}
                  </p>
                </div>

                {/* KDA ratio */}
                <div className="text-right flex-shrink-0 w-16">
                  <p className={`text-base font-bold tabular-nums ${aboveAvg ? "text-green-400" : "text-gray-400"}`}>
                    {ratio.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wide">KDA</p>
                </div>

                {/* K/D/A */}
                <div className="hidden sm:flex items-center gap-3 text-xs tabular-nums flex-shrink-0">
                  <div className="text-center w-10">
                    <p className="text-green-400 font-semibold">{player.kda_kills?.toFixed(1) ?? "—"}</p>
                    <p className="text-gray-700 text-[10px]">K</p>
                  </div>
                  <div className="text-center w-10">
                    <p className="text-red-400 font-semibold">{player.kda_deaths?.toFixed(1) ?? "—"}</p>
                    <p className="text-gray-700 text-[10px]">D</p>
                  </div>
                  <div className="text-center w-10">
                    <p className="text-blue-400 font-semibold">{player.kda_assists?.toFixed(1) ?? "—"}</p>
                    <p className="text-gray-700 text-[10px]">A</p>
                  </div>
                </div>

                {/* Top agent */}
                <div className="hidden md:block text-right flex-shrink-0 w-20">
                  {player.top_agents[0] ? (
                    <>
                      <p className="text-xs text-white font-medium">{player.top_agents[0].name}</p>
                      <p className="text-[10px] text-gray-600">{player.top_agents[0].winrate}% WR</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-700">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
