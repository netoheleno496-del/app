import { StyleSheet } from "react-native";

// Peixe Esperto — Dark-First Utility theme.
// Single dark theme (fintech betting ledger). Tokens mirror design_guidelines.json.
export const colors = {
  surface: "#0B1120",
  surfaceElevated: "#0F1A30",
  card: "#111A2E",
  cardAlt: "#0F172A",
  chip: "#1E293B",
  border: "#243149",
  borderStrong: "#334155",
  divider: "#1B2540",

  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  muted: "#94A3B8",
  dim: "#64748B",
  faint: "#475569",

  brand: "#2EBFAF", // teal — primary interactive
  onBrand: "#022C22",
  blue: "#3B82F6",
  purple: "#8B5CF6",

  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#38BDF8",
  pending: "#64748B",

  onDark: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const gradients = {
  primary: ["#8B5CF6", "#3B82F6"] as const,
  teal: ["#2EBFAF", "#3B82F6"] as const,
};

export const theme = { colors, spacing, radius, gradients };
export type Theme = typeof theme;

export function useTheme() {
  return theme;
}

export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (t: Theme) => T
) {
  const styles = StyleSheet.create(factory(theme));
  return () => styles;
}
