/**
 * API Std 650 §5.7 — shell, roof and bottom openings.
 *
 * Method implemented
 * ------------------
 * The reinforcement is checked by area replacement, the approach used for
 * openings in the shell (§5.7.2):
 *
 *     A_required = d · t_r
 *
 * where d is the finished opening diameter (neck bore) and t_r is the
 * *required* plate thickness at that location (design and hydrostatic test
 * conditions, including corrosion allowance).
 *
 * The area is provided by, and only by:
 *
 *   A_shell = (t_s − t_r) · d              excess plate thickness around the hole
 *   A_neck  = (t_n − t_rn) · h_eff         excess neck thickness, h_eff = t_s + min(projection, 5 t_n)
 *   A_pad   = 2 · w_pad · t_pad            reinforcing pad, two sides of the neck
 *
 * Credit limits used here are deliberately conservative and are stated in the
 * UI and in the report:
 *   - shell excess is credited over the opening width only (not over a wider
 *     shear-lag band),
 *   - neck excess is credited over the reinforcement zone 2.5 t_n each side of
 *     the shell, limited by the actual neck projection,
 *   - the pad is credited over its full radial width.
 *
 * Geometric opening limits checked:
 *   - openings not exceeding 60 mm (2-1/2 in.) nominal bore need no reinforcement,
 *   - 75 mm minimum clear distance from a horizontal shell joint,
 *   - 75 mm minimum clear distance between adjacent openings,
 *   - the reinforcing pad must fit within the shell course,
 *   - a roof manhole requires its reinforcing plate (Table 5.13a detail).
 *
 * NOTE: clause-level acceptance must be verified against a licensed copy of
 * API Std 650 (13th edition). The credit limits above are the ones this tool
 * applies; other accepted procedures may credit more area.
 */

import type { CheckResult, TankDesign } from "./api650";

/** Practical minimum neck wall adopted where Table 5.6a governs (mm). */
export const MINIMUM_NECK_WALL = 6;

export type OpeningType = "shell-nozzle" | "shell-manhole" | "roof-nozzle" | "roof-manhole";

export interface OpeningInput {
  id: string;
  tag: string;
  type: OpeningType;
  od: number; // neck outside diameter, mm
  neck: number; // neck wall thickness, mm
  projection: number; // neck projection beyond the plate, mm
  pad: boolean;
  padThickness: number; // mm
  padWidth: number; // radial width, mm
  elevation: number; // m above tank bottom (shell openings only)
  azimuth: number; // degrees, for spacing checks
  service: string;
}

export interface OpeningResult {
  input: OpeningInput;
  course: number | null;
  d: number; // finished opening, mm
  tr: number; // required plate thickness, mm
  ts: number; // actual plate thickness, mm
  trn: number; // required neck thickness, mm
  aReq: number; // mm²
  aShell: number;
  aNeck: number;
  aPad: number;
  aProvided: number;
  utilisation: number; // A_req / A_prov (≤ 1 passes)
  pass: boolean;
  exemption: boolean; // no reinforcement required (small opening)
  deficit: number; // mm² short, 0 when satisfied
  suggestedPadWidth: number; // mm, to close the deficit
  halfExtent: number; // vertically, mm (opening or pad radius)
  checks: CheckResult[];
}

/** Standard pipe outside diameters and common wall thicknesses (ASME B36.10). */
export const PIPE_SIZES: Array<{ nps: string; od: number; wall: number }> = [
  { nps: '2"', od: 60.3, wall: 3.91 },
  { nps: '3"', od: 88.9, wall: 5.49 },
  { nps: '4"', od: 114.3, wall: 6.02 },
  { nps: '6"', od: 168.3, wall: 7.11 },
  { nps: '8"', od: 219.1, wall: 8.18 },
  { nps: '10"', od: 273.0, wall: 9.27 },
  { nps: '12"', od: 323.9, wall: 10.31 },
  { nps: '16"', od: 406.4, wall: 12.7 },
  { nps: '20"', od: 508.0, wall: 12.7 },
  { nps: '24"', od: 610.0, wall: 12.7 },
];

/** Roof manhole dimensions after API 650 Table 5.13a (SI). */
export const ROOF_MANHOLE_SIZES = [
  { neckId: 500, cover: 650, boltCircle: 590, bolts: 16, hole: 515, padOd: 1050 },
  { neckId: 600, cover: 750, boltCircle: 690, bolts: 20, hole: 615, padOd: 1150 },
];

/** A selectable opening size. Sizes are quoted in inches (NPS) as on a P&ID. */
export interface OpeningSize {
  key: string;
  label: string;
  od: number; // mm
  neck: number; // mm
  padWidth?: number; // mm, standard reinforcing pad
}

