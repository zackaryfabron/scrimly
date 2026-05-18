"use client";

import { useState } from "react";
import type { Player } from "@/types/player";

const REGIONS = [
  { value: "na",    label: "NA — North America" },
  { value: "eu",    label: "EU — Europe" },
  { value: "ap",    label: "AP — Asia Pacific" },
  { value: "kr",    label: "KR — Korea" },
  { value: "latam", label: "LATAM — Latin America" },
  { value: "br",    label: "BR — Brazil" },
];

interface AddPlayerModalProps {
  onClose: () => void;
  onSuccess: (player: Player) => void;
}

export default function AddPlayerModal({ onClose, onSuccess }: AddPlayerModalProps) {
  const [riotId, setRiotId]   = useState("");
  const [region, setRegion]   = useState("na");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riotId, region }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      onSuccess(data as Player);
      onClose();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-[#111111] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Player</h2>
            <p className="text-xs text-gray-500 mt-0.5">Stats pulled automatically from Riot servers</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Riot ID */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">
              Riot ID
            </label>
            <input
              type="text"
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              placeholder="PlayerName#NA1"
              autoFocus
              required
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/25 transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              Include the tag — e.g. <span className="text-gray-400">TenZ#000</span>
            </p>
          </div>

          {/* Region */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/25 transition-colors"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 border border-red-400/20 px-3 py-2.5">
              <svg className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Loading hint */}
          {loading && (
            <p className="text-xs text-gray-500 text-center animate-pulse">
              Fetching rank, agents, and match history…
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/[0.08] py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Adding…" : "Add Player"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
