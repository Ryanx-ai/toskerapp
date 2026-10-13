"use client";
import { createContext, useContext } from "react";
export const MapWorkspaceActions = createContext<{ expanded: boolean; toggle(): void } | null>(null);
export const useMapWorkspaceActions = () => useContext(MapWorkspaceActions);
