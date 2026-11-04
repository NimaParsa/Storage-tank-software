export const fmt = (value: number, digits = 2): string => {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const fmtInt = (value: number): string => fmt(value, 0);

export const fmtMass = (kg: number): string => {
  if (kg >= 1000) return `${fmt(kg / 1000, 1)} t`;
  return `${fmt(kg, 0)} kg`;
};

export const signed = (value: number, digits = 2): string =>
  `${value >= 0 ? "+" : "−"}${fmt(Math.abs(value), digits)}`;
