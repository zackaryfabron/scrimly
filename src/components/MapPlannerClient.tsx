"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import AgentPicker from "./AgentPicker";
import LogoutButton from "./LogoutButton";
import type { ValorantMap, ValorantAgent, CompositionSlot, CompType, MapComposition } from "@/types/maps";
import type { Player } from "@/types/player";

type RosterPlayer = Pick<Player, "id" | "game_name" | "tag_line">;
type Compositions = Record<string, Partial<Record<CompType, CompositionSlot[]>>>;

interface Props {
  maps: ValorantMap[];
  agents: ValorantAgent[];
  players: RosterPlayer[];
  initialCompositions: MapComposition[];
  username: string;
}

const EMPTY_SLOT: CompositionSlot = {
  agent_id: null,
  agent_name: null,
  agent_icon: null,
  player_id: null,
  player_name: null,
};

function buildState(raw: MapComposition[]): Compositions {
  const state: Compositions = {};
  for (const c of raw) {
    if (!state[c.map_id]) state[c.map_id] = {};
    state[c.map_id][c.composition_type] = c.slots;
  }
  return state;
}

function resolveSlots(comps: Compositions, mapId: string, type: CompType): CompositionSlot[] {
  const stored = comps[mapId]?.[type] ?? [];
  return Array.from({ length: 5 }, (_, i) => stored[i] ?? { ...EMPTY_SLOT });
}

// ─── Slot card ───────────────────────────────────────────────────────────────

