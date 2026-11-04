import { MATERIALS, type TankInput } from "./api650";
import type { OpeningInput, OpeningType } from "./openings";

export interface FormState {
  projectName: string;
  tankTag: string;
  diameter: string;
  shellHeight: string;
  designLevel: string;
  courseHeight: string;
  productName: string;
  sg: string;
  ca: string;
  materialId: string;
  sy: string;
  su: string;
  jointEfficiency: string;
  shellMethod: string;
  windSpeed: string;
  roofLive: string;
  snow: string;
  externalPressure: string;
  roofType: string;
  roofSlope: string;
  useAnnular: string;
  seismicEnabled: string;
  sds: string;
  sd1: string;
  tl: string;
  importance: string;
  ri: string;
  rc: string;
}

export const DEFAULT_FORM: FormState = {
  projectName: "Tank Farm Expansion — Phase 2",
  tankTag: "T-101",
  diameter: "24",
  shellHeight: "14.4",
  designLevel: "13.8",
  courseHeight: "2.4",
  productName: "Crude oil",
  sg: "0.85",
  ca: "1.5",
  materialId: "A516-70",
  sy: "260",
  su: "485",
  jointEfficiency: "1",
  shellMethod: "one-foot",
  windSpeed: "160",
  roofLive: "1.2",
  snow: "0",
  externalPressure: "0.25",
  roofType: "supported-cone",
  roofSlope: "3.6",
  useAnnular: "yes",
  seismicEnabled: "no",
  sds: "1.2",
  sd1: "0.6",
  tl: "4",
  importance: "1.0",
  ri: "4",
  rc: "2",
};

const num = (value: string, fallback: number): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function buildInput(form: FormState): TankInput {
  const material = MATERIALS.find((m) => m.id === form.materialId) ?? MATERIALS[5];
  return {
    projectName: form.projectName,
    tankTag: form.tankTag,
    diameter: num(form.diameter, 24),
    shellHeight: num(form.shellHeight, 14.4),
    designLevel: num(form.designLevel, 13.8),
    courseHeight: num(form.courseHeight, 2.4),
    productName: form.productName,
    sg: num(form.sg, 0.85),
    corrosionAllowance: num(form.ca, 1.5),
    materialId: form.materialId,
    sy: num(form.sy, material.sy),
    su: num(form.su, material.su),
    jointEfficiency: num(form.jointEfficiency, 1),
    shellMethod: form.shellMethod === "vdp" ? "vdp" : "one-foot",
    windSpeed: num(form.windSpeed, 160),
    roofLive: num(form.roofLive, 1.2),
    snow: num(form.snow, 0),
    externalPressure: num(form.externalPressure, 0.25),
    roofType:
      form.roofType === "none"
        ? "none"
        : form.roofType === "self-supporting-cone"
          ? "self-supporting-cone"
          : "supported-cone",
    roofSlope: num(form.roofSlope, 3.6),
    useAnnular: form.useAnnular === "yes",
    seismic: {
      enabled: form.seismicEnabled === "yes",
      sds: num(form.sds, 1.2),
      sd1: num(form.sd1, 0.6),
      tl: num(form.tl, 4),
      importance: num(form.importance, 1),
      ri: num(form.ri, 4),
      rc: num(form.rc, 2),
    },
  };
}

/* -------------------------------------------------------------- openings */

export interface OpeningForm {
  id: string;
  tag: string;
  type: OpeningType;
  /** Nominal size in inches (NPS) as selected, or "custom". */
  size: string;
  od: string;
  neck: string;
  projection: string;
  pad: string; // "yes" | "no"
  padThickness: string;
  padWidth: string;
  elevation: string;
  azimuth: string;
  service: string;
}

