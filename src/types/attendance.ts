export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRecord {
  id: string;
  scheduled_scrim_id: string;
  player_id: string;
  team_id: string;
  status: AttendanceStatus;
  late_minutes: number | null;
  marked_at: string;
  created_at: string;
}

export interface ReliabilityStats {
  total_scrims: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  attendance_rate: number;
  avg_late_minutes: number | null;
}