/** Nozzle sizes in inches (ASME B36.10 pipe, wall = schedule 40). */
export const NOZZLE_SIZES: OpeningSize[] = PIPE_SIZES.map((pipe) => ({
  key: pipe.nps,
  label: `${pipe.nps} — ${pipe.od} mm OD`,
  od: pipe.od,
  neck: pipe.wall,
}));

/** Shell manhole sizes in inches (API 650 Table 5.13a bores). */
export const SHELL_MANHOLE_SIZES: OpeningSize[] = [
  { key: '20"', label: '20 in — 500 mm bore', od: 524, neck: 12, padWidth: 250 },
  { key: '24"', label: '24 in — 600 mm bore', od: 626, neck: 13, padWidth: 260 },
];

/** Roof manhole sizes in inches (API 650 Table 5.13a). */
export const ROOF_MANHOLE_SIZES_IN: OpeningSize[] = [
  { key: '20"', label: '20 in — 500 mm access', od: 516, neck: 8, padWidth: 275 },
  { key: '24"', label: '24 in — 600 mm access', od: 616, neck: 8, padWidth: 275 },
];

export function sizeOptionsFor(type: OpeningType): OpeningSize[] {
  switch (type) {
    case "shell-manhole":
      return SHELL_MANHOLE_SIZES;
    case "roof-manhole":
      return ROOF_MANHOLE_SIZES_IN;
    default:
      return NOZZLE_SIZES;
  }
}

/** Size key (inches) matching an outside diameter, or "custom". */
export function sizeKeyFor(type: OpeningType, od: number): string {
  const match = sizeOptionsFor(type).find((option) => Math.abs(option.od - od) < 0.6);
  return match ? match.key : "custom";
}

/** Human-readable size for tables: 8", 20", or the OD in mm when custom. */
export function sizeLabelFor(type: OpeningType, od: number): string {
  const key = sizeKeyFor(type, od);
  if (key !== "custom") return key;
  return `${od.toFixed(0)} mm`;
}

export const isRoofOpening = (type: OpeningType): boolean =>
  type === "roof-nozzle" || type === "roof-manhole";

export const openingTypeLabel = (type: OpeningType): string => {
  switch (type) {
    case "shell-manhole":
      return "Shell manhole";
    case "roof-nozzle":
      return "Roof nozzle";
    case "roof-manhole":
      return "Roof manhole";
    default:
      return "Shell nozzle";
  }
};

const fmt0 = (value: number): string => value.toFixed(0);
const fmt1 = (value: number): string => value.toFixed(1);

