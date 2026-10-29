import { createContext } from "react";
import type { PublicCharacter } from "../authoring/runtime";
import type { PlayerProfile } from "./profile";
export const CampusContext = createContext<{
  profile: PlayerProfile;
  cast?: PublicCharacter[];
} | null>(null);
