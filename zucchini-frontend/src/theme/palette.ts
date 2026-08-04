// Fixed-order categorical palette + reserved status palette.
// See dataviz skill reference: never cycle/reorder, never reuse status hues for series identity.
export const CATEGORICAL = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#4a3aa7", // violet
];

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  muted: "#898781",
};

/** Stable color assignment for an open-ended set of names (e.g. merchants), in fixed categorical order. */
export function colorForKey(key: string, knownOrder: string[]): string {
  const idx = knownOrder.indexOf(key);
  return CATEGORICAL[(idx >= 0 ? idx : knownOrder.length) % CATEGORICAL.length];
}
