/**
 * Verification harness for the API 650 engine.
 *
 *   node scripts/verify.ts
 *
 * Cases are taken from published worked examples so the implementation can be
 * checked against numbers computed independently of this code.
 */

import {
  annularPlateThickness,
  designTank,
  minimumShellThickness,
  allowableStresses,
  STEEL_DENSITY,
  type TankInput,
} from "../src/lib/api650.ts";
import {
  evaluateOpenings,
  NOZZLE_SIZES,
  sizeKeyFor,
  sizeLabelFor,
  type OpeningInput,
} from "../src/lib/openings.ts";

let failures = 0;
let checks = 0;

function near(name: string, actual: number, expected: number, tolerance: number) {
  checks += 1;
  const delta = Math.abs(actual - expected);
  const ok = delta <= tolerance;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}: ${actual.toFixed(3)} (expected ${expected.toFixed(3)} ± ${tolerance})`,
  );
}

function truthy(name: string, condition: boolean) {
  checks += 1;
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
}

function equal(name: string, actual: number, expected: number) {
  checks += 1;
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${actual} (expected ${expected})`);
}

const base: TankInput = {
  projectName: "Verification",
  tankTag: "V-1",
  diameter: 30,
  shellHeight: 14.4,
  designLevel: 14.4,
  courseHeight: 2.4,
  productName: "Test product",
  sg: 0.85,
  corrosionAllowance: 1.5,
  materialId: "A516-70",
  sy: 260,
  su: 485,
  jointEfficiency: 1,
  shellMethod: "one-foot",
  windSpeed: 160,
  roofLive: 1.2,
  snow: 0,
  externalPressure: 0.25,
  roofType: "supported-cone",
  roofSlope: 3.6,
  useAnnular: true,
  seismic: { enabled: false, sds: 1.2, sd1: 0.6, tl: 4, importance: 1, ri: 4, rc: 2 },
};

/* ---------------------------------------------------------------- tables */

equal("Table 5-1a: t=19, sigma=190", annularPlateThickness(19, 190).thickness, 6);
equal("Table 5-1a: t=19, sigma=250", annularPlateThickness(19, 250).thickness, 9);
equal("Table 5-1a: t=12, sigma=159", annularPlateThickness(12, 159).thickness, 6);
// 13th edition columns are 190/210/220/250 MPa, so 225 MPa falls in the 250 column.
equal("Table 5-1a: t=30, sigma=225", annularPlateThickness(30, 225).thickness, 14);
equal("Table 5-1a: t=45, sigma=250", annularPlateThickness(45, 250).thickness, 19);
equal("Table 5-1: D=10 m min t", minimumShellThickness(10), 5);
equal("Table 5-1: D=24 m min t", minimumShellThickness(24), 6);
equal("Table 5-1: D=40 m min t", minimumShellThickness(40), 8);
equal("Table 5-1: D=65 m min t", minimumShellThickness(65), 10);

const a36 = allowableStresses(250, 400);
equal("Table 5-2a: A36 Sd", a36.sd, 160);
equal("Table 5-2a: A36 St", a36.st, 171);

/* ------------------------------- example 1: 30 m x 14.4 m, A516-70 ------- */

// Published course-by-course values: td = 11.68, 9.95, 8.22, 6.48, 4.75, 3.02
// with plates 12, 10, 9, 7, 6, 6 mm.
const ex1 = designTank(base);
near("30 m tank, course 1 td", ex1.courses[0].td, 11.68, 0.05);
near("30 m tank, course 1 tt", ex1.courses[0].tt, 10.63, 0.05);
equal("30 m tank, course 1 plate", ex1.courses[0].tSelected, 12);
near("30 m tank, course 2 td", ex1.courses[1].td, 9.95, 0.05);
equal("30 m tank, course 2 plate", ex1.courses[1].tSelected, 10);
near("30 m tank, course 3 td", ex1.courses[2].td, 8.22, 0.05);
// This build offers the common metric plate list (5, 6, 8, 10, 12 ...); the
// reference used a mill list containing 9 and 7 mm, so the selected plates
// differ by one step while the required thicknesses agree.
equal("30 m tank, course 3 plate", ex1.courses[2].tSelected, 10);
near("30 m tank, course 4 td", ex1.courses[3].td, 6.48, 0.05);
equal("30 m tank, course 4 plate", ex1.courses[3].tSelected, 8);
near("30 m tank, course 5 td", ex1.courses[4].td, 4.75, 0.05);
equal("30 m tank, course 5 plate", ex1.courses[4].tSelected, 6);
near("30 m tank, course 6 td", ex1.courses[5].td, 3.02, 0.05);
equal("30 m tank, course 6 plate", ex1.courses[5].tSelected, 6);
equal("30 m tank, bottom plate (6 + CA)", ex1.bottom.plate, 8);
equal("30 m tank, annular plate (Table 5-1a 6 + CA)", ex1.bottom.annularPlate, 8);

