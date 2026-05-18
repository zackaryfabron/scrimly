"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: `${username.trim().toLowerCase()}@scrimly.local`,
        password,
      });
      if (authError) {
        setError("Invalid username or password.");
        return;
      }
      window.location.href = "/roster";
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
          <h1 className="text-lg font-semibold text-white mb-6">Welcome back</h1>

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
                autoComplete="current-password"
                className="w-full rounded-lg bg-[#1a1a1a] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/25 transition-colors"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-4 mt-5 text-xs text-gray-600">
          <Link href="/auth/signup" className="hover:text-white transition-colors">
            Create a team
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
