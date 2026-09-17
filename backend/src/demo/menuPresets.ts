import {
  familyCampMenuSeed,
} from "./familyCampMenu.js";

export const menuPresets = [
  familyCampMenuSeed,
] as const;

export function findMenuPreset(
  key: string,
) {
  return menuPresets.find(
    (preset) => preset.key === key,
  ) ?? null;
}
