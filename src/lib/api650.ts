/**
 * API Std 650 — welded steel storage tank design engine.
 *
 * Implemented clauses (13th edition numbering, with 11th/12th edition
 * equivalents noted):
 *
 *   §5.4.1   bottom plate minimum thickness
 *   §5.5     annular bottom plates, Table 5-1a + minimum radial width
 *   §5.6.1.1 minimum nominal shell thickness (Table 5-1)
 *   §5.6.3.2 one-foot method shell thickness
 *   §5.6.3.3 variable-design-point method shell thickness
 *   §5.9.7   top and intermediate wind girders, transformed shell width
 *   §5.10.2  roof plate minimum thickness, roof design loads
 *   §5.10.5  self-supporting cone roof plate thickness
 *   §5.11.2  wind overturning stability
 *   Annex E  seismic hoop stress, shell compression and anchorage screening
 *
 * Everything is SI: metres, millimetres, MPa, kN, kg.
 */

export const GRAVITY = 9.81;
export const STEEL_DENSITY = 7850; // kg/m3
export const WATER_DENSITY = 1000; // kg/m3

/** Mass of plate per square metre per millimetre of thickness (kg/m2/mm). */
export const PLATE_MASS_PER_MM = 7.85;

export type RoofType = "none" | "supported-cone" | "self-supporting-cone";
export type ShellMethod = "one-foot" | "vdp";
export type NoticeLevel = "error" | "warning" | "info";
export type Governing = "design" | "test" | "minimum";

export interface Notice {
  level: NoticeLevel;
  clause: string;
  message: string;
}

export interface Material {
  id: string;
  label: string;
  sy: number; // minimum yield strength, MPa
  su: number; // minimum tensile strength, MPa
}

/** API 650 Table 5-2a material group (common plate steels). */
export const MATERIALS: Material[] = [
  { id: "A283C", label: "ASTM A283 Gr. C", sy: 205, su: 380 },
  { id: "A285C", label: "ASTM A285 Gr. C", sy: 205, su: 380 },
  { id: "A36", label: "ASTM A36", sy: 250, su: 400 },
  { id: "A516-60", label: "ASTM A516 Gr. 60", sy: 220, su: 415 },
  { id: "A516-65", label: "ASTM A516 Gr. 65", sy: 240, su: 450 },
  { id: "A516-70", label: "ASTM A516 Gr. 70", sy: 260, su: 485 },
  { id: "A537-1", label: "ASTM A537 Cl. 1", sy: 345, su: 485 },
  { id: "A573-70", label: "ASTM A573 Gr. 70", sy: 290, su: 485 },
  { id: "custom", label: "Custom steel", sy: 250, su: 400 },
];

/** Commercial plate thicknesses offered by the plate-rounding routine (mm). */
export const PLATE_LIST = [5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40, 45];

/**
 * API 650 Table 5-1a (SI) — annular bottom-plate thickness (mm), excluding
 * corrosion allowance.
 */
const ANNULAR_STRESS_COLUMNS = [190, 210, 220, 250];
const ANNULAR_ROWS: Array<{ maxShell: number; values: number[] }> = [
  { maxShell: 19, values: [6, 6, 7, 9] },
  { maxShell: 25, values: [6, 7, 10, 11] },
  { maxShell: 32, values: [6, 9, 12, 14] },
  { maxShell: 40, values: [8, 11, 14, 17] },
  { maxShell: 45, values: [9, 13, 16, 19] },
];

export interface SeismicInput {
  enabled: boolean;
  sds: number; // MCE design spectral acceleration, short periods (g)
  sd1: number; // MCE design spectral acceleration, 1 s (g)
  tl: number; // long-period transition, s
  importance: number; // Table E-5 importance factor
  ri: number; // Table E-4 impulsive response modification factor
  rc: number; // Table E-4 convective response modification factor
}

export interface TankInput {
  projectName: string;
  tankTag: string;
  diameter: number; // m
  shellHeight: number; // m
  designLevel: number; // m above tank bottom
  courseHeight: number; // target shell course height, m
  productName: string;
  sg: number; // design specific gravity
  corrosionAllowance: number; // mm
  materialId: string;
  sy: number; // MPa (used when materialId === "custom")
  su: number; // MPa
  jointEfficiency: number; // 1.0 for new API 650 tanks
  shellMethod: ShellMethod;
  windSpeed: number; // 3-second gust, km/h
  roofLive: number; // kPa
  snow: number; // kPa
  externalPressure: number; // kPa
  roofType: RoofType;
  roofSlope: number; // degrees from horizontal
  useAnnular: boolean;
  seismic: SeismicInput;
}