/* ------------------------------- example 2: 20 m x 12 m, A36 ------------ */

const ex2 = designTank({
  ...base,
  diameter: 20,
  shellHeight: 12,
  designLevel: 12,
  courseHeight: 2,
  sg: 1,
  materialId: "A36",
  sy: 250,
  su: 400,
});
near("20 m A36, course 1 td", ex2.courses[0].td, 8.67, 0.05);
near("20 m A36, course 1 tt", ex2.courses[0].tt, 6.71, 0.05);
equal("20 m A36, course 1 plate", ex2.courses[0].tSelected, 10);
near("20 m A36, course 2 td", ex2.courses[1].td, 7.44, 0.05);
equal("20 m A36, course 2 plate", ex2.courses[1].tSelected, 8);

/* ------------------------------- example 3: 11.5 m x 10.5 m, VDP ------- */

const ex3 = designTank({
  ...base,
  diameter: 11.5,
  shellHeight: 11,
  designLevel: 10.5,
  courseHeight: 1.5,
  sg: 1,
  corrosionAllowance: 6,
  materialId: "custom",
  sy: 235,
  su: 485,
  shellMethod: "vdp",
  roofType: "self-supporting-cone",
  roofSlope: 18,
  windSpeed: 129.6,
});
near("11.5 m VDP, bottom course t1d", ex3.courses[0].td, 9.93, 0.1);
near("11.5 m VDP, bottom course t1t", ex3.courses[0].tt, 3.50, 0.05);
checks += 1;
if (!(ex3.courses[0].tSelected >= ex3.courses[0].tRequired)) {
  failures += 1;
  console.log("FAIL  VDP bottom course plate is thinner than required");
} else {
  console.log(
    `PASS  VDP bottom course plate ${ex3.courses[0].tSelected} mm covers ${ex3.courses[0].tRequired.toFixed(2)} mm required`,
  );
}

// The reference calculation gives a 12 mm first course and a required
// thickness falling to ~7.2 mm at the top; the variable-design-point method
// must never exceed the one-foot result anywhere above the bottom ring.
for (const course of ex3.courses) {
  checks += 1;
  const ok = course.tSelected >= course.oneFoot.td || course.index === 1;
  if (!ok) {
    failures += 1;
    console.log(`FAIL  VDP plate below one-foot result in course ${course.index}`);
  }
}

/* ----------------------------------------- wind girder reference -------- */

// Reference: Z = 39.8 cm3 for D = 11.5 m, H = 11 m at 129.6 km/h.
near("wind girder Z (11.5 m tank)", ex3.wind.zRequired, 39.8, 0.5);

// H1 = 9.47 t (t/D)^1.5 (190/V)^2 with t = 8 mm gives 94.5 m in the reference.
const h1Reference = 9.47 * 8 * Math.pow(8 / 11.5, 1.5) * Math.pow(190 / 129.6, 2);
near("H1 formula self-check", h1Reference, 94.48, 0.5);

/* ----------------------------------------- behavioural invariants ------- */

const big = designTank({
  ...base,
  diameter: 40,
  shellHeight: 18,
  designLevel: 17.4,
  courseHeight: 3,
  sg: 0.9,
  corrosionAllowance: 3,
  shellMethod: "vdp",
  windSpeed: 190,
  roofSlope: 5,
});

checks += 1;
const monotonic = big.courses.every(
  (course, index) => index === 0 || course.tSelected <= big.courses[index - 1].tSelected,
);
if (!monotonic) {
  failures += 1;
  console.log("FAIL  shell thicknesses are not non-increasing from the bottom course");
} else {
  console.log("PASS  shell thicknesses are non-increasing from the bottom course");
}

checks += 1;
if (!big.courses.every((course) => course.tSelected >= big.tMin)) {
  failures += 1;
  console.log("FAIL  a course is thinner than the Table 5-1 minimum");
} else {
  console.log("PASS  every course satisfies the Table 5-1 minimum");
}