export function evaluateOpenings(design: TankDesign, openings: OpeningInput[]): OpeningResult[] {
  const D = design.input.diameter;
  const ca = design.input.corrosionAllowance;
  const roofExists = design.roof.plate > 0;

  const results: OpeningResult[] = openings.map((input) => {
    const roof = isRoofOpening(input.type);
    const course =
      roof
        ? null
        : design.courses.find(
            (item) => input.elevation >= item.bottom - 1e-9 && input.elevation <= item.top + 1e-9,
          ) ?? null;

    const ts = roof ? design.roof.plate : course?.tSelected ?? design.courses[0].tSelected;
    // Required thickness: design + test condition with CA for shell plates; the
    // 5 mm + CA minimum for roof plates.
    const tr = roof ? Math.max(5 + ca, 0.1) : Math.max(course?.tRequired ?? 0.1, 0.1);

    const d = Math.max(input.od - 2 * input.neck, 1);
    const head = roof ? 0 : Math.max(design.input.designLevel - (course?.bottom ?? 0) - 0.3, 0);
    const pressure = 0.00981 * head * design.input.sg; // MPa
    // Required neck wall: membrane thickness for its own bore plus a 6 mm
    // practical minimum pending the tabulated nozzle walls of Table 5.6a.
    const trn = Math.max(
      (pressure * d) / (2 * design.sd * Math.max(design.input.jointEfficiency, 0.4)),
      MINIMUM_NECK_WALL,
    );

    const hEff = ts + Math.min(Math.max(input.projection, 0), 5 * input.neck);
    const aReq = d * tr;
    const aShell = Math.max(ts - tr, 0) * d;
    const aNeck = Math.max(input.neck - trn, 0) * hEff;
    const aPad = input.pad ? 2 * Math.max(input.padWidth, 0) * Math.max(input.padThickness, 0) : 0;
    const aProvided = aShell + aNeck + aPad;

    const exemption = d <= 60;
    const deficit = Math.max(aReq - aProvided, 0);
    const padReference = Math.max(input.padThickness || ts, 1);
    const suggestedPadWidth = deficit > 0 ? deficit / (2 * padReference) : 0;
    const halfExtent = d / 2 + (input.pad ? input.padWidth : 0);

    const checks: CheckResult[] = [];

    checks.push({
      id: `${input.id}-area`,
      label: `${input.tag} reinforcement area`,
      value: `${fmt0(aProvided)} mm²`,
      limit: `${fmt0(aReq)} mm² required`,
      pass: aProvided >= aReq || exemption,
      clause: "§5.7.2",
      note: exemption
        ? "Opening ≤ 60 mm: reinforcement not required."
        : deficit > 0
          ? `Short by ${fmt0(deficit)} mm²; a pad at least ${fmt0(suggestedPadWidth)} mm wide (at ${fmt1(
              padReference,
            )} mm thick) would close the deficit.`
          : undefined,
    });

    checks.push({
      id: `${input.id}-neck`,
      label: `${input.tag} neck thickness`,
      value: `${fmt1(input.neck)} mm`,
      limit: `≥ ${fmt1(trn)} mm`,
      pass: input.neck >= trn - 1e-6,
      clause: "§5.7.2",
    });

    if (!roof && course) {
      const girthClearance =
        Math.min(input.elevation - course.bottom, course.top - input.elevation) * 1000 -
        halfExtent;
      checks.push({
        id: `${input.id}-girth`,
        label: `${input.tag} clearance to horizontal joint`,
        value: `${fmt0(girthClearance)} mm`,
        limit: "≥ 75 mm",
        pass: girthClearance >= 75,
        clause: "§5.7.1",
        note:
          girthClearance < 75
            ? "Move the opening (or reduce the pad) so the reinforcement stays clear of the course girth seam."
            : undefined,
      });
      checks.push({
        id: `${input.id}-course`,
        label: `${input.tag} reinforcement fits the course`,
        value: `${fmt0(2 * halfExtent)} mm high`,
        limit: `${fmt0(course.height * 1000)} mm course`,
        pass: 2 * halfExtent <= course.height * 1000,
        clause: "§5.7.1",
      });
    }

    if (roof) {
      checks.push({
        id: `${input.id}-roof`,
        label: `${input.tag} roof available`,
        value: roofExists ? "yes" : "no",
        limit: "roof required",
        pass: roofExists,
        clause: "§5.7.3",
      });
      if (input.type === "roof-manhole") {
        checks.push({
          id: `${input.id}-roof-pad`,
          label: `${input.tag} roof manhole reinforcing plate`,
          value: input.pad ? `${fmt0(input.padWidth)} mm wide` : "none",
          limit: "required (Table 5.13a)",
          pass: input.pad,
          clause: "§5.7.3",
        });
      }
    }

    return {
      input,
      course: course?.index ?? null,
      d,
      tr,
      ts,
      trn,
      aReq,
      aShell,
      aNeck,
      aPad,
      aProvided,
      utilisation: aReq > 0 ? aProvided / aReq : 1,
      pass: checks.every((check) => check.pass),
      exemption,
      deficit,
      suggestedPadWidth,
      halfExtent,
      checks,
    };
  });

  // --- spacing between adjacent shell openings ------------------------------
  const shellResults = results.filter((result) => !isRoofOpening(result.input.type));
  const minEdge = new Map<string, number>();

  for (let i = 0; i < shellResults.length; i += 1) {
    for (let j = i + 1; j < shellResults.length; j += 1) {
      const a = shellResults[i];
      const b = shellResults[j];
      let delta = Math.abs(a.input.azimuth - b.input.azimuth) % 360;
      if (delta > 180) delta = 360 - delta;
      const chord = 2 * (D / 2) * Math.sin((delta * Math.PI) / 360) * 1000; // mm
      const edge = chord - a.halfExtent - b.halfExtent;
      minEdge.set(a.input.id, Math.min(minEdge.get(a.input.id) ?? Infinity, edge));
      minEdge.set(b.input.id, Math.min(minEdge.get(b.input.id) ?? Infinity, edge));
    }
  }

  for (const result of shellResults) {
    const edge = minEdge.get(result.input.id);
    if (edge === undefined || !Number.isFinite(edge)) continue;
    result.checks.push({
      id: `${result.input.id}-spacing`,
      label: `${result.input.tag} clearance to adjacent openings`,
      value: `${fmt0(edge)} mm`,
      limit: "≥ 75 mm",
      pass: edge >= 75,
      clause: "§5.7.1",
    });
    result.pass = result.checks.every((check) => check.pass);
  }

  return results;
}

export function openingFailures(results: OpeningResult[]): number {
  return results.reduce(
    (count, result) => count + result.checks.filter((check) => !check.pass).length,
    0,
  );
}
