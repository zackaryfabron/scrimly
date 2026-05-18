import type { ValorantMap, ValorantAgent } from "@/types/maps";

export async function getValorantMaps(): Promise<ValorantMap[]> {
  const res = await fetch("https://valorant-api.com/v1/maps", {
    next: { revalidate: 3600 },
  });
  const { data } = await res.json();
  return (data as Record<string, any>[])
    .filter((m) => m.coordinates && m.tacticalDescription)
    .map((m) => ({
      id: m.uuid as string,
      name: m.displayName as string,
      splash: m.splash as string,
      listViewIconTall: m.listViewIconTall as string,
      coordinates: m.coordinates as string,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getValorantAgents(): Promise<ValorantAgent[]> {
  const res = await fetch(
    "https://valorant-api.com/v1/agents?isPlayableCharacter=true",
    { next: { revalidate: 3600 } }
  );
  const { data } = await res.json();
  return (data as Record<string, any>[])
    .map((a) => ({
      id: a.uuid as string,
      name: a.displayName as string,
      icon: a.displayIconSmall as string,
      role: (a.role?.displayName ?? "Unknown") as string,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