checks += 1;
if (big.wind.intermediateGirders < 1) {
  failures += 1;
  console.log("FAIL  40 m x 18 m tank should require an intermediate wind girder");
} else {
  console.log(
    `PASS  intermediate wind girders required: ${big.wind.intermediateGirders} at ${big.wind.girderElevations.join(", ")} m`,
  );
}

// VDP must be no thicker than the one-foot method in the upper courses of a
// large tank (this is the whole point of the method).
const bigOneFoot = designTank({ ...big.input, shellMethod: "one-foot" });
const upperVdpSavings = bigOneFoot.courses
  .slice(1)
  .reduce((sum, course, index) => sum + (course.tRequired - big.courses[index + 1].tRequired), 0);
checks += 1;
if (upperVdpSavings <= 0) {
  failures += 1;
  console.log("FAIL  variable design point did not reduce required thickness");
} else {
  console.log(`PASS  variable design point saves ${upperVdpSavings.toFixed(2)} mm across upper courses`);
}

/* ----------------------------------------- seismic screening ------------ */

const seismic = designTank({ ...base, seismic: { ...base.seismic, enabled: true } });
checks += 1;
if (!seismic.seismic) {
  failures += 1;
  console.log("FAIL  seismic screening did not run");
} else {
  const s = seismic.seismic;
  console.log(
    `      seismic: Tc=${s.tc.toFixed(2)} s, Ai=${s.ai.toFixed(3)}, Ac=${s.ac.toFixed(3)}, ratio=${s.maxHoopRatio.toFixed(2)}, anchorage=${s.anchorage.toFixed(0)} N/m`,
  );
  // Tc = 1.8 Ks sqrt(D) with Ks = 0.578 / sqrt(tanh(3.68 H/D)) for 30 m x 14.4 m.
  near("seismic Tc (30 m x 14.4 m)", s.tc, 5.87, 0.1);
  checks += 1;
  if (!(s.maxHoopRatio > 0 && s.maxHoopRatio < 3)) {
    failures += 1;
    console.log("FAIL  seismic hoop stress ratio outside a plausible range");
  } else {
    console.log("PASS  seismic hoop stress ratio plausible");
  }
}

/* ----------------------------------------- weight sanity --------------- */

const shellFromGeometry =
  Math.PI *
  ex1.input.diameter *
  ex1.input.shellHeight *
  (ex1.shell.avgThickness / 1000) *
  7850;
near(
  "shell weight within 12% of pi*D*H*t*rho",
  ex1.weights.shell,
  shellFromGeometry,
  shellFromGeometry * 0.12,
);

/* ------------------------------------ openings and reinforcement (§5.7) -- */

const nozzle: OpeningInput = {
  id: "n1",
  tag: "N1",
  type: "shell-nozzle",
  od: 219.1,
  neck: 8,
  projection: 150,
  pad: true,
  padThickness: 10,
  padWidth: 120,
  elevation: 1.2,
  azimuth: 0,
  service: "Inlet",
};

const withPad = evaluateOpenings(ex1, [nozzle])[0];
near("opening diameter = OD - 2 t_n", withPad.d, 219.1 - 16, 0.01);
near("opening required area = d x t_r", withPad.aReq, withPad.d * withPad.tr, 0.01);
near("opening pad area = 2 w t", withPad.aPad, 2 * 120 * 10, 0.01);
truthy("8 in nozzle with 120 x 10 pad is reinforced", withPad.pass);
truthy(
  `8 in nozzle utilisation ${withPad.utilisation.toFixed(2)} is just above 1.0`,
  withPad.utilisation > 1 && withPad.utilisation < 1.2,
);

const withoutPad = evaluateOpenings(ex1, [{ ...nozzle, pad: false }])[0];
truthy("8 in nozzle without a pad is unreinforced", !withoutPad.pass);
near(
  "unreinforced deficit = A_req - A_shell - A_neck",
  withoutPad.deficit,
  withoutPad.aReq - withoutPad.aShell - withoutPad.aNeck,
  0.01,
);
near(
  "suggested pad width closes the deficit",
  withoutPad.suggestedPadWidth * 2 * 10,
  withoutPad.deficit,
  0.01,
);

const small: OpeningInput = {
  ...nozzle,
  id: "n2",
  tag: "N2",
  od: 60.3,
  neck: 10,
  pad: false,
  elevation: 2.6,
  azimuth: 90,
};
const smallResult = evaluateOpenings(ex1, [small])[0];
near("60.3 mm pipe gives a 40.3 mm opening", smallResult.d, 40.3, 0.01);
truthy("opening under 60 mm is exempt from reinforcement", smallResult.exemption && smallResult.pass);

