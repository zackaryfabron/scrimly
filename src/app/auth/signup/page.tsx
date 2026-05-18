"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, teamName: teamName.trim() }),
      });
      if (!res.ok) {
        let message = "Something went wrong.";
        try {
          const json = await res.json();
          message = json.error ?? message;
        } catch {}
        setError(message);
        return;
      }
      router.push("/roster");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-green-500">Scrim</span>ly
          </Link>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-8">
          <h1 className="text-lg font-semibold text-white mb-1">Create your team</h1>
          <p className="text-xs text-gray-500 mb-6">
            You'll get an invite code to share with teammates.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                required
                autoComplete="username"
                className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/25 transition-colors"
              />
              <p className="text-[10px] text-gray-700 mt-1">
                3–20 characters, letters/numbers/underscores
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/25 transition-colors"
              />
              <p className="text-[10px] text-gray-700 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Team name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="MQ Esports"
                required
                className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/25 transition-colors"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating team…" : "Create team"}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-4 mt-5 text-xs text-gray-600">
          <Link href="/auth/login" className="hover:text-white transition-colors">
            Already have an account?
          </Link>
          <span>·</span>
          <Link href="/auth/join" className="hover:text-white transition-colors">
            Join with invite
          </Link>
        </div>
      </div>
    </div>
  );
}
