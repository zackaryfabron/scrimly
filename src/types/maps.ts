export interface ValorantMap {
  id: string;
  name: string;
  splash: string;
  listViewIconTall: string;
  coordinates: string;
}

export interface ValorantAgent {
  id: string;
  name: string;
  icon: string;
  role: string;
}

export interface CompositionSlot {
  agent_id: string | null;
  agent_name: string | null;
  agent_icon: string | null;
  player_id: string | null;
  player_name: string | null;
}

export type CompType = "main" | "alternative";

export interface MapComposition {
  id?: string;
  map_id: string;
  composition_type: CompType;
  slots: CompositionSlot[];
}