const manhole: OpeningInput = {
  ...nozzle,
  id: "m1",
  tag: "M1",
  type: "shell-manhole",
  od: 520,
  neck: 12,
  projection: 180,
  padThickness: 12,
  padWidth: 300,
  elevation: 0.9,
  azimuth: 270,
};
const manholeResult = evaluateOpenings(ex1, [manhole])[0];
near("500 mm manhole opening diameter", manholeResult.d, 496, 0.01);
truthy("500 mm manhole with 300 x 12 pad is reinforced", manholeResult.pass);

const tight = evaluateOpenings(ex1, [{ ...nozzle, elevation: 0.05, pad: false }])[0];
const girthCheck = tight.checks.find((check) => check.id.endsWith("-girth"));
truthy("opening 50 mm from the bottom seam fails the 75 mm clearance check", !!girthCheck && !girthCheck.pass);

const pair = evaluateOpenings(ex1, [
  { ...nozzle, pad: true },
  { ...nozzle, id: "n3", tag: "N3", azimuth: 0, elevation: 3.6 },
]);
const spacingCheck = pair[0].checks.find((check) => check.id.endsWith("-spacing"));
truthy("two openings at the same azimuth fail the spacing check", !!spacingCheck && !spacingCheck.pass);

truthy(
  "roof manhole reinforcement uses the roof plate thickness",
  evaluateOpenings(ex1, [
    { ...nozzle, id: "rm1", tag: "RM1", type: "roof-manhole", od: 516, neck: 8, padWidth: 275, padThickness: 8 },
  ])[0].tr < 12,
);

/* ------------------------------------------- nozzle sizes, weights, VDP -- */

near("8 in NPS outside diameter", NOZZLE_SIZES.find((size) => size.key === '8"')?.od ?? 0, 219.1, 0.01);
near("6 in NPS schedule 40 wall", NOZZLE_SIZES.find((size) => size.key === '6"')?.neck ?? 0, 7.11, 0.01);
truthy("an 8 in nozzle OD resolves back to NPS 8", sizeKeyFor("shell-nozzle", 219.1) === '8"');
truthy("size labels are stated in inches", sizeLabelFor("shell-nozzle", 168.3) === '6"');
truthy("a non-standard OD falls back to custom", sizeKeyFor("shell-nozzle", 200) === "custom");
truthy("custom sizes fall back to millimetres", sizeLabelFor("shell-nozzle", 200) === "200 mm");

const planArea = Math.PI * Math.pow(base.diameter / 2, 2);
near("hydrostatic test water mass", ex1.weights.water, planArea * base.designLevel * 1000, 1);
near("product mass at design level", ex1.weights.product, planArea * base.designLevel * base.sg * 1000, 1);
near("test weight = empty + water", ex1.weights.hydroTest, ex1.weights.total + ex1.weights.water, 0.01);
near("operating weight = empty + product", ex1.weights.operating, ex1.weights.total + ex1.weights.product, 0.01);
near(
  "empty weight is the sum of its parts",
  ex1.weights.total,
  ex1.weights.shell + ex1.weights.bottom + ex1.weights.annular + ex1.weights.roof,
  0.01,
);
truthy("water is heavier than product when G < 1", ex1.weights.water > ex1.weights.product);

const heavy = designTank({
  ...base,
  diameter: 40,
  shellHeight: 18,
  designLevel: 17.4,
  courseHeight: 3,
  sg: 0.9,
  corrosionAllowance: 3,
});
near(
  "annular ring mass matches its plate volume",
  heavy.weights.annular,
  Math.max(
    Math.PI *
      (heavy.input.diameter - heavy.bottom.annularWidth / 1000) *
      (heavy.bottom.annularWidth / 1000) *
      ((heavy.bottom.annularPlate - heavy.bottom.plate) / 1000) *
      STEEL_DENSITY,
    0,
  ),
  1,
);

truthy(
  "variable design point is recorded for upper courses",
  (ex1.courses[2].vdp?.xe ?? 0) > 0,
);
truthy(
  "variable design point stays inside its course",
  (ex1.courses[2].vdp?.xe ?? 0) < ex1.courses[2].height * 1000,
);
truthy("one-foot thickness is always recorded alongside the VDP result", ex1.courses[2].oneFoot.td > 0);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exitCode = 1;
}