export interface RawThickness {
  td: number; // design (product) thickness, mm
  tt: number; // hydrostatic test thickness, mm
}

export interface VdpThickness extends RawThickness {
  xe: number; // mm, design point above the bottom of the course
}

export interface CourseResult {
  index: number;
  bottom: number; // m
  top: number; // m
  height: number; // m
  H: number; // m of liquid above the bottom of the course
  head: number; // m (H - 0.3) used in the equations
  oneFoot: RawThickness;
  vdp: VdpThickness | null;
  td: number;
  tt: number;
  tRequired: number;
  tSelected: number;
  governing: Governing;
  stressProduct: number; // MPa in the selected plate, product condition
  stressTest: number; // MPa in the selected plate, water test
  weight: number; // kg
}

export interface SeismicCourseResult {
  index: number;
  Y: number; // m below the design liquid surface
  ni: number; // N/mm
  nc: number; // N/mm
  nh: number; // N/mm
  sigmaT: number; // MPa
  allowable: number; // MPa
  ratio: number;
}

export interface SeismicResult {
  ks: number;
  tc: number;
  ai: number;
  ac: number;
  av: number;
  wi: number; // N
  wc: number; // N
  xi: number; // m
  xc: number; // m
  xis: number; // m
  xcs: number; // m
  mrw: number; // N·m
  ms: number; // N·m
  baseShear: number; // N
  courses: SeismicCourseResult[];
  maxHoopRatio: number;
  wt: number; // N/m
  sigmaC: number; // MPa
  fc: number; // MPa
  compressionRatio: number;
  anchorage: number; // N/m, required minimum anchorage resistance
  anchorageRequired: boolean;
}

export interface CheckResult {
  id: string;
  label: string;
  value: string;
  limit: string;
  pass: boolean;
  clause: string;
  note?: string;
}

