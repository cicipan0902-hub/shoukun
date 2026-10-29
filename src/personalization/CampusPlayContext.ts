import { createContext } from "react";
import type { Work, Runtime } from "../schema";
export type ChatDestination = { view?: string; thread?: string; itemId?: string };
export const CampusPlayContext = createContext<{
  work: Work;
  state: Runtime;
  read: (id: string) => void;
  choose: (id: string) => void;
  navigate: (app: string, destination?: ChatDestination) => void;
  event: (event: string, target: string) => void;
} | null>(null);