function SlotCard({
  slot,
  index,
  players,
  onOpenPicker,
  onPlayerAssign,
  onClear,
}: {
  slot: CompositionSlot;
  index: number;
  players: RosterPlayer[];
  onOpenPicker: () => void;
  onPlayerAssign: (playerId: string) => void;
  onClear: () => void;
}) {
  const isEmpty = !slot.agent_id;

  return (
    <div
      className={`relative rounded-xl border flex flex-col transition-all ${
        isEmpty
          ? "border-dashed border-white/[0.1] hover:border-green-500/30 min-h-[120px]"
          : "border-white/[0.07] bg-[#1a1a1a] min-h-[148px]"
      }`}
    >
      {isEmpty ? (
        <button
          onClick={onOpenPicker}
          className="flex-1 flex flex-col items-center justify-center gap-2 p-3 w-full h-full rounded-xl"
        >
          <div className="h-9 w-9 rounded-full border border-white/[0.1] flex items-center justify-center text-gray-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[10px] text-gray-700">Slot {index + 1}</span>
        </button>
      ) : (
        <div className="flex flex-col items-center p-3 gap-2 flex-1">
          {/* Clear */}
          <button
            onClick={onClear}
            title="Clear slot"
            className="absolute top-1.5 right-1.5 p-0.5 rounded text-gray-700 hover:text-red-400 transition-colors"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Agent portrait — click to change */}
          <button
            onClick={onOpenPicker}
            title="Change agent"
            className="relative h-12 w-12 rounded-xl overflow-hidden ring-1 ring-white/[0.08] hover:ring-green-500/40 transition-all flex-shrink-0"
          >
            {slot.agent_icon && (
              <Image
                src={slot.agent_icon}
                alt={slot.agent_name ?? "agent"}
                fill
                sizes="48px"
                className="object-cover"
              />
            )}
          </button>

          {/* Agent name */}
          <span className="text-xs font-semibold text-white text-center leading-tight truncate w-full px-1">
            {slot.agent_name}
          </span>

          {/* Player assignment */}
          <select
            value={slot.player_id ?? ""}
            onChange={(e) => onPlayerAssign(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-lg bg-[#111111] border border-white/[0.07] px-1.5 py-1 text-[10px] text-gray-400 focus:outline-none focus:border-green-500/40 transition-colors appearance-none cursor-pointer"
          >
            <option value="">No player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.game_name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapPlannerClient({ maps, agents, players, initialCompositions, username }: Props) {
  const [selectedMapId, setSelectedMapId] = useState(maps[0]?.id ?? "");
  const [activeTab, setActiveTab]         = useState<CompType>("main");
  const [compositions, setCompositions]   = useState<Compositions>(buildState(initialCompositions));
  const [picker, setPicker]               = useState<{ slotIndex: number; currentAgentId: string | null } | null>(null);
  const [saveStatus, setSaveStatus]       = useState<"idle" | "saving" | "saved">("idle");

  const selectedMap  = maps.find((m) => m.id === selectedMapId);
  const currentSlots = resolveSlots(compositions, selectedMapId, activeTab);

  async function saveComposition(mapId: string, type: CompType, slots: CompositionSlot[]) {
    setSaveStatus("saving");
    try {
      await fetch("/api/compositions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ map_id: mapId, composition_type: type, slots }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }

  function applySlots(newSlots: CompositionSlot[]) {
    setCompositions((prev) => ({
      ...prev,
      [selectedMapId]: { ...prev[selectedMapId], [activeTab]: newSlots },
    }));
    saveComposition(selectedMapId, activeTab, newSlots);
  }

  function handleAgentSelect(agent: ValorantAgent) {
    if (!picker) return;
    applySlots(
      currentSlots.map((s, i) =>
        i === picker.slotIndex
          ? { ...s, agent_id: agent.id, agent_name: agent.name, agent_icon: agent.icon }
          : s
      )
    );
    setPicker(null);
  }

  function handleClearPicker() {
    if (!picker) return;
    applySlots(currentSlots.map((s, i) => (i === picker.slotIndex ? { ...EMPTY_SLOT } : s)));
    setPicker(null);
  }

  function handleClearSlot(slotIndex: number) {
    applySlots(currentSlots.map((s, i) => (i === slotIndex ? { ...EMPTY_SLOT } : s)));
  }

  function handlePlayerAssign(slotIndex: number, playerId: string) {
    const player = players.find((p) => p.id === playerId);
    applySlots(
      currentSlots.map((s, i) =>
        i === slotIndex
          ? { ...s, player_id: playerId || null, player_name: player?.game_name ?? null }
          : s
      )
    );
  }

  const filledCount = currentSlots.filter((s) => s.agent_id).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              <span className="text-green-500">Scrim</span>ly
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-medium text-white">Maps</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/roster"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Roster
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

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">

        {/* ── Map selector ── */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-600 mb-4">
            Select Map
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {maps.map((map) => (
              <button
                key={map.id}
                onClick={() => { setSelectedMapId(map.id); setActiveTab("main"); }}
                className={`relative rounded-xl overflow-hidden aspect-video ring-2 transition-all ${
                  selectedMapId === map.id
                    ? "ring-green-500 shadow-lg shadow-green-900/20"
                    : "ring-transparent hover:ring-white/20"
                }`}
              >
                <Image
                  src={map.listViewIconTall}
                  alt={map.name}
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 17vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <span className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] font-semibold text-white px-1 truncate">
                  {map.name}
                </span>
                {/* Filled-slots indicator */}
                {selectedMapId === map.id && filledCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-green-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {filledCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Composition editor ── */}
        {selectedMap && (
          <div className="space-y-5">
            {/* Map banner */}
            <div className="relative h-44 rounded-2xl overflow-hidden">
              <Image
                src={selectedMap.splash}
                alt={selectedMap.name}
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  {selectedMap.name}
                </h2>
                <p className="text-xs text-gray-500 mt-1 font-mono">{selectedMap.coordinates}</p>
              </div>
            </div>

            {/* Tabs + save indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center rounded-lg border border-white/[0.08] overflow-hidden">
                {(["main", "alternative"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "bg-green-600 text-white"
                        : "text-gray-500 hover:text-white"
                    }`}
                  >
                    {tab === "main" ? "Main" : "Alternative"}
                  </button>
                ))}
              </div>
              <span
                className={`text-xs transition-opacity duration-300 ${
                  saveStatus === "idle" ? "opacity-0" : "opacity-100"
                } ${saveStatus === "saving" ? "text-gray-500" : "text-green-500"}`}
              >
                {saveStatus === "saving" ? "Saving…" : "Saved"}
              </span>
            </div>

            {/* 5 agent slots */}
            <div className="grid grid-cols-5 gap-3">
              {currentSlots.map((slot, i) => (
                <SlotCard
                  key={i}
                  slot={slot}
                  index={i}
                  players={players}
                  onOpenPicker={() => setPicker({ slotIndex: i, currentAgentId: slot.agent_id })}
                  onPlayerAssign={(pid) => handlePlayerAssign(i, pid)}
                  onClear={() => handleClearSlot(i)}
                />
              ))}
            </div>

            {/* Composition summary bar */}
            <div className="rounded-xl border border-white/[0.06] bg-[#111111] px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-600 mb-3">
                {activeTab === "main" ? "Main" : "Alternative"} Composition
              </p>
              {filledCount === 0 ? (
                <p className="text-xs text-gray-700 italic">
                  No agents assigned — click a slot above to start building.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {currentSlots.map((slot, i) =>
                    slot.agent_id ? (
                      <div key={i} className="flex items-center gap-2">
                        <div className="relative h-6 w-6 rounded-md overflow-hidden bg-[#1a1a1a] ring-1 ring-white/[0.06]">
                          <Image
                            src={slot.agent_icon!}
                            alt={slot.agent_name!}
                            fill
                            sizes="24px"
                            className="object-cover"
                          />
                        </div>
                        <div className="leading-none">
                          <span className="text-xs font-medium text-white">{slot.agent_name}</span>
                          {slot.player_name && (
                            <span className="text-[10px] text-green-500 ml-1.5">
                              {slot.player_name}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {picker && (
        <AgentPicker
          agents={agents}
          selectedAgentId={picker.currentAgentId}
          onSelect={handleAgentSelect}
          onClear={handleClearPicker}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