export interface TankDesign {
  input: TankInput;
  material: Material;
  sd: number;
  st: number;
  tMin: number;
  courses: CourseResult[];
  shell: {
    plateWidth: number;
    avgThickness: number;
    weight: number; // kg
    area: number; // m2
    height: number;
  };
  bottom: {
    plate: number;
    annularPlate: number;
    annularWidth: number;
    stress: number; // MPa used for Table 5-1a
    weight: number; // base bottom plates, kg
    annularWeight: number; // extra mass of the annular ring, kg
    area: number; // m2
  };
  roof: {
    plate: number;
    rise: number;
    slant: number;
    area: number;
    weight: number;
    deadLoad: number;
    liveLoad: number;
    snowLoad: number;
    externalPressure: number;
    t1: number;
    t2: number;
    T: number;
  };
  wind: {
    q: number;
    force: number;
    moment: number;
    resisting: number;
    stable: boolean;
    zRequired: number;
    h1: number;
    wtr: number;
    intermediateGirders: number;
    girderElevations: number[];
    topThickness: number;
  };
  weights: {
    shell: number;
    bottom: number;
    annular: number;
    roof: number;
    total: number; // empty weight, kg
    product: number; // product at design level, kg
    water: number; // hydrostatic test water at design level, kg
    operating: number; // empty + product, kg
    hydroTest: number; // empty + water, kg
  };
  volume: number;
  seismic: SeismicResult | null;
  notices: Notice[];
  checks: CheckResult[];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export const round = (value: number, digits = 2): number => {
  const f = Math.pow(10, digits);
  return Math.round(value * f) / f;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Round a required thickness up to the next commercial plate. */
export function roundUpToPlate(t: number): number {
  for (const plate of PLATE_LIST) {
    if (plate >= t - 1e-9) return plate;
  }
  return Math.ceil(t / 5) * 5;
}

/** API 650 Table 5-2a: Sd = min(2/3 Sy, 2/5 Su), St = min(3/4 Sy, 3/7 Su). */
export function allowableStresses(sy: number, su: number): { sd: number; st: number } {
  return {
    sd: Math.round(Math.min((2 / 3) * sy, (2 / 5) * su)),
    st: Math.round(Math.min((3 / 4) * sy, (3 / 7) * su)),
  };
}

/** API 650 Table 5-1 (5.6.1.1) minimum nominal shell thickness, mm. */
export function minimumShellThickness(diameter: number): number {
  if (diameter < 15) return 5;
  if (diameter < 36) return 6;
  if (diameter < 60) return 8;
  return 10;
}

export interface AnnularLookup {
  thickness: number;
  stressColumn: number;
  exceeded: boolean;
}

/** API 650 Table 5-1a annular plate thickness, excluding corrosion allowance. */
export function annularPlateThickness(shellThickness: number, stress: number): AnnularLookup {
  const row =
    ANNULAR_ROWS.find((r) => shellThickness <= r.maxShell) ?? ANNULAR_ROWS[ANNULAR_ROWS.length - 1];
  let col = ANNULAR_STRESS_COLUMNS.findIndex((s) => stress <= s);
  const exceeded = col === -1;
  if (col === -1) col = ANNULAR_STRESS_COLUMNS.length - 1;
  return {
    thickness: row.values[col],
    stressColumn: ANNULAR_STRESS_COLUMNS[col],
    exceeded,
  };
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

/** §5.6.3.2 one-foot method. */
export function oneFootThickness(
  H: number,
  D: number,
  sg: number,
  sd: number,
  st: number,
  ca: number,
  jointEfficiency: number,
): RawThickness {
  const head = Math.max(H - 0.3, 0);
  return {
    td: (4.9 * D * head * sg) / (sd * jointEfficiency) + ca,
    tt: (4.9 * D * head) / (st * jointEfficiency),
  };
}

/**
 * §5.6.3.3 variable-design-point method, bottom course.
 * t1 = [1.06 - (0.0696 D/H) sqrt(H G/Sd)] * (4.9 H D G/Sd) + CA
 */
function vdpBottomCourse(
  H: number,
  D: number,
  sg: number,
  sd: number,
  st: number,
  ca: number,
  jointEfficiency: number,
): VdpThickness {
  const sdE = sd * jointEfficiency;
  const stE = st * jointEfficiency;
  const factor = (S: number, specificGravity: number): number => {
    const correction = 1.06 - (0.0696 * D) / H * Math.sqrt((H * specificGravity) / S);
    return Math.max(correction, 0) * ((4.9 * H * D * specificGravity) / S);
  };
  return { td: factor(sdE, sg) + ca, tt: factor(stE, 1), xe: 0 };
}

/**
 * §5.6.3.3 variable-design-point method, courses above the bottom ring.
 * The design point sits x_e above the bottom of the course, computed from the
 * shell stiffness ratio K = t_lower / t_trial.
 */
function vdpUpperCourse(
  H: number,
  D: number,
  sg: number,
  sd: number,
  st: number,
  ca: number,
  jointEfficiency: number,
  lowerRequired: number,
): VdpThickness {
  const trial = oneFootThickness(H, D, sg, sd, st, ca, jointEfficiency);
  const tu = Math.max(trial.td, trial.tt);
  const tL = Math.max(lowerRequired, tu);
  const K = tu > 0 ? tL / tu : 1;
  const C = K > 1 ? (K * (K - 1)) / (1 + Math.pow(K, 1.5)) : 0;
  const R = 500 * D; // radius, mm
  const x1 = 0.61 * Math.sqrt(R * tu) + 320 * C * H;
  const x2 = 1000 * C * H;
  const x3 = 1.22 * Math.sqrt(R * tu);
  const xe = Math.min(x1, x2, x3); // mm
  const head = Math.max(H - xe / 1000, 0);
  return {
    td: (4.9 * D * head * sg) / (sd * jointEfficiency) + ca,
    tt: (4.9 * D * head) / (st * jointEfficiency),
    xe,
  };
}

/* -------------------------------------------------------------------------- */
/* Design                                                                     */
/* -------------------------------------------------------------------------- */

export function designTank(rawInput: TankInput): TankDesign {
  const notices: Notice[] = [];
  const input: TankInput = { ...rawInput };
  const add = (level: NoticeLevel, clause: string, message: string) =>
    notices.push({ level, clause, message });

  // --- input sanitation -----------------------------------------------------
  const D = clamp(input.diameter, 1, 120);
  const shellHeight = clamp(input.shellHeight, 1, 60);
  if (D !== input.diameter) add("warning", "§5.6", "Nominal diameter clamped to 1–120 m.");
  if (shellHeight !== input.shellHeight) add("warning", "§5.6", "Shell height clamped to 1–60 m.");

  let designLevel = clamp(input.designLevel, 0.1, shellHeight + 0.5);
  if (designLevel > shellHeight) {
    add(
      "warning",
      "§5.6.3.1",
      `Design liquid level (${designLevel.toFixed(2)} m) is above the shell top (${shellHeight.toFixed(
        2,
      )} m). The one-foot equations are evaluated at the shell top; check freeboard and overflow provisions.`,
    );
    designLevel = Math.min(designLevel, shellHeight);
  }

  const sg = clamp(input.sg, 0.3, 2.0);
  const ca = Math.max(input.corrosionAllowance, 0);
  const jointEfficiency = clamp(input.jointEfficiency, 0.4, 1);
  const material =
    MATERIALS.find((m) => m.id === input.materialId) ?? MATERIALS[MATERIALS.length - 1];
  const sy = material.id === "custom" ? Math.max(input.sy, 100) : material.sy;
  const su = material.id === "custom" ? Math.max(input.su, 200) : material.su;
  const { sd, st } = allowableStresses(sy, su);
  const tMin = minimumShellThickness(D);

  if (jointEfficiency < 1) {
    add(
      "info",
      "§5.6.3.2",
      `Joint efficiency E = ${jointEfficiency.toFixed(2)} applied to the shell equations. New API 650 tanks normally use E = 1.0; lower values belong to API 653 assessments.`,
    );
  }

  // --- shell courses --------------------------------------------------------
  const targetCourse = Math.max(input.courseHeight, 0.5);
  const nCourses = Math.max(1, Math.ceil(shellHeight / targetCourse - 1e-9));
  const plateWidth = shellHeight / nCourses;
  if (plateWidth < 1.8) {
    add(
      "warning",
      "§5.6.1.2",
      `Shell plate width ${(plateWidth * 1000).toFixed(0)} mm is below the 1800 mm minimum. Reduce the number of courses or increase the shell height.`,
    );
  }

  const courses: CourseResult[] = [];
  let previousRequired = 0;

  for (let i = 1; i <= nCourses; i += 1) {
    const bottom = (i - 1) * plateWidth;
    const top = i * plateWidth;
    const H = Math.max(designLevel - bottom, 0);
    const head = Math.max(H - 0.3, 0);

    const oneFoot = oneFootThickness(H, D, sg, sd, st, ca, jointEfficiency);
    let vdp: VdpThickness | null = null;
    if (H > 0.3) {
      vdp =
        i === 1
          ? vdpBottomCourse(H, D, sg, sd, st, ca, jointEfficiency)
          : vdpUpperCourse(H, D, sg, sd, st, ca, jointEfficiency, previousRequired);
    }

    const chosen = input.shellMethod === "vdp" && vdp ? vdp : oneFoot;
    const td = Math.max(chosen.td, 0);
    const tt = Math.max(chosen.tt, 0);
    const tRequired = Math.max(td, tt, tMin);
    const tSelected = roundUpToPlate(tRequired);
    const governing: Governing =
      Math.abs(tRequired - tMin) < 1e-9 && tMin >= td && tMin >= tt
        ? "minimum"
        : tt >= td
          ? "test"
          : "design";

    const availableForProduct = Math.max(tSelected - ca, 0.1);
    courses.push({
      index: i,
      bottom,
      top,
      height: plateWidth,
      H,
      head,
      oneFoot,
      vdp,
      td,
      tt,
      tRequired,
      tSelected,
      governing,
      stressProduct: (4.9 * D * head * sg) / availableForProduct,
      stressTest: (4.9 * D * head) / tSelected,
      weight:
        Math.PI *
        (D + tSelected / 1000) *
        plateWidth *
        (tSelected / 1000) *
        STEEL_DENSITY,
    });
    previousRequired = tRequired;
  }

  const shellWeight = courses.reduce((sum, c) => sum + c.weight, 0);
  const shellArea = courses.reduce((sum, c) => sum + Math.PI * D * c.height, 0);
  const avgThickness =
    courses.reduce((sum, c) => sum + c.tSelected * c.height, 0) / shellHeight;

  if (input.shellMethod === "vdp") {
    add(
      "info",
      "§5.6.3.3",
      "Shell sized with the variable-design-point method. API 650 permits this as an alternative to the one-foot method; review the course-to-course thickness steps against fabrication and inspection requirements.",
    );
  }

  // --- bottom and annular plates -------------------------------------------
  const bottomRaw = 6 + ca; // §5.4.1: 6 mm nominal exclusive of CA
  const bottomPlate = roundUpToPlate(bottomRaw);
  const firstCourse = courses[0];
  const annularStress = Math.max(
    (4.9 * D * Math.max(designLevel - 0.3, 0) * sg) / Math.max(firstCourse.tSelected - ca, 0.1),
    (4.9 * D * Math.max(designLevel - 0.3, 0)) / firstCourse.tSelected,
  );
  const annularLookup = annularPlateThickness(firstCourse.tSelected, annularStress);
  if (annularLookup.exceeded) {
    add(
      "warning",
      "Table 5-1a",
      `First-course stress ${annularStress.toFixed(0)} MPa exceeds the highest Table 5-1a column (250 MPa). Use the thickest tabulated annular plate and review the bottom design with the Purchaser.`,
    );
  }
  const annularRaw = annularLookup.thickness + ca;
  const annularPlate = input.useAnnular ? Math.max(roundUpToPlate(annularRaw), bottomPlate) : 0;
  const annularWidth = input.useAnnular
    ? Math.max(600, Math.ceil((215 * annularPlate) / Math.sqrt(Math.max(designLevel * sg, 0.1)) / 10) * 10)
    : 0;

  // --- roof ----------------------------------------------------------------
  const roofLive = Math.max(input.roofLive, 0);
  const snowLoad = Math.max(input.snow, 0);
  const pe = Math.max(input.externalPressure, 0);
  const liveGoverning = Math.max(roofLive, snowLoad);
  const slopeRad = (clamp(input.roofSlope, 0.5, 45) * Math.PI) / 180;
  const roofRise = input.roofType === "none" ? 0 : (D / 2) * Math.tan(slopeRad);
  const roofSlant = input.roofType === "none" ? 0 : D / 2 / Math.cos(slopeRad);
  const roofArea = input.roofType === "none" ? 0 : Math.PI * (D / 2) * roofSlant;

  let roofPlate = 0;
  let roofDead = 0;
  let t1Load = 0;
  let t2Load = 0;
  let roofLoad = 0;

  if (input.roofType === "supported-cone") {
    roofPlate = roundUpToPlate(5 + ca); // §5.10.2.2 minimum 5 mm exclusive of CA
    roofDead = PLATE_MASS_PER_MM * roofPlate * GRAVITY * 0.001; // kPa
    t1Load = roofDead + liveGoverning + 0.4 * pe;
    t2Load = roofDead + pe + 0.4 * liveGoverning;
    roofLoad = Math.max(t1Load, t2Load);
    if (input.roofSlope < 3.5) {
      add(
        "warning",
        "§5.10.2.2",
        "Supported cone roof slope is flatter than 1:16 (3.6°). API 650 requires a slope of at least 1 in 16 for roof drainage.",
      );
    }
  } else if (input.roofType === "self-supporting-cone") {
    let t = 6;
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const dl = PLATE_MASS_PER_MM * t * GRAVITY * 0.001;
      const T = Math.max(dl + liveGoverning + 0.4 * pe, dl + pe + 0.4 * liveGoverning);
      const tNew = (D / (4.8 * Math.sin(slopeRad))) * Math.sqrt(T / 2.2) + ca;
      if (Math.abs(tNew - t) < 0.01) {
        t = tNew;
        break;
      }
      t = tNew;
    }
    roofPlate = roundUpToPlate(t);
    roofDead = PLATE_MASS_PER_MM * roofPlate * GRAVITY * 0.001;
    t1Load = roofDead + liveGoverning + 0.4 * pe;
    t2Load = roofDead + pe + 0.4 * liveGoverning;
    roofLoad = Math.max(t1Load, t2Load);

    if (input.roofSlope < 9.5 || input.roofSlope > 37) {
      add(
        "warning",
        "§5.10.5.1",
        "Self-supporting cone roofs are limited to a slope between 9.5° and 37° from horizontal.",
      );
    }
    if (t > 13) {
      add(
        "warning",
        "§5.10.5.1",
        `Required roof plate ${t.toFixed(1)} mm exceeds the 13 mm limit for self-supporting cone roofs at this diameter. Use a supported cone roof, a dome roof or add rafters.`,
      );
    }
  } else {
    add("info", "§5.9.6", "Open-top tank: a top wind girder is mandatory (see §5.9.6).");
  }

  const roofWeight = roofArea * (roofPlate / 1000) * STEEL_DENSITY;

  // --- wind ----------------------------------------------------------------
  const windSpeed = clamp(input.windSpeed, 30, 300); // km/h
  const q = (0.613 * Math.pow(windSpeed / 3.6, 2)) / 1000; // kPa, 3-s gust
  const cf = 0.8; // force coefficient, cylindrical shell (ASCE 7 / §5.2.1(k))
  const windForce = cf * q * D * (shellHeight + roofRise * 0.5); // kN
  const windMoment = windForce * ((shellHeight + roofRise) / 2); // kN·m

  const topThickness = courses[courses.length - 1].tSelected;
  const zRequired = ((D * D * shellHeight) / 17) * Math.pow(windSpeed / 190, 2); // cm3
  const h1 =
    ((9.47 * topThickness * Math.pow(topThickness / D, 1.5)) * Math.pow(190 / windSpeed, 2));
  let wtr = 0;
  for (const course of courses) {
    wtr += course.height * Math.pow(topThickness / course.tSelected, 2.5);
  }

  const segments = Math.max(1, Math.ceil(wtr / h1));
  const intermediateGirders = segments - 1;
  const girderElevations: number[] = [];
  if (intermediateGirders > 0) {
    const targetDepths: number[] = [];
    for (let k = 1; k < segments; k += 1) targetDepths.push((k * wtr) / segments);
    let accumulated = 0;
    for (let c = courses.length - 1; c >= 0; c -= 1) {
      const course = courses[c];
      const ratio = Math.pow(topThickness / course.tSelected, 2.5);
      const transformed = course.height * ratio;
      for (const depth of targetDepths) {
        if (depth > accumulated && depth <= accumulated + transformed) {
          const consumed = (depth - accumulated) / ratio;
          girderElevations.push(round(course.top - consumed, 2));
        }
      }
      accumulated += transformed;
    }
    girderElevations.sort((a, b) => a - b);
  }

  if (h1 < plateWidth) {
    add(
      "warning",
      "§5.9.7.2",
      `The maximum unstiffened shell height H1 = ${h1.toFixed(2)} m is less than one course height. Provide intermediate wind girders as scheduled, or increase the top-course thickness.`,
    );
  }

  // --- weights -------------------------------------------------------------
  const bottomArea = Math.PI * Math.pow(D / 2, 2);
  const bottomWeight = bottomArea * (bottomPlate / 1000) * STEEL_DENSITY;
  // The annular ring replaces the outer band of bottom plate; only its extra
  // thickness adds mass.
  const annularWeight =
    input.useAnnular && annularPlate > bottomPlate
      ? Math.PI *
        (D - annularWidth / 1000) *
        (annularWidth / 1000) *
        ((annularPlate - bottomPlate) / 1000) *
        STEEL_DENSITY
      : 0;
  const totalWeight = shellWeight + bottomWeight + annularWeight + roofWeight;
  const productWeight = bottomArea * designLevel * sg * WATER_DENSITY;
  const waterWeight = bottomArea * designLevel * WATER_DENSITY;
  const volume = bottomArea * designLevel;

  const resisting = ((totalWeight * GRAVITY) / 1000) * (D / 2) * (2 / 3); // kN·m
  const stable = windMoment <= resisting;

  // --- seismic screening (Annex E) -----------------------------------------
  let seismic: SeismicResult | null = null;
  if (input.seismic.enabled) {
    seismic = seismicScreening({
      D,
      H: designLevel,
      sg,
      sd,
      sy,
      ca,
      courses,
      shellWeight,
      shellHeight,
      roofWeight,
      roofRise,
      t1: firstCourse.tSelected,
      input: input.seismic,
    });
    if (seismic.anchorageRequired) {
      add(
        "warning",
        "§E.6.2.1.2",
        `Anchorage is required: minimum anchorage resistance w_ab = ${seismic.anchorage.toFixed(
          0,
        )} N/m. Design anchor bolts, chairs and the foundation for the Annex E loads.`,
      );
    }
  }

  // --- checks --------------------------------------------------------------
  const checks: CheckResult[] = [];
  const maxProductStress = Math.max(...courses.map((c) => c.stressProduct));
  checks.push({
    id: "shell-min",
    label: "Shell courses ≥ minimum nominal thickness",
    value: `${Math.min(...courses.map((c) => c.tSelected)).toFixed(0)} mm`,
    limit: `≥ ${tMin} mm`,
    pass: courses.every((c) => c.tSelected >= tMin),
    clause: "§5.6.1.1 / Table 5-1",
  });
  checks.push({
    id: "plate-width",
    label: "Shell plate width",
    value: `${(plateWidth * 1000).toFixed(0)} mm`,
    limit: "≥ 1800 mm",
    pass: plateWidth >= 1.8,
    clause: "§5.6.1.2",
  });
  checks.push({
    id: "shell-stress",
    label: "Bottom-course product stress (with CA deducted)",
    value: `${maxProductStress.toFixed(0)} MPa`,
    limit: `Sd = ${sd} MPa`,
    pass: maxProductStress <= sd * 1.35,
    clause: "§5.6.3.2",
    note: "Reported for information: the stress rises as the corrosion allowance is consumed.",
  });
  if (input.roofType === "self-supporting-cone") {
    checks.push({
      id: "roof-limit",
      label: "Self-supporting cone roof plate",
      value: `${roofPlate.toFixed(0)} mm`,
      limit: "≤ 13 mm",
      pass: roofPlate <= 13,
      clause: "§5.10.5.1",
    });
  }
  checks.push({
    id: "wind-overturning",
    label: "Wind overturning stability",
    value: `${windMoment.toFixed(0)} kN·m`,
    limit: `${resisting.toFixed(0)} kN·m`,
    pass: stable,
    clause: "§5.11.2",
    note: stable ? undefined : "Anchor the tank or increase the shell/bottom weight.",
  });
  checks.push({
    id: "top-girder",
    label: "Top wind girder required section modulus",
    value: `${zRequired.toFixed(0)} cm³`,
    limit: "select girder Z ≥ value",
    pass: true,
    clause: "§5.9.6.1",
  });
  checks.push({
    id: "intermediate-girder",
    label: "Intermediate wind girders",
    value: `${intermediateGirders}`,
    limit: `H₁ = ${h1.toFixed(2)} m`,
    pass: true,
    clause: "§5.9.7.2",
  });
  if (seismic) {
    checks.push({
      id: "seismic-hoop",
      label: "Seismic hoop stress ratio",
      value: seismic.maxHoopRatio.toFixed(2),
      limit: "≤ 1.00",
      pass: seismic.maxHoopRatio <= 1,
      clause: "§E.6.1.4",
    });
    checks.push({
      id: "seismic-compression",
      label: "Seismic shell compression ratio",
      value: seismic.compressionRatio.toFixed(2),
      limit: "≤ 1.00",
      pass: seismic.compressionRatio <= 1,
      clause: "§E.6.2.2",
    });
  }

  if (input.externalPressure > 2.5) {
    add(
      "error",
      "§5.2.1",
      "Design internal pressure above 2.5 kPa (10 in. H₂O) moves the tank outside the base API 650 scope — design the shell and roof per Annex F.",
    );
  }

  return {
    input,
    material: { ...material, sy, su },
    sd,
    st,
    tMin,
    courses,
    shell: {
      plateWidth,
      avgThickness,
      weight: shellWeight,
      area: shellArea,
      height: shellHeight,
    },
    bottom: {
      plate: bottomPlate,
      annularPlate,
      annularWidth,
      stress: annularStress,
      weight: bottomWeight,
      annularWeight,
      area: bottomArea,
    },
    roof: {
      plate: roofPlate,
      rise: roofRise,
      slant: roofSlant,
      area: roofArea,
      weight: roofWeight,
      deadLoad: roofDead,
      liveLoad: roofLive,
      snowLoad,
      externalPressure: pe,
      t1: t1Load,
      t2: t2Load,
      T: roofLoad,
    },
    wind: {
      q,
      force: windForce,
      moment: windMoment,
      resisting,
      stable,
      zRequired,
      h1,
      wtr,
      intermediateGirders,
      girderElevations,
      topThickness,
    },
    weights: {
      shell: shellWeight,
      bottom: bottomWeight,
      annular: annularWeight,
      roof: roofWeight,
      total: totalWeight,
      product: productWeight,
      water: waterWeight,
      operating: totalWeight + productWeight,
      hydroTest: totalWeight + waterWeight,
    },
    volume,
    seismic,
    notices,
    checks,
  };
}

/* -------------------------------------------------------------------------- */
/* Annex E screening                                                          */
/* -------------------------------------------------------------------------- */

interface SeismicArgs {
  D: number;
  H: number;
  sg: number;
  sd: number;
  sy: number;
  ca: number;
  courses: CourseResult[];
  shellWeight: number;
  shellHeight: number;
  roofWeight: number;
  roofRise: number;
  t1: number;
  input: SeismicInput;
}

/**
 * Annex E screening: effective weights, overturning moments, dynamic hoop
 * stress, longitudinal shell compression and minimum anchorage resistance.
 * The spectral accelerations are taken as design values (S_DS, S_D1).
 */
function seismicScreening(args: SeismicArgs): SeismicResult {
  const { D, H, sg, sd, sy, ca, courses, shellWeight, shellHeight, roofWeight, roofRise, t1, input } =
    args;

  const dh = D / H;
  const ks = 0.578 / Math.sqrt(Math.tanh((3.68 * H) / D));
  const tc = 1.8 * ks * Math.sqrt(D);

  const ai = Math.min(input.sds * (input.importance / input.ri), 0.6);
  const spectral =
    tc <= input.tl
      ? input.sd1 / tc
      : (input.sd1 * input.tl) / (tc * tc);
  const ac = Math.min(1.5 * spectral * (input.importance / input.rc), input.sds * input.importance);
  const av = 0.14 * input.sds;

  const wp = Math.PI * Math.pow(D / 2, 2) * H * sg * WATER_DENSITY * GRAVITY; // N

  const wi =
    dh >= 1.333
      ? (Math.tanh(0.866 * dh) / (0.866 * dh)) * wp
      : (1 - 0.218 * dh) * wp;
  const wc = 0.23 * dh * Math.tanh(3.67 / dh) * wp;

  const xi = dh >= 1.333 ? 0.375 * H : (0.5 - 0.094 * dh) * H;
  const xc =
    (1 -
      (Math.cosh(3.67 / dh) - 1) /
        ((3.67 / dh) * Math.sinh(3.67 / dh))) *
    H;
  const xis =
    dh >= 1.333
      ? 0.375 * (1 + 1.333 * ((0.866 * dh) / Math.tanh(0.866 * dh) - 1)) * H
      : (0.5 + 0.06 * dh) * H;
  const xcs =
    (1 -
      (Math.cosh(3.67 / dh) - 1.937) /
        ((3.67 / dh) * Math.sinh(3.67 / dh))) *
    H;

  const ws = shellWeight * GRAVITY;
  const xs =
    courses.reduce((sum, c) => sum + c.weight * (c.bottom + c.height / 2), 0) /
    Math.max(shellWeight, 1e-9);
  const wr = roofWeight * GRAVITY;
  const xr = shellHeight + roofRise / 3;

  const impulsive = ai * (wi * xi + ws * xs + wr * xr);
  const convective = ac * wc * xc;
  const impulsiveSlab = ai * (wi * xis + ws * xs + wr * xr);
  const convectiveSlab = ac * wc * xcs;

  const mrw = Math.sqrt(impulsive * impulsive + convective * convective);
  const ms = Math.sqrt(impulsiveSlab * impulsiveSlab + convectiveSlab * convectiveSlab);
  const baseShear = Math.sqrt(
    Math.pow(ai * (wi + ws + wr), 2) + Math.pow(ac * wc, 2),
  );

  const allowable = 1.33 * sd;
  const seismicCourses: SeismicCourseResult[] = courses.map((course) => {
    const Y = Math.max(H - course.bottom, 0);
    let ni: number;
    if (dh >= 1.333) {
      const r = H > 0 ? Y / H : 0;
      ni = 8.48 * ai * sg * D * H * (r - 0.5 * r * r) * Math.tanh((0.866 * D) / H);
    } else if (Y < 0.75 * D) {
      const r = Y / (0.75 * D);
      ni = 5.22 * ai * sg * D * D * (r - 0.5 * r * r);
    } else {
      ni = 2.6 * ai * sg * D * D;
    }
    const nc =
      (1.85 * ac * sg * D * D * Math.cosh((3.68 * (H - Y)) / D)) /
      Math.max(Math.cosh((3.68 * H) / D), 1e-9);
    const nh = (9.81 * Y * sg * D) / 2;
    const ts = Math.max(course.tSelected - ca, 0.1);
    const sigmaT = (nh + Math.sqrt(ni * ni + nc * nc) + av * nh) / ts;
    return { index: course.index, Y, ni, nc, nh, sigmaT, allowable, ratio: sigmaT / allowable };
  });

  const wt = (ws + wr) / (Math.PI * D);
  const tsb = Math.max(t1 - ca, 0.1);
  const sigmaC = (wt * (1 + 0.4 * av) + (1.273 * mrw) / (D * D)) / (1000 * tsb);
  const compressionParam = (sg * H * D * D) / (tsb * tsb);
  const fcRaw =
    compressionParam >= 44
      ? (83 * tsb) / D
      : (83 * tsb) / (2.5 * D) + 7.5 * Math.sqrt(sg * H);
  const fc = Math.min(fcRaw, 0.5 * sy);
  const anchorage = (1.273 * mrw) / (D * D) - wt * (1 - 0.4 * av);

  return {
    ks,
    tc,
    ai,
    ac,
    av,
    wi,
    wc,
    xi,
    xc,
    xis,
    xcs,
    mrw,
    ms,
    baseShear,
    courses: seismicCourses,
    maxHoopRatio: Math.max(...seismicCourses.map((c) => c.ratio)),
    wt,
    sigmaC,
    fc,
    compressionRatio: sigmaC / fc,
    anchorage,
    anchorageRequired: anchorage > 0,
  };
}
