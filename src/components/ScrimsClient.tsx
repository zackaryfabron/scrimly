"use client";

import { useState } from "react";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);

function formatHour(h: number) {
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatScheduledAt(isoStr: string) {
  const d = new Date(isoStr);
  return {
    date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

function kd(kills: number, deaths: number) {
  if (deaths === 0) return kills > 0 ? "∞" : "0.00";
  return (kills / deaths).toFixed(2);
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    return null;
  } catch {
    return null;
  }
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Schedule = Record<string, number[]>;

interface PlayerAvailability {
  user_id: string;
  username: string;
  schedule: Schedule;
}

interface Scrim {
  id: string;
  day_of_week: number;
  start_hour: number;
  duration_hours: number;
  opponent: string;
  notes: string;
  created_at: string;
}

interface ScrimPlayerStat {
  id: string;
  player_id: string | null;
  player_name: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
}

interface ScrimResult {
  id: string;
  played_at: string;
  opponent: string;
  map_name: string;
  result: "win" | "loss";
  vod_url: string;
  created_at: string;
  scrim_player_stats: ScrimPlayerStat[];
}

interface ScheduledScrim {
  id: string;
  scheduled_at: string;
  opponent: string;
  map_names: string[];
  notes: string;
  duration_hours: number;
  created_at: string;
}

interface RosterPlayer {
  id: string;
  game_name: string;
  tag_line: string;
}

type ConflictStatus = "available" | "conflict" | "no_data";
interface PlayerStatus {
  username: string;
  status: ConflictStatus;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function checkAvailability(
  scrim: Pick<Scrim, "day_of_week" | "start_hour" | "duration_hours">,
  availability: PlayerAvailability[]
): PlayerStatus[] {
  const key = String(scrim.day_of_week);
  const hours = Array.from(
    { length: scrim.duration_hours },
    (_, i) => scrim.start_hour + i
  );
  return availability.map((p) => {
    const daySchedule = p.schedule[key] ?? [];
    if (daySchedule.length === 0) return { username: p.username, status: "no_data" };
    return {
      username: p.username,
      status: hours.every((h) => daySchedule.includes(h)) ? "available" : "conflict",
    };
  });
}

function StatusDot({ status, size = "md" }: { status: ConflictStatus; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  const color =
    status === "available" ? "bg-green-400" : status === "conflict" ? "bg-red-400" : "bg-gray-600";
  return <span className={`inline-block rounded-full flex-shrink-0 ${sz} ${color}`} />;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  initialScrims: Scrim[];
  initialResults: ScrimResult[];
  initialScheduled: ScheduledScrim[];
  availability: PlayerAvailability[];
  players: RosterPlayer[];
  mapNames: string[];
  username: string;
  userId: string;
  role: "owner" | "member";
}

// ─── Log form state ───────────────────────────────────────────────────────────

interface StatRow {
  player_id: string;
  player_name: string;
  kills: string;
  deaths: string;
  assists: string;
  acs: string;
}

interface LogFormState {
  played_at: string;
  opponent: string;
  map_name: string;
  result: "win" | "loss";
  vod_url: string;
  stats: StatRow[];
}

function makeDefaultLogForm(players: RosterPlayer[]): LogFormState {
  return {
    played_at: todayISO(),
    opponent: "",
    map_name: "",
    result: "win",
    vod_url: "",
    stats: players.map((p) => ({
      player_id: p.id,
      player_name: `${p.game_name}#${p.tag_line}`,
      kills: "",
      deaths: "",
      assists: "",
      acs: "",
    })),
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScrimsClient({
  initialScrims,
  initialResults,
  initialScheduled,
  availability,
  players,
  mapNames,
  username,
  role,
}: Props) {
  const [scrims, setScrims] = useState<Scrim[]>(initialScrims);
  const [results, setResults] = useState<ScrimResult[]>(initialResults);
  const [scheduled, setScheduled] = useState<ScheduledScrim[]>(initialScheduled);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showScheduleScrimModal, setShowScheduleScrimModal] = useState(false);
  const [detailScrim, setDetailScrim] = useState<ScrimResult | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // ── Schedule form state ──────────────────────────────────────────────────
  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: 0,
    start_hour: 19,
    duration_hours: 2,
    opponent: "",
    notes: "",
  });
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const liveConflicts = checkAvailability(scheduleForm, availability);

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setScheduleError(null);
    setScheduleSubmitting(true);
    try {
      const res = await fetch("/api/scrims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleForm),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setScheduleError(json.error ?? "Failed to create scrim.");
        return;
      }
      const newScrim = (await res.json()) as Scrim;
      setScrims((prev) =>
        [...prev, newScrim].sort((a, b) =>
          a.day_of_week !== b.day_of_week
            ? a.day_of_week - b.day_of_week
            : a.start_hour - b.start_hour
        )
      );
      setScheduleForm({ day_of_week: 0, start_hour: 19, duration_hours: 2, opponent: "", notes: "" });
      setShowScheduleForm(false);
    } finally {
      setScheduleSubmitting(false);
    }
  }

  async function handleScrimDelete(id: string) {
    await fetch(`/api/scrims/${id}`, { method: "DELETE" });
    setScrims((prev) => prev.filter((s) => s.id !== id));
  }

  function handleResultSaved(result: ScrimResult) {
    setResults((prev) => [result, ...prev]);
    setShowLogModal(false);
  }

  function handleScheduledSave(s: ScheduledScrim) {
    setScheduled((prev) =>
      [...prev, s].sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      )
    );
    setShowScheduleScrimModal(false);
  }

  async function handleScheduledDelete(id: string) {
    await fetch(`/api/scheduled-scrims/${id}`, { method: "DELETE" });
    setScheduled((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleResultDelete(id: string) {
    await fetch(`/api/scrim-results/${id}`, { method: "DELETE" });
    setResults((prev) => prev.filter((r) => r.id !== id));
    setDetailScrim(null);
  }

  function handleStatUpdate(scrimId: string, updatedStat: ScrimPlayerStat) {
    setResults((prev) =>
      prev.map((r) =>
        r.id === scrimId
          ? {
              ...r,
              scrim_player_stats: r.scrim_player_stats.map((s) =>
                s.id === updatedStat.id ? updatedStat : s
              ),
            }
          : r
      )
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/roster" className="text-lg font-bold tracking-tight">
              <span className="text-green-500">Scrim</span>ly
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-medium text-white">Scrims</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/roster" className="text-xs text-gray-500 hover:text-white transition-colors">Roster</Link>
            <Link href="/maps" className="text-xs text-gray-500 hover:text-white transition-colors">Maps</Link>
            <Link href="/availability" className="text-xs text-gray-500 hover:text-white transition-colors">Availability</Link>
            <div className="w-px h-4 bg-white/[0.08]" />
            <span className="text-xs text-gray-500 hidden sm:block">{username}</span>
            <Link href="/team/settings" title="Team settings" className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-10">

        {/* ── Scrim History ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Scrim History</h2>
              <p className="text-xs text-gray-500 mt-0.5">Logged match results with full scoreboard.</p>
            </div>
            <button
              onClick={() => setShowLogModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Log Scrim
            </button>
          </div>

          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] py-12 flex flex-col items-center text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-white mb-1">No scrims logged yet</p>
              <p className="text-xs text-gray-500">Log your first scrim to start tracking results.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.slice(0, visibleCount).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setDetailScrim(r)}
                  className="w-full text-left rounded-xl border border-white/[0.07] bg-[#111111] px-5 py-4 hover:border-white/[0.15] hover:bg-[#161616] transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide flex-shrink-0 ${
                        r.result === "win"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        {r.result === "win" ? "W" : "L"}
                      </span>
                      <span className="text-sm font-semibold text-white truncate">
                        vs {r.opponent || "Unknown"}
                      </span>
                      {r.map_name && (
                        <span className="text-xs text-gray-500 flex-shrink-0">{r.map_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-600">{formatDate(r.played_at)}</span>
                      <svg className="h-3.5 w-3.5 text-gray-700 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  {r.scrim_player_stats.length > 0 && (
                    <p className="text-[10px] text-gray-600 mt-1.5">
                      {r.scrim_player_stats.length} player stat{r.scrim_player_stats.length !== 1 ? "s" : ""} logged
                      {r.vod_url ? " · VOD available" : ""}
                    </p>
                  )}
                </button>
              ))}
              {results.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount((n) => n + 10)}
                  className="w-full rounded-xl border border-white/[0.07] py-3 text-sm text-gray-500 hover:text-white hover:border-white/[0.15] transition-colors"
                >
                  Load more ({results.length - visibleCount} more)
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Upcoming Scrims ───────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Upcoming Scrims</h2>
              <p className="text-xs text-gray-500 mt-0.5">Scheduled matches with availability check.</p>
            </div>
            {role === "owner" && (
              <button
                onClick={() => setShowScheduleScrimModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3.5 py-2 text-sm font-medium text-gray-400 hover:text-white hover:border-white/20 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Schedule Scrim
              </button>
            )}
          </div>

          {scheduled.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] py-10 flex flex-col items-center text-center">
              <p className="text-sm text-gray-600">
                {role === "owner" ? "No upcoming scrims scheduled." : "No upcoming scrims scheduled by your captain yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduled.map((s) => {
                const dt = formatScheduledAt(s.scheduled_at);
                const d = new Date(s.scheduled_at);
                const day_of_week = (d.getDay() + 6) % 7;
                const conflicts = checkAvailability(
                  { day_of_week, start_hour: d.getHours(), duration_hours: s.duration_hours },
                  availability
                );
                const isPast = d < new Date();
                return (
                  <div
                    key={s.id}
                    className={`rounded-xl border border-white/[0.07] bg-[#111111] p-5 transition-opacity ${isPast ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 bg-white/[0.05] rounded-md px-2 py-0.5">
                            {dt.date}
                          </span>
                          <span className="text-xs text-gray-500">{dt.time}</span>
                          <span className="text-sm font-semibold text-white">vs {s.opponent || "TBD"}</span>
                          {s.map_names?.filter(Boolean).length > 0 && (
                            <span className="text-xs text-gray-500">
                              {s.map_names.filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </div>
                        {s.notes && (
                          <p className="text-xs text-gray-500 mt-1.5 truncate">{s.notes}</p>
                        )}
                        {conflicts.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {conflicts.map((ps) => (
                              <span key={ps.username} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                ps.status === "available" ? "bg-green-500/10 text-green-400"
                                  : ps.status === "conflict" ? "bg-red-500/10 text-red-400"
                                  : "bg-white/[0.05] text-gray-500"
                              }`}>
                                <StatusDot status={ps.status} size="sm" />
                                {ps.username}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {role === "owner" && (
                        <button
                          onClick={() => handleScheduledDelete(s.id)}
                          className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Weekly Schedule ────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Weekly Schedule</h2>
              <p className="text-xs text-gray-500 mt-0.5">Recurring scrims checked against player availability.</p>
            </div>
            {role === "owner" && (
              <button
                onClick={() => setShowScheduleForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3.5 py-2 text-sm font-medium text-gray-400 hover:text-white hover:border-white/20 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Schedule Scrim
              </button>
            )}
          </div>

          {showScheduleForm && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-6 mb-4">
              <h3 className="text-sm font-semibold text-white mb-5">New Recurring Scrim</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Day</label>
                      <select
                        value={scheduleForm.day_of_week}
                        onChange={(e) => setScheduleForm((f) => ({ ...f, day_of_week: Number(e.target.value) }))}
                        className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/60"
                      >
                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Start time</label>
                      <select
                        value={scheduleForm.start_hour}
                        onChange={(e) => setScheduleForm((f) => ({ ...f, start_hour: Number(e.target.value) }))}
                        className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/60"
                      >
                        {HOURS.map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Duration</label>
                    <select
                      value={scheduleForm.duration_hours}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, duration_hours: Number(e.target.value) }))}
                      className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/60"
                    >
                      {[1, 2, 3, 4].map((d) => <option key={d} value={d}>{d} hour{d !== 1 ? "s" : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Opponent</label>
                    <input
                      type="text" value={scheduleForm.opponent} required
                      onChange={(e) => setScheduleForm((f) => ({ ...f, opponent: e.target.value }))}
                      placeholder="Team name"
                      className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Notes <span className="text-gray-600 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text" value={scheduleForm.notes}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="e.g. Best of 3"
                      className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60"
                    />
                  </div>
                  {scheduleError && <p className="text-xs text-red-400">{scheduleError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={scheduleSubmitting}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors">
                      {scheduleSubmitting ? "Scheduling…" : "Schedule"}
                    </button>
                    <button type="button" onClick={() => setShowScheduleForm(false)}
                      className="rounded-lg border border-white/[0.07] px-4 py-2.5 text-sm text-gray-500 hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>

                <div>
                  <p className="text-xs font-medium text-gray-400 mb-3">Availability preview</p>
                  {availability.length === 0 ? (
                    <p className="text-xs text-gray-600">No players have set availability yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {liveConflicts.map((ps) => (
                        <div key={ps.username} className="flex items-center gap-2">
                          <StatusDot status={ps.status} />
                          <span className="text-sm text-white">{ps.username}</span>
                          <span className="text-[10px] text-gray-600 ml-auto">
                            {ps.status === "available" ? "Available" : ps.status === "conflict" ? "Conflict" : "No data"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {scrims.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] py-10 flex flex-col items-center text-center">
              <p className="text-sm text-gray-600">
                {role === "owner" ? "No recurring scrims yet." : "No scrims scheduled by your captain yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scrims.map((scrim) => {
                const conflicts = checkAvailability(scrim, availability);
                const conflictCount = conflicts.filter((c) => c.status === "conflict").length;
                const availableCount = conflicts.filter((c) => c.status === "available").length;
                const endHour = scrim.start_hour + scrim.duration_hours;
                return (
                  <div key={scrim.id} className="rounded-xl border border-white/[0.07] bg-[#111111] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 bg-white/[0.05] rounded-md px-2 py-0.5">
                            {DAYS_SHORT[scrim.day_of_week]}
                          </span>
                          <span className="text-sm font-semibold text-white">vs {scrim.opponent || "TBD"}</span>
                          <span className="text-xs text-gray-500">{formatHour(scrim.start_hour)} – {formatHour(endHour)}</span>
                        </div>
                        {scrim.notes && <p className="text-xs text-gray-500 mt-1.5 truncate">{scrim.notes}</p>}
                        {conflicts.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {conflicts.map((ps) => (
                              <span key={ps.username} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                ps.status === "available" ? "bg-green-500/10 text-green-400"
                                  : ps.status === "conflict" ? "bg-red-500/10 text-red-400"
                                  : "bg-white/[0.05] text-gray-500"
                              }`}>
                                <StatusDot status={ps.status} size="sm" />
                                {ps.username}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {conflicts.length > 0 && (
                          <span className={`text-[10px] font-medium ${conflictCount > 0 ? "text-red-400" : "text-green-400"}`}>
                            {conflictCount > 0 ? `${conflictCount} conflict${conflictCount !== 1 ? "s" : ""}` : `${availableCount} available`}
                          </span>
                        )}
                        {role === "owner" && (
                          <button onClick={() => handleScrimDelete(scrim.id)}
                            className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Schedule Scrim Modal ─────────────────────────────────────────────── */}
      {showScheduleScrimModal && (
        <ScheduleScrimModal
          availability={availability}
          mapNames={mapNames}
          onClose={() => setShowScheduleScrimModal(false)}
          onSave={handleScheduledSave}
        />
      )}

      {/* ── Log Scrim Modal ──────────────────────────────────────────────────── */}
      {showLogModal && (
        <LogScrimModal
          players={players}
          mapNames={mapNames}
          onClose={() => setShowLogModal(false)}
          onSave={handleResultSaved}
        />
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      {detailScrim && (
        <ScrimDetailModal
          scrim={detailScrim}
          role={role}
          onClose={() => setDetailScrim(null)}
          onDelete={handleResultDelete}
          onStatUpdate={handleStatUpdate}
        />
      )}
    </div>
  );
}

// ─── Log Scrim Modal ─────────────────────────────────────────────────────────

function LogScrimModal({
  players,
  mapNames,
  onClose,
  onSave,
}: {
  players: RosterPlayer[];
  mapNames: string[];
  onClose: () => void;
  onSave: (result: ScrimResult) => void;
}) {
  const [form, setForm] = useState<LogFormState>(() => makeDefaultLogForm(players));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setMeta<K extends keyof Omit<LogFormState, "stats">>(
    key: K,
    value: LogFormState[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setStat(idx: number, field: keyof Omit<StatRow, "player_id" | "player_name">, value: string) {
    setForm((f) => {
      const stats = f.stats.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
      return { ...f, stats };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/scrim-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Failed to save scrim.");
        return;
      }
      onSave(await res.json());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 py-8">
      <div className="w-full max-w-2xl bg-[#111111] rounded-2xl border border-white/[0.08] shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">Log Scrim</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Metadata row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Date</label>
              <input
                type="date" value={form.played_at} required
                onChange={(e) => setMeta("played_at", e.target.value)}
                className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/60 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Opponent</label>
              <input
                type="text" value={form.opponent} required placeholder="Team name"
                onChange={(e) => setMeta("opponent", e.target.value)}
                className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Map</label>
              <input
                list="map-list" value={form.map_name} required placeholder="Select or type map"
                onChange={(e) => setMeta("map_name", e.target.value)}
                className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60"
              />
              <datalist id="map-list">
                {mapNames.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Result</label>
              <div className="flex rounded-lg border border-white/[0.07] overflow-hidden">
                {(["win", "loss"] as const).map((r) => (
                  <button
                    key={r} type="button"
                    onClick={() => setMeta("result", r)}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors capitalize ${
                      form.result === r
                        ? r === "win" ? "bg-green-600 text-white" : "bg-red-600/80 text-white"
                        : "text-gray-500 hover:text-white bg-[#1a1a1a]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              VOD Link <span className="text-gray-600 font-normal">(optional — YouTube)</span>
            </label>
            <input
              type="url" value={form.vod_url} placeholder="https://youtube.com/watch?v=..."
              onChange={(e) => setMeta("vod_url", e.target.value)}
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60"
            />
          </div>

          {/* Player stats table */}
          {form.stats.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-3">
                Player Stats <span className="text-gray-600 font-normal">(leave blank to skip)</span>
              </p>
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Player</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-center w-20">ACS</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-center w-16">K</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-center w-16">D</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-center w-16">A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.stats.map((row, idx) => (
                      <tr key={row.player_id} className={idx !== form.stats.length - 1 ? "border-b border-white/[0.04]" : ""}>
                        <td className="px-4 py-2.5 text-xs text-gray-300 font-medium">{row.player_name}</td>
                        {(["acs", "kills", "deaths", "assists"] as const).map((field) => (
                          <td key={field} className="px-2 py-1.5 text-center">
                            <input
                              type="number" min={0} max={999} value={row[field]}
                              onChange={(e) => setStat(idx, field, e.target.value)}
                              placeholder="—"
                              className="w-full rounded-md bg-[#1a1a1a] border border-white/[0.06] px-2 py-1.5 text-xs text-white text-center placeholder:text-gray-700 focus:outline-none focus:border-green-500/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {players.length === 0 && (
            <p className="text-xs text-gray-500 rounded-lg bg-white/[0.03] border border-white/[0.05] px-4 py-3">
              No players on your roster yet.{" "}
              <Link href="/roster" className="text-green-500 hover:underline">Add players</Link>{" "}
              to log per-player stats.
            </p>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-white/[0.07] px-4 py-2.5 text-sm text-gray-500 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors">
              {submitting ? "Saving…" : "Log Scrim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Scrim Detail Modal ───────────────────────────────────────────────────────

function ScrimDetailModal({
  scrim,
  role,
  onClose,
  onDelete,
  onStatUpdate,
}: {
  scrim: ScrimResult;
  role: "owner" | "member";
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onStatUpdate: (scrimId: string, updated: ScrimPlayerStat) => void;
}) {
  const [localStats, setLocalStats] = useState<ScrimPlayerStat[]>(() => [...scrim.scrim_player_stats]);
  const [editingCell, setEditingCell] = useState<{ statId: string; field: "kills" | "deaths" | "assists" | "acs" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const videoId = scrim.vod_url ? extractYouTubeId(scrim.vod_url) : null;
  const sortedStats = [...localStats].sort((a, b) => b.acs - a.acs);

  function startEdit(statId: string, field: "kills" | "deaths" | "assists" | "acs", currentValue: number) {
    setEditingCell({ statId, field });
    setEditValue(String(currentValue));
  }

  async function commitEdit() {
    if (!editingCell) return;
    const { statId, field } = editingCell;
    const stat = localStats.find((s) => s.id === statId);
    if (!stat) { setEditingCell(null); return; }
    const newValue = Math.max(0, Number(editValue) || 0);
    setEditingCell(null);
    if (newValue === stat[field]) return;
    setSaving(statId);
    try {
      const updated = { ...stat, [field]: newValue };
      const res = await fetch(`/api/scrim-player-stats/${statId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kills: updated.kills, deaths: updated.deaths, assists: updated.assists, acs: updated.acs }),
      });
      if (res.ok) {
        const serverStat: ScrimPlayerStat = await res.json();
        setLocalStats((prev) => prev.map((s) => s.id === statId ? serverStat : s));
        onStatUpdate(scrim.id, serverStat);
      }
    } finally {
      setSaving(null);
    }
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  async function handleDelete() {
    setDeleting(true);
    await onDelete(scrim.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 py-8">
      <div className="w-full max-w-2xl bg-[#111111] rounded-2xl border border-white/[0.08] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-bold ${
                scrim.result === "win" ? "bg-green-500/15 text-green-400" : "bg-red-500/10 text-red-400"
              }`}>
                {scrim.result === "win" ? "Win" : "Loss"}
              </span>
              <h2 className="text-base font-semibold text-white">vs {scrim.opponent}</h2>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              {scrim.map_name && <span className="text-xs text-gray-500">{scrim.map_name}</span>}
              <span className="text-xs text-gray-600">{formatDate(scrim.played_at)}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* YouTube embed */}
          {videoId && (
            <div className="rounded-xl overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Scrim VOD"
              />
            </div>
          )}
          {scrim.vod_url && !videoId && (
            <a
              href={scrim.vod_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-green-500 hover:text-green-400 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View VOD
            </a>
          )}

          {/* Scoreboard */}
          {sortedStats.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-400">Scoreboard</p>
                <span className="flex items-center gap-1 text-sm font-bold text-gray-400">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Click a stat to edit
                </span>
              </div>
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Player</th>
                      <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-center">ACS</th>
                      <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-center">K</th>
                      <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-center">D</th>
                      <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-center">A</th>
                      <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-center">K/D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStats.map((stat, idx) => {
                      const isSaving = saving === stat.id;
                      return (
                        <tr
                          key={stat.id}
                          className={`${idx !== sortedStats.length - 1 ? "border-b border-white/[0.04]" : ""} ${idx === 0 ? "bg-green-500/[0.04]" : ""}`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-white">
                            {stat.player_name}
                            {idx === 0 && (
                              <span className="ml-2 text-[9px] font-semibold uppercase tracking-widest text-green-500/70">MVP</span>
                            )}
                          </td>
                          {(["acs", "kills", "deaths", "assists"] as const).map((field) => {
                            const isEditing = editingCell?.statId === stat.id && editingCell?.field === field;
                            return (
                              <td key={field} className="px-3 py-2 text-center">
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    min={0}
                                    max={999}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    className="w-14 rounded-md bg-[#1a1a1a] border border-green-500/50 px-1 py-1 text-xs text-white text-center focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => !isSaving && startEdit(stat.id, field, stat[field])}
                                    title="Click to edit"
                                    className={`min-w-[2rem] rounded px-1 py-0.5 transition-colors hover:text-green-400 hover:bg-green-500/10 ${
                                      field === "acs" ? "font-semibold text-white" : "text-gray-300"
                                    } ${isSaving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                                  >
                                    {isSaving ? "…" : stat[field]}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 text-center text-gray-400 font-mono text-xs">
                            {kd(stat.kills, stat.deaths)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-4">No player stats logged for this scrim.</p>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <div>
              {role === "owner" && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Delete this scrim?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? "Deleting…" : "Confirm"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-xs text-gray-500 hover:text-white disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete scrim
                  </button>
                )
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/[0.07] px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Scrim Modal ─────────────────────────────────────────────────────

interface ScheduleModalForm {
  date: string;
  hour: number;
  duration_hours: number;
  opponent: string;
  num_maps: number;
  map_names: string[];
  notes: string;
}

function ScheduleScrimModal({
  availability,
  mapNames,
  onClose,
  onSave,
}: {
  availability: PlayerAvailability[];
  mapNames: string[];
  onClose: () => void;
  onSave: (s: ScheduledScrim) => void;
}) {
  const [form, setForm] = useState<ScheduleModalForm>({
    date: todayISO(),
    hour: 19,
    duration_hours: 2,
    opponent: "",
    num_maps: 1,
    map_names: [""],
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setNumMaps(n: number) {
    setForm((f) => ({
      ...f,
      num_maps: n,
      map_names: Array.from({ length: n }, (_, i) => f.map_names[i] ?? ""),
    }));
  }

  function setMapName(idx: number, value: string) {
    setForm((f) => {
      const next = [...f.map_names];
      next[idx] = value;
      return { ...f, map_names: next };
    });
  }

  const conflicts = (() => {
    if (!form.date) return [];
    const d = new Date(form.date + "T12:00:00");
    const day_of_week = (d.getDay() + 6) % 7;
    return checkAvailability(
      { day_of_week, start_hour: form.hour, duration_hours: form.duration_hours },
      availability
    );
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const scheduled_at = new Date(
        `${form.date}T${String(form.hour).padStart(2, "0")}:00:00`
      ).toISOString();
      const res = await fetch("/api/scheduled-scrims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at,
          opponent: form.opponent,
          map_names: form.map_names,
          notes: form.notes,
          duration_hours: form.duration_hours,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Failed to schedule scrim.");
        return;
      }
      onSave(await res.json());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 py-8">
      <div className="w-full max-w-2xl bg-[#111111] rounded-2xl border border-white/[0.08] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">Schedule Scrim</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/60 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Time</label>
                  <select
                    value={form.hour}
                    onChange={(e) => setForm((f) => ({ ...f, hour: Number(e.target.value) }))}
                    className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/60"
                  >
                    {HOURS.map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Duration</label>
                <select
                  value={form.duration_hours}
                  onChange={(e) => setForm((f) => ({ ...f, duration_hours: Number(e.target.value) }))}
                  className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/60"
                >
                  {[1, 2, 3, 4].map((d) => <option key={d} value={d}>{d} hour{d !== 1 ? "s" : ""}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Opponent</label>
                <input
                  type="text"
                  required
                  value={form.opponent}
                  placeholder="Team name"
                  onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value }))}
                  className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Number of maps</label>
                <div className="flex rounded-lg border border-white/[0.07] overflow-hidden">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNumMaps(n)}
                      className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                        form.num_maps === n
                          ? "bg-green-600 text-white"
                          : "bg-[#1a1a1a] text-gray-500 hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <datalist id="schedule-map-list">
                  {mapNames.map((m) => <option key={m} value={m} />)}
                </datalist>
                {Array.from({ length: form.num_maps }, (_, i) => (
                  <div key={i}>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      {form.num_maps === 1 ? "Map" : `Map ${i + 1}`}
                    </label>
                    <input
                      list="schedule-map-list"
                      value={form.map_names[i] ?? ""}
                      placeholder="Select or type map"
                      onChange={(e) => setMapName(i, e.target.value)}
                      className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Notes <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.notes}
                  placeholder="e.g. Best of 3"
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 rounded-lg border border-white/[0.07] px-4 py-2.5 text-sm text-gray-500 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors">
                  {submitting ? "Scheduling…" : "Schedule"}
                </button>
              </div>
            </form>

            <div>
              <p className="text-xs font-medium text-gray-400 mb-3">Availability</p>
              {availability.length === 0 ? (
                <p className="text-xs text-gray-600">No players have set availability yet.</p>
              ) : !form.date ? (
                <p className="text-xs text-gray-600">Select a date to check availability.</p>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((ps) => (
                    <div key={ps.username} className="flex items-center gap-2">
                      <StatusDot status={ps.status} />
                      <span className="text-sm text-white">{ps.username}</span>
                      <span className={`text-[10px] ml-auto font-medium ${
                        ps.status === "available" ? "text-green-400"
                          : ps.status === "conflict" ? "text-red-400"
                          : "text-gray-600"
                      }`}>
                        {ps.status === "available" ? "Available" : ps.status === "conflict" ? "Conflict" : "No data"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
