"use client";

import Image from "next/image";
import { useState } from "react";
import type { ValorantAgent } from "@/types/maps";

const ROLES = ["All", "Duelist", "Initiator", "Controller", "Sentinel"] as const;

const ROLE_COLOURS: Record<string, string> = {
  Duelist:    "text-red-400",
  Initiator:  "text-yellow-400",
  Controller: "text-blue-400",
  Sentinel:   "text-purple-400",
};

interface AgentPickerProps {
  agents: ValorantAgent[];
  selectedAgentId: string | null;
  onSelect: (agent: ValorantAgent) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function AgentPicker({
  agents,
  selectedAgentId,
  onSelect,
  onClear,
  onClose,
}: AgentPickerProps) {
  const [roleFilter, setRoleFilter] = useState<string>("All");

  const filtered =
    roleFilter === "All" ? agents : agents.filter((a) => a.role === roleFilter);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.07] bg-[#111111] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-white">Select Agent</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click an agent to assign it to this slot
            </p>
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

        {/* Role filter */}
        <div className="flex gap-1.5 px-5 py-3 border-b border-white/[0.06] overflow-x-auto">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                roleFilter === role
                  ? "bg-green-600 text-white"
                  : `hover:bg-white/[0.06] ${role !== "All" ? ROLE_COLOURS[role] : "text-gray-500 hover:text-white"}`
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-5 gap-2 p-5 max-h-64 overflow-y-auto">
          {filtered.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelect(agent)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                selectedAgentId === agent.id
                  ? "bg-green-500/15 ring-1 ring-green-500/40"
                  : "hover:bg-white/[0.06]"
              }`}
            >
              <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-[#1a1a1a] ring-1 ring-white/[0.06]">
                <Image
                  src={agent.icon}
                  alt={agent.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <span className="text-[10px] text-gray-400 text-center leading-tight w-full truncate">
                {agent.name}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Clear slot
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white rounded-lg border border-white/[0.08] hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
