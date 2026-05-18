"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MatchDataPoint } from "@/types/player";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; name: string; value: number; color: string }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#1a1a1a] border border-white/[0.1] px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-500 mb-1.5 font-medium">Game {label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 leading-5">
          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-400 w-3">{p.name}</span>
          <span className="text-white ml-auto pl-3 tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function KdaTrendChart({ data }: { data: MatchDataPoint[] }) {
  if (!data.length) {
    return (
      <p className="text-xs text-gray-600 italic text-center py-6">
        No history yet — sync player to generate trend data.
      </p>
    );
  }

  return (
    <div className="w-full h-[130px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gK" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
          <XAxis
            dataKey="game"
            tick={{ fill: "#4b5563", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#4b5563", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#ffffff10" }} />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 10, color: "#6b7280", paddingTop: 2 }}
          />
          <Area
            type="monotone"
            dataKey="kills"
            name="K"
            stroke="#22c55e"
            strokeWidth={1.5}
            fill="url(#gK)"
            dot={false}
            activeDot={{ r: 3, fill: "#22c55e" }}
          />
          <Area
            type="monotone"
            dataKey="deaths"
            name="D"
            stroke="#f87171"
            strokeWidth={1.5}
            fill="url(#gD)"
            dot={false}
            activeDot={{ r: 3, fill: "#f87171" }}
          />
          <Area
            type="monotone"
            dataKey="assists"
            name="A"
            stroke="#60a5fa"
            strokeWidth={1.5}
            fill="url(#gA)"
            dot={false}
            activeDot={{ r: 3, fill: "#60a5fa" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
