import type { ReliabilityStats } from "@/types/attendance";

interface RawRecord {
  player_id: string;
  status: string;
  late_minutes: number | null;
}

export function computeReliability(records: RawRecord[]): Record<string, ReliabilityStats> {
  const acc: Record<string, {
    total: number; present: number; late: number; absent: number; lateMinutes: number[];
  }> = {};

  for (const r of records) {
    if (!acc[r.player_id]) {
      acc[r.player_id] = { total: 0, present: 0, late: 0, absent: 0, lateMinutes: [] };
    }
    const s = acc[r.player_id];
    s.total++;
    if (r.status === "present") s.present++;
    else if (r.status === "late") {
      s.late++;
      if (r.late_minutes != null && r.late_minutes > 0) s.lateMinutes.push(r.late_minutes);
    } else if (r.status === "absent") s.absent++;
  }

  const result: Record<string, ReliabilityStats> = {};
  for (const [playerId, s] of Object.entries(acc)) {
    result[playerId] = {
      total_scrims: s.total,
      present_count: s.present,
      late_count: s.late,
      absent_count: s.absent,
      attendance_rate: s.total > 0
        ? Math.round(((s.present + s.late) / s.total) * 100)
        : 0,
      avg_late_minutes: s.lateMinutes.length > 0
        ? Math.round(s.lateMinutes.reduce((a, b) => a + b, 0) / s.lateMinutes.length)
        : null,
    };
  }
  return result;
}
