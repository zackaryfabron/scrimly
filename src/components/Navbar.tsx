"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-green-500">Scrim</span>ly
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <Link href="#features" className="hover:text-white transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">
            How it works
          </Link>
          <Link href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
          >
            Get started
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-gray-500 hover:text-white"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#0a0a0a] px-6 pb-4 pt-3 flex flex-col gap-3 text-sm font-medium text-gray-400">
          <Link href="#features" onClick={() => setMenuOpen(false)} className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" onClick={() => setMenuOpen(false)} className="hover:text-white transition-colors">How it works</Link>
          <Link href="#pricing" onClick={() => setMenuOpen(false)} className="hover:text-white transition-colors">Pricing</Link>
          <hr className="border-white/[0.06]" />
          <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
          <Link href="/signup" className="rounded-lg bg-green-600 px-4 py-2 text-center text-white font-semibold hover:bg-green-500 transition-colors">Get started</Link>
        </div>
      )}
    </nav>
  );
}