export const DEFAULT_OPENINGS: OpeningForm[] = [
  {
    id: "op-1",
    tag: "N1",
    type: "shell-nozzle",
    size: '8"',
    od: "219.1",
    neck: "8.18",
    projection: "150",
    pad: "yes",
    padThickness: "10",
    padWidth: "120",
    elevation: "1.2",
    azimuth: "0",
    service: "Inlet",
  },
  {
    id: "op-2",
    tag: "N2",
    type: "shell-nozzle",
    size: '6"',
    od: "168.3",
    neck: "7.11",
    projection: "150",
    pad: "yes",
    padThickness: "10",
    padWidth: "100",
    elevation: "3.2",
    azimuth: "180",
    service: "Outlet",
  },
  {
    id: "op-3",
    tag: "M1",
    type: "shell-manhole",
    size: '20"',
    od: "524",
    neck: "12",
    projection: "180",
    pad: "yes",
    padThickness: "12",
    padWidth: "250",
    elevation: "0.9",
    azimuth: "270",
    service: "Access",
  },
  {
    id: "op-4",
    tag: "RM1",
    type: "roof-manhole",
    size: '20"',
    od: "516",
    neck: "8",
    projection: "150",
    pad: "yes",
    padThickness: "8",
    padWidth: "275",
    elevation: "14.4",
    azimuth: "0",
    service: "Roof access",
  },
];

export function buildOpenings(rows: OpeningForm[]): OpeningInput[] {
  return rows.map((row) => ({
    id: row.id,
    tag: row.tag,
    type: row.type,
    od: num(row.od, 168.3),
    neck: num(row.neck, 8),
    projection: num(row.projection, 150),
    pad: row.pad === "yes",
    padThickness: num(row.padThickness, 10),
    padWidth: num(row.padWidth, 100),
    elevation: num(row.elevation, 1),
    azimuth: num(row.azimuth, 0),
    service: row.service,
  }));
}

export function newOpening(type: OpeningType, index: number): OpeningForm {
  const id = `op-${Date.now()}-${index}`;
  if (type === "shell-manhole") {
    return {
      id,
      tag: `M${index}`,
      type,
      size: '20"',
      od: "524",
      neck: "12",
      projection: "180",
      pad: "yes",
      padThickness: "12",
      padWidth: "250",
      elevation: "0.9",
      azimuth: "300",
      service: "Access",
    };
  }
  if (type === "roof-manhole") {
    return {
      id,
      tag: `RM${index}`,
      type,
      size: '20"',
      od: "516",
      neck: "8",
      projection: "150",
      pad: "yes",
      padThickness: "8",
      padWidth: "275",
      elevation: "14.4",
      azimuth: "0",
      service: "Roof access",
    };
  }
  if (type === "roof-nozzle") {
    return {
      id,
      tag: `RN${index}`,
      type,
      size: '6"',
      od: "168.3",
      neck: "7.11",
      projection: "150",
      pad: "no",
      padThickness: "8",
      padWidth: "75",
      elevation: "14.4",
      azimuth: "0",
      service: "Vent",
    };
  }
  return {
    id,
    tag: `N${index}`,
    type,
    size: '6"',
    od: "168.3",
    neck: "7.11",
    projection: "150",
    pad: "yes",
    padThickness: "10",
    padWidth: "100",
    elevation: "1.5",
    azimuth: "90",
    service: "Nozzle",
  };
}

/* ---------------------------------------------------------------- presets */

export interface Preset {
  id: string;
  label: string;
  values: Partial<FormState>;
}

export const PRESETS: Preset[] = [
  {
    id: "crude",
    label: "Crude oil — 24 m × 13.8 m",
    values: { ...DEFAULT_FORM },
  },
  {
    id: "water",
    label: "Water storage — 20 m × 12 m",
    values: {
      diameter: "20",
      shellHeight: "12",
      designLevel: "11.4",
      courseHeight: "2",
      productName: "Water",
      sg: "1.0",
      ca: "1.5",
      materialId: "A36",
      roofType: "self-supporting-cone",
      roofSlope: "12",
      seismicEnabled: "yes",
    },
  },
  {
    id: "large",
    label: "Large crude tank — 40 m × 18 m",
    values: {
      diameter: "40",
      shellHeight: "18",
      designLevel: "17.4",
      courseHeight: "3",
      productName: "Crude oil",
      sg: "0.9",
      ca: "3",
      materialId: "A516-70",
      shellMethod: "vdp",
      roofType: "supported-cone",
      roofSlope: "5",
      windSpeed: "190",
    },
  },
  {
    id: "small",
    label: "Small diesel — 8 m × 6 m",
    values: {
      diameter: "8",
      shellHeight: "6",
      designLevel: "5.7",
      courseHeight: "1.8",
      productName: "Diesel",
      sg: "0.84",
      ca: "1.5",
      materialId: "A283C",
      roofType: "self-supporting-cone",
      roofSlope: "15",
      windSpeed: "140",
      seismicEnabled: "no",
    },
  },
];
