"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8–23

function formatHour(h: number) {
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

type Schedule = Record<string, number[]>;

interface PlayerAvailability {
  user_id: string;
  username: string;
  schedule: Schedule;
}

interface Props {
  userId: string;
  username: string;
  initialAvailability: PlayerAvailability[];
}

export default function AvailabilityClient({
  userId,
  username,
  initialAvailability,
}: Props) {
  const myInitial =
    initialAvailability.find((a) => a.user_id === userId)?.schedule ?? {};

  const [schedule, setSchedule] = useState<Schedule>(myInitial);
  const [tab, setTab] = useState<"my" | "team">("my");
  const [saving, setSaving] = useState(false);

  const scheduleRef = useRef<Schedule>(myInitial);
  const isDragging = useRef(false);
  const dragMode = useRef<"add" | "remove">("add");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  const triggerSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedule: scheduleRef.current }),
        });
      } finally {
        setSaving(false);
      }
    }, 800);
  }, []);

  useEffect(() => {
    function handleMouseUp() {
      isDragging.current = false;
    }
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  function applyToCell(day: number, hour: number) {
    setSchedule((prev) => {
      const key = String(day);
      const existing = prev[key] ?? [];
      const has = existing.includes(hour);
      if (dragMode.current === "add" && !has) {
        return { ...prev, [key]: [...existing, hour].sort((a, b) => a - b) };
      }
      if (dragMode.current === "remove" && has) {
        return { ...prev, [key]: existing.filter((h) => h !== hour) };
      }
      return prev;
    });
  }

  function handleCellMouseDown(day: number, hour: number) {
    const has = (schedule[String(day)] ?? []).includes(hour);
    dragMode.current = has ? "remove" : "add";
    isDragging.current = true;
    applyToCell(day, hour);
    triggerSave();
  }

  function handleCellMouseEnter(day: number, hour: number) {
    if (!isDragging.current) return;
    applyToCell(day, hour);
    triggerSave();
  }

  const teamPlayers = initialAvailability.length;

  function getTeamCount(day: number, hour: number) {
    const key = String(day);
    return initialAvailability.filter((p) =>
      (p.schedule[key] ?? []).includes(hour)
    ).length;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/roster" className="text-lg font-bold tracking-tight">
              <span className="text-green-500">Scrim</span>ly
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-medium text-white">Availability</span>
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
            <Link
              href="/scrims"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Scrims
            </Link>
            <div className="w-px h-4 bg-white/[0.08]" />
            <span className="text-xs text-gray-500 hidden sm:block">
              {username}
            </span>
            <Link
              href="/team/settings"
              title="Team settings"
              className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] p-1">
            <button
              onClick={() => setTab("my")}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === "my"
                  ? "bg-green-600 text-white"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              My Availability
            </button>
            <button
              onClick={() => setTab("team")}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === "team"
                  ? "bg-green-600 text-white"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              Team View
            </button>
          </div>
          {tab === "my" && (
            <span className="text-[10px] text-gray-600">
              {saving ? "Saving…" : "Auto-saved"}
            </span>
          )}
        </div>

        {tab === "my" ? (
          <div className="select-none">
            <p className="text-xs text-gray-500 mb-5">
              Click or drag to mark when you&apos;re available to scrim.
            </p>
            <AvailabilityGrid
              schedule={schedule}
              onMouseDown={handleCellMouseDown}
              onMouseEnter={handleCellMouseEnter}
            />
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-5">
              {teamPlayers === 0
                ? "No availability data yet."
                : `Showing ${teamPlayers} player${teamPlayers !== 1 ? "s" : ""}. Hover a cell to see the count.`}
            </p>
            <TeamHeatMap
              getCount={getTeamCount}
              total={teamPlayers}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function AvailabilityGrid({
  schedule,
  onMouseDown,
  onMouseEnter,
}: {
  schedule: Schedule;
  onMouseDown: (day: number, hour: number) => void;
  onMouseEnter: (day: number, hour: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div
          className="grid"
          style={{ gridTemplateColumns: "3.5rem repeat(7, 1fr)" }}
        >
          <div />
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-semibold uppercase tracking-widest text-gray-500 pb-2"
            >
              {d}
            </div>
          ))}
        </div>

        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid"
            style={{ gridTemplateColumns: "3.5rem repeat(7, 1fr)" }}
          >
            <div className="flex items-center justify-end pr-3 text-[10px] text-gray-600 h-8">
              {formatHour(hour)}
            </div>
            {DAYS.map((_, day) => {
              const active = (schedule[String(day)] ?? []).includes(hour);
              return (
                <div
                  key={day}
                  onMouseDown={() => onMouseDown(day, hour)}
                  onMouseEnter={() => onMouseEnter(day, hour)}
                  className={`h-8 border-[0.5px] border-white/[0.05] cursor-pointer transition-colors ${
                    active
                      ? "bg-green-600/70 hover:bg-green-500/80"
                      : "hover:bg-white/[0.04]"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamHeatMap({
  getCount,
  total,
}: {
  getCount: (day: number, hour: number) => number;
  total: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] text-gray-600">0</span>
          {[0.2, 0.4, 0.6, 0.8, 1].map((r) => (
            <div
              key={r}
              className="h-3.5 w-6 rounded-sm border border-white/[0.05]"
              style={{ backgroundColor: `rgba(34,197,94,${r * 0.75})` }}
            />
          ))}
          <span className="text-[10px] text-gray-600">All</span>
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: "3.5rem repeat(7, 1fr)" }}
        >
          <div />
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-semibold uppercase tracking-widest text-gray-500 pb-2"
            >
              {d}
            </div>
          ))}
        </div>

        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid"
            style={{ gridTemplateColumns: "3.5rem repeat(7, 1fr)" }}
          >
            <div className="flex items-center justify-end pr-3 text-[10px] text-gray-600 h-8">
              {formatHour(hour)}
            </div>
            {DAYS.map((_, day) => {
              const count = getCount(day, hour);
              const ratio = total > 0 ? count / total : 0;
              const bg =
                ratio === 0
                  ? "transparent"
                  : `rgba(34,197,94,${ratio * 0.75})`;
              return (
                <div
                  key={day}
                  className="h-8 border-[0.5px] border-white/[0.05] relative group"
                  style={{ backgroundColor: bg }}
                >
                  {count > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                      <span className="text-[9px] font-bold text-white/90 bg-black/60 rounded px-1">
                        {count}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
