import { GRAVITY, type TankDesign } from "../lib/api650";
import { fmt, fmtMass } from "../lib/format";
import { openingTypeLabel, sizeLabelFor, type OpeningResult } from "../lib/openings";
import { APP_NAME, APP_VERSION, AUTHOR } from "../lib/about";
import TankDiagram from "./TankDiagram";

interface CalcRow {
  label: string;
  expr: string;
  value: string;
}

/** Substituted calculation block used throughout the printable sheet. */
function Calc({ rows }: { rows: CalcRow[] }) {
  return (
    <table className="report-table calc-table">
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.label}-${index}`}>
            <th>{row.label}</th>
            <td className="calc-expr">{row.expr}</td>
            <td className="calc-value">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Printable calculation sheet, including substituted formula values. */
export default function Report({
  design,
  openings,
}: {
  design: TankDesign;
  openings: OpeningResult[];
}) {
  const { input } = design;
  const bottom = design.bottom;
  const weights = design.weights;

  const hasOpenings = openings.length > 0;
  let section = 5;
  const nOpenings = hasOpenings ? ++section : null;
  const nSeismic = design.seismic ? ++section : null;
  const nWeights = ++section;
  const nChecks = ++section;
  const nNotes = ++section;

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const E = input.jointEfficiency;
  const D = input.diameter;
  const G = input.sg;
  const ca = input.corrosionAllowance;
  const live = Math.max(design.roof.liveLoad, design.roof.snowLoad);

  const shellCalcs: CalcRow[] = [
    {
      label: "Minimum thickness",
      expr: `Table 5-1 for D = ${fmt(D, 2)} m`,
      value: `${design.tMin} mm`,
    },
    ...design.courses.flatMap((course) => {
      const vdp = input.shellMethod === "vdp" ? course.vdp : null;
      const head = vdp ? Math.max(course.H - vdp.xe / 1000, 0) : course.head;
      const headExpr = vdp
        ? `(${fmt(course.H, 2)} − ${fmt(vdp.xe, 0)}/1000 = ${fmt(head, 3)})`
        : `${fmt(head, 2)}`;
      if (vdp && course.index === 1) {
        const factorD = 1.06 - (0.0696 * D / Math.max(course.H, 0.001)) * Math.sqrt((course.H * G) / (design.sd * E));
        const factorT = 1.06 - (0.0696 * D / Math.max(course.H, 0.001)) * Math.sqrt(course.H / (design.st * E));
        return [
          { label: `Course ${course.index} · VDP t₁`, expr: `[1.06 − (0.0696×${fmt(D, 2)}/${fmt(course.H, 2)})√(${fmt(course.H, 2)}×${fmt(G, 3)}/${design.sd * E})] × (4.9×${fmt(course.H, 2)}×${fmt(D, 2)}×${fmt(G, 3)}/${design.sd * E}) + ${fmt(ca, 2)}; factor ${fmt(factorD, 4)}`, value: `${fmt(course.td, 2)} mm` },
          { label: `Course ${course.index} · VDP test`, expr: `[1.06 − (0.0696×${fmt(D, 2)}/${fmt(course.H, 2)})√(${fmt(course.H, 2)}/${design.st * E})] × (4.9×${fmt(course.H, 2)}×${fmt(D, 2)}/${design.st * E}); factor ${fmt(factorT, 4)}`, value: `${fmt(course.tt, 2)} mm` },
        ] satisfies CalcRow[];
      }
      if (vdp) {
        const trial = course.oneFoot;
        const tu = Math.max(trial.td, trial.tt);
        const lower = design.courses[course.index - 2];
        const tL = Math.max(lower?.tRequired ?? tu, tu);
        const K = tu > 0 ? tL / tu : 1;
        const C = K > 1 ? K * (K - 1) / (1 + K ** 1.5) : 0;
        return [
          { label: `Course ${course.index} · trial t`, expr: `one-foot t_d/t_t = ${fmt(trial.td, 2)}/${fmt(trial.tt, 2)} mm; t_u = ${fmt(tu, 2)} mm`, value: `${fmt(tu, 2)} mm` },
          { label: `Course ${course.index} · K and C`, expr: `K = max(t_lower ${fmt(tL, 2)}, t_u ${fmt(tu, 2)}) / ${fmt(tu, 2)} = ${fmt(K, 3)}; C = K(K−1)/(1+K^1.5)`, value: fmt(C, 4) },
          { label: `Course ${course.index} · design point`, expr: `x_e = min[0.61√(R t_u)+320CH, 1000CH, 1.22√(R t_u)]`, value: `${fmt(vdp.xe, 0)} mm` },
          { label: `Course ${course.index} · t_d / t_t`, expr: `H_eff = ${fmt(course.H, 2)} − ${fmt(vdp.xe, 0)}/1000 = ${fmt(head, 3)} m; apply §5.6.3.3 design/test equations`, value: `${fmt(course.td, 2)} / ${fmt(course.tt, 2)} mm` },
        ] satisfies CalcRow[];
      }
      return [
        {
          label: `Course ${course.index} · t_d`,
          expr: `4.9 × ${fmt(D, 2)} × ${headExpr} × ${fmt(G, 3)} / (${design.sd} × ${fmt(E, 2)}) + ${fmt(ca, 2)}`,
          value: `${fmt(course.td, 2)} mm`,
        },
        {
          label: `Course ${course.index} · t_t`,
          expr: `4.9 × ${fmt(D, 2)} × ${headExpr} / (${design.st} × ${fmt(E, 2)})`,
          value: `${fmt(course.tt, 2)} mm`,
        },
      ] satisfies CalcRow[];
    }),
  ];

  const shellResolved = design.courses.map(
    (course) =>
      `${course.index}: ${fmt(course.td, 2)} / ${fmt(course.tt, 2)} / ${course.tRequired.toFixed(2)} → ${course.tSelected} mm (${course.governing})`,
  );

  return (
    <div className="report">
      <header className="report-head">
        <div>
          <h1>Storage tank design calculation</h1>
          <p className="report-sub">
            API Standard 650 — Welded Tanks for Oil Storage (13th edition, 2020) · SI units
          </p>
        </div>
        <table className="report-meta">
          <tbody>
            <tr>
              <th>Project</th>
              <td>{input.projectName || "—"}</td>
            </tr>
            <tr>
              <th>Tank</th>
              <td>{input.tankTag || "—"}</td>
            </tr>
            <tr>
              <th>Date</th>
              <td>{today}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>Preliminary design</td>
            </tr>
          </tbody>
        </table>
      </header>

      <section>
        <h2>1. Design data</h2>
        <table className="report-table">
          <tbody>
            <tr>
              <th>Nominal diameter D</th>
              <td>{fmt(D, 2)} m</td>
              <th>Shell height</th>
              <td>{fmt(input.shellHeight, 2)} m</td>
            </tr>
            <tr>
              <th>Design liquid level</th>
              <td>{fmt(input.designLevel, 2)} m</td>
              <th>Nominal capacity</th>
              <td>{fmt(design.volume, 0)} m³</td>
            </tr>
            <tr>
              <th>Product</th>
              <td>{input.productName}</td>
              <th>Specific gravity G</th>
              <td>{fmt(G, 3)}</td>
            </tr>
            <tr>
              <th>Corrosion allowance</th>
              <td>{fmt(ca, 1)} mm</td>
              <th>Joint efficiency E</th>
              <td>{fmt(E, 2)}</td>
            </tr>
            <tr>
              <th>Plate material</th>
              <td>{design.material.label}</td>
              <th>Sy / Su</th>
              <td>
                {design.material.sy} / {design.material.su} MPa
              </td>
            </tr>
            <tr>
              <th>Allowable Sd / St</th>
              <td>
                {design.sd} / {design.st} MPa
              </td>
              <th>Minimum shell t</th>
              <td>{design.tMin} mm</td>
            </tr>
            <tr>
              <th>Roof</th>
              <td>
                {input.roofType === "none"
                  ? "Open top"
                  : input.roofType === "supported-cone"
                    ? "Supported cone"
                    : "Self-supporting cone"}{" "}
                {input.roofType !== "none" ? `· ${fmt(input.roofSlope, 1)}°` : ""}
              </td>
              <th>Design wind speed</th>
              <td>{fmt(input.windSpeed, 0)} km/h (3-s gust)</td>
            </tr>
            <tr>
              <th>Roof live load</th>
              <td>{fmt(input.roofLive, 2)} kPa</td>
              <th>External pressure</th>
              <td>{fmt(input.externalPressure, 2)} kPa</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>2. Shell design — §5.6.3</h2>
        <p className="report-text">
          Method:{" "}
          {input.shellMethod === "vdp"
            ? "variable-design-point method (§5.6.3.3, t₁ and x_e)"
            : "one-foot method (§5.6.3.2)"}
          . Design thickness t_d = 4.9 D (H − 0.3) G / (Sd E) + CA; hydrostatic test thickness t_t =
          4.9 D (H − 0.3) / (St E). The largest of t_d, t_t and the Table 5-1 minimum governs,
          rounded up to commercial plate.
        </p>
        <table className="report-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Elevation (m)</th>
              <th>H (m)</th>
              <th>x_e (mm)</th>
              <th>t_d (mm)</th>
              <th>t_t (mm)</th>
              <th>t req. (mm)</th>
              <th>Plate (mm)</th>
              <th>Governs</th>
            </tr>
          </thead>
          <tbody>
            {design.courses.map((course) => (
              <tr key={course.index}>
                <td>{course.index}</td>
                <td>
                  {fmt(course.bottom, 2)}–{fmt(course.top, 2)}
                </td>
                <td>{fmt(course.H, 2)}</td>
                <td>{course.vdp ? fmt(course.vdp.xe, 0) : "—"}</td>
                <td>{fmt(course.td, 2)}</td>
                <td>{fmt(course.tt, 2)}</td>
                <td>{fmt(course.tRequired, 2)}</td>
                <td>{course.tSelected}</td>
                <td>{course.governing}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Calc rows={shellCalcs} />
        <p className="report-text">
          Course results t_d / t_t / t_req → plate: {shellResolved.join(" · ")}. Course plate width{" "}
          {fmt(design.shell.plateWidth * 1000, 0)} mm; average shell thickness{" "}
          {fmt(design.shell.avgThickness, 2)} mm; shell plate area {fmt(design.shell.area, 0)} m²;
          shell weight {fmtMass(weights.shell)}.
        </p>
      </section>

      <section>
        <h2>3. Bottom and annular plates — §5.4, §5.5</h2>
        <table className="report-table">
          <tbody>
            <tr>
              <th>Bottom plate</th>
              <td>{bottom.plate} mm (6 mm nominal + CA)</td>
              <th>Annular plate</th>
              <td>{bottom.annularPlate > 0 ? `${bottom.annularPlate} mm` : "not provided"}</td>
            </tr>
            <tr>
              <th>Annular radial width</th>
              <td>{bottom.annularPlate > 0 ? `${bottom.annularWidth} mm` : "—"}</td>
              <th>Table 5-1a entry stress</th>
              <td>{fmt(bottom.stress, 0)} MPa</td>
            </tr>
          </tbody>
        </table>
        <Calc
          rows={[
            {
              label: "Bottom plate",
              expr: `6 + ${fmt(ca, 2)} = ${fmt(6 + ca, 2)}`,
              value: `${bottom.plate} mm`,
            },
            {
              label: "First-course stress",
              expr: `S = max[4.9 × ${fmt(D, 2)} × ${fmt(Math.max(input.designLevel - 0.3, 0), 2)} × ${fmt(G, 3)} / ${fmt(Math.max(design.courses[0].tSelected - ca, 0.1), 1)}, 4.9 × ${fmt(D, 2)} × ${fmt(Math.max(input.designLevel - 0.3, 0), 2)} / ${design.courses[0].tSelected}]`,
              value: `${fmt(bottom.stress, 0)} MPa`,
            },
            {
              label: "Annular plate",
              expr:
                bottom.annularPlate > 0
                  ? `Table 5-1a at t_s = ${design.courses[0].tSelected} mm, S = ${fmt(bottom.stress, 0)} MPa → ${fmt(bottom.annularPlate - ca, 0)} + CA = ${fmt(bottom.annularPlate - ca + ca, 2)}`
                  : "not provided",
              value: bottom.annularPlate > 0 ? `${bottom.annularPlate} mm` : "—",
            },
            {
              label: "Annular width",
              expr:
                bottom.annularPlate > 0
                  ? `max[600, 215 × ${bottom.annularPlate} / √(${fmt(input.designLevel, 2)} × ${fmt(G, 3)})]`
                  : "—",
              value: bottom.annularPlate > 0 ? `${bottom.annularWidth} mm` : "—",
            },
          ]}
        />
      </section>

      <section>
        <h2>4. Roof — §5.10</h2>
        {design.roof.plate > 0 ? (
          <>
            <table className="report-table">
              <tbody>
                <tr>
                  <th>Roof plate</th>
                  <td>{design.roof.plate} mm</td>
                  <th>Slope / rise</th>
                  <td>
                    {fmt(input.roofSlope, 1)}° / {fmt(design.roof.rise, 2)} m
                  </td>
                </tr>
                <tr>
                  <th>Roof area</th>
                  <td>{fmt(design.roof.area, 0)} m²</td>
                  <th>Roof weight</th>
                  <td>{fmtMass(design.roof.weight)}</td>
                </tr>
                <tr>
                  <th>Dead / live / snow</th>
                  <td>
                    {fmt(design.roof.deadLoad, 3)} / {fmt(design.roof.liveLoad, 2)} /{" "}
                    {fmt(design.roof.snowLoad, 2)} kPa
                  </td>
                  <th>Governing load T</th>
                  <td>{fmt(design.roof.T, 3)} kPa</td>
                </tr>
              </tbody>
            </table>
            <Calc
              rows={[
                {
                  label: "Design load T",
                  expr: `max[${fmt(design.roof.deadLoad, 3)} + ${fmt(live, 2)} + 0.4 × ${fmt(design.roof.externalPressure, 2)}, ${fmt(design.roof.deadLoad, 3)} + ${fmt(design.roof.externalPressure, 2)} + 0.4 × ${fmt(live, 2)}]`,
                  value: `${fmt(design.roof.T, 3)} kPa`,
                },
                {
                  label: "Plate thickness",
                  expr:
                    input.roofType === "self-supporting-cone"
                      ? `t = ${fmt(D, 2)} / (4.8 sin ${fmt(input.roofSlope, 1)}°) × √(${fmt(design.roof.T, 3)}/2.2) + ${fmt(ca, 2)}, iterated with plate self weight`
                      : `5 + ${fmt(ca, 2)} = ${fmt(5 + ca, 2)}`,
                  value: `${design.roof.plate} mm`,
                },
              ]}
            />
            <p className="report-text">
              {input.roofType === "self-supporting-cone"
                ? "Self-supporting cone roof thickness from t = D/(4.8 sinθ) √(T/2.2) + CA, limited to 13 mm. The compression ring and any rafters are outside this calculation."
                : "Supported cone roof plates at the 5 mm minimum plus corrosion allowance; rafters and girders are to be designed for the same uniform loads."}
            </p>
          </>
        ) : (
          <p className="report-text">Open-top tank; no roof plates.</p>
        )}
      </section>

      <section>
        <h2>5. Wind — §5.9, §5.11</h2>
        <table className="report-table">
          <tbody>
            <tr>
              <th>Velocity pressure</th>
              <td>{fmt(design.wind.q, 3)} kPa</td>
              <th>Wind force</th>
              <td>{fmt(design.wind.force, 1)} kN</td>
            </tr>
            <tr>
              <th>Overturning moment</th>
              <td>{fmt(design.wind.moment, 0)} kN·m</td>
              <th>Resisting moment</th>
              <td>{fmt(design.wind.resisting, 0)} kN·m</td>
            </tr>
            <tr>
              <th>Top girder Z required</th>
              <td>{fmt(design.wind.zRequired, 0)} cm³</td>
              <th>H₁ / W_tr</th>
              <td>
                {fmt(design.wind.h1, 2)} m / {fmt(design.wind.wtr, 2)} m
              </td>
            </tr>
            <tr>
              <th>Intermediate girders</th>
              <td>{design.wind.intermediateGirders}</td>
              <th>Elevations</th>
              <td>
                {design.wind.girderElevations.length > 0
                  ? design.wind.girderElevations.map((e) => `${fmt(e, 2)} m`).join(", ")
                  : "none required"}
              </td>
            </tr>
          </tbody>
        </table>
        <Calc
          rows={[
            {
              label: "Velocity pressure",
              expr: `q = 0.613 × (${fmt(input.windSpeed, 0)}/3.6)² / 1000`,
              value: `${fmt(design.wind.q, 3)} kPa`,
            },
            {
              label: "Wind force",
              expr: `F = 0.8 × ${fmt(design.wind.q, 3)} × ${fmt(D, 2)} × (${fmt(input.shellHeight, 2)} + ${fmt(design.roof.rise, 2)}/2)`,
              value: `${fmt(design.wind.force, 1)} kN`,
            },
            {
              label: "Overturning moment",
              expr: `M = ${fmt(design.wind.force, 1)} × (${fmt(input.shellHeight, 2)} + ${fmt(design.roof.rise, 2)})/2`,
              value: `${fmt(design.wind.moment, 0)} kN·m`,
            },
            {
              label: "Resisting moment",
              expr: `2/3 × ${fmt(weights.total, 0)} kg × 9.81/1000 × ${fmt(D, 2)}/2`,
              value: `${fmt(design.wind.resisting, 0)} kN·m`,
            },
            {
              label: "Top girder Z",
              expr: `Z = (${fmt(D, 2)}² × ${fmt(input.shellHeight, 2)}/17) × (${fmt(input.windSpeed, 0)}/190)²`,
              value: `${fmt(design.wind.zRequired, 0)} cm³`,
            },
            {
              label: "Maximum unstiffened height",
              expr: `H₁ = 9.47 × ${design.wind.topThickness} × (${design.wind.topThickness}/${fmt(D, 2)})^1.5 × (190/${fmt(input.windSpeed, 0)})²`,
              value: `${fmt(design.wind.h1, 2)} m`,
            },
            {
              label: "Transformed shell width",
              expr: `W_tr = Σ h (t_top/t_i)^2.5, t_top = ${design.wind.topThickness} mm`,
              value: `${fmt(design.wind.wtr, 2)} m`,
            },
            {
              label: "Intermediate girder count",
              expr: `max(0, ceil(W_tr/H₁) − 1) = max(0, ceil(${fmt(design.wind.wtr, 2)}/${fmt(design.wind.h1, 2)}) − 1)`,
              value: `${design.wind.intermediateGirders}`,
            },
            {
              label: "Intermediate girder section modulus",
              expr: `Z = (${fmt(D, 2)}² × ${fmt(design.wind.h1, 2)}/17) × (${fmt(input.windSpeed, 0)}/190)²`,
              value: `${fmt(design.wind.intermediateZ, 1)} cm³ each`,
            },
            {
              label: "Wind anchorage demand",
              expr: `max[0, M/(D/2) − (2/3)W] = max[0, ${fmt(design.wind.moment, 1)}/${fmt(D / 2, 2)} − (2/3)×${fmt((weights.total * GRAVITY) / 1000, 1)}]`,
              value: `${fmt(design.wind.anchorageUplift, 1)} kN total · ${fmt(design.wind.anchoragePerMetre, 2)} kN/m`,
            },
          ]}
        />
        <p className="report-text">
          Overturning check: {design.wind.stable ? "stable without anchorage" : "anchorage required"}{" "}
          (ratio {fmt(design.wind.moment / Math.max(design.wind.resisting, 1), 2)}).
        </p>
      </section>

      {hasOpenings ? (
        <section>
          <h2>{nOpenings}. Shell and roof openings — §5.7</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Type</th>
                <th>Size (in)</th>
                <th>Course</th>
                <th>d (mm)</th>
                <th>t_r (mm)</th>
                <th>A req. (mm²)</th>
                <th>A prov. (mm²)</th>
                <th>Prov./req.</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {openings.map((opening) => (
                <tr key={opening.input.id}>
                  <td>{opening.input.tag}</td>
                  <td>{openingTypeLabel(opening.input.type)}</td>
                  <td>{sizeLabelFor(opening.input.type, opening.input.od)}</td>
                  <td>{opening.course ?? "roof"}</td>
                  <td>{fmt(opening.d, 1)}</td>
                  <td>{fmt(opening.tr, 2)}</td>
                  <td>{fmt(opening.aReq, 0)}</td>
                  <td>{fmt(opening.aProvided, 0)}</td>
                  <td>{fmt(opening.utilisation, 2)}</td>
                  <td className={opening.pass ? "pass" : "fail"}>
                    {opening.pass ? "OK" : "Review"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Calc
            rows={openings.flatMap((opening) => [
              {
                label: `${opening.input.tag} · A_req`,
                expr: `d × t_r = ${fmt(opening.d, 1)} × ${fmt(opening.tr, 2)}`,
                value: `${fmt(opening.aReq, 0)} mm²`,
              },
              {
                label: `${opening.input.tag} · A_prov`,
                expr: `shell (${fmt(opening.ts, 1)}−${fmt(opening.tr, 2)}) × ${fmt(opening.d, 1)} = ${fmt(
                  opening.aShell,
                  0,
                )} + neck ${fmt(opening.aNeck, 0)} + pad ${fmt(opening.aPad, 0)}`,
                value: `${fmt(opening.aProvided, 0)} mm²`,
              },
            ])}
          />
          <p className="report-text">
            Reinforcement by area replacement: A_req = d · t_r, where d is the finished opening
            diameter and t_r the required plate thickness at the opening. The area may be provided
            by excess shell plate (credited over the opening width), excess neck thickness
            (credited over 2.5 t_n each side of the plate, limited by the neck projection) and the
            reinforcing pad (credited over its full radial width). Openings not exceeding 60 mm
            nominal bore need no reinforcement. Minimum clear distance to horizontal shell joints
            and to adjacent openings is 75 mm. Sizes are selected in inches (NPS); outside
            diameters and Schedule 40 walls follow ASME B36.10, manholes Table 5.13a.
          </p>
          {openings.some((opening) => !opening.pass) ? (
            <ul className="report-notes">
              {openings.flatMap((opening) =>
                opening.checks
                  .filter((check) => !check.pass)
                  .map((check) => (
                    <li key={`${opening.input.id}-${check.id}`}>
                      <strong>{check.label}</strong> — {check.value} against {check.limit}.
                      {check.note ? ` ${check.note}` : ""}
                    </li>
                  )),
              )}
            </ul>
          ) : null}
        </section>
      ) : null}

      {design.seismic ? (
        <section>
          <h2>{nSeismic}. Seismic screening — Annex E</h2>
          <table className="report-table">
            <tbody>
              <tr>
                <th>Ai / Ac / Av</th>
                <td>
                  {fmt(design.seismic.ai, 3)} / {fmt(design.seismic.ac, 3)} /{" "}
                  {fmt(design.seismic.av, 3)}
                </td>
                <th>Tc</th>
                <td>{fmt(design.seismic.tc, 2)} s</td>
              </tr>
              <tr>
                <th>Wi / Wc</th>
                <td>
                  {fmtMass(design.seismic.wi / GRAVITY)} / {fmtMass(design.seismic.wc / GRAVITY)}
                </td>
                <th>Base shear</th>
                <td>{fmt(design.seismic.baseShear / 1000, 0)} kN</td>
              </tr>
              <tr>
                <th>Mrw / Ms</th>
                <td>
                  {fmt(design.seismic.mrw / 1000, 0)} / {fmt(design.seismic.ms / 1000, 0)} kN·m
                </td>
                <th>Hoop stress ratio</th>
                <td>{fmt(design.seismic.maxHoopRatio, 2)}</td>
              </tr>
              <tr>
                <th>Shell compression</th>
                <td>
                  {fmt(design.seismic.sigmaC, 1)} / {fmt(design.seismic.fc, 1)} MPa
                </td>
                <th>Anchorage w_ab</th>
                <td>
                  {design.seismic.anchorageRequired
                    ? `${fmt(design.seismic.anchorage, 0)} N/m`
                    : "not required"}
                </td>
              </tr>
            </tbody>
          </table>
          <Calc
            rows={[
              {
                label: "Convective period",
                expr: `K_s = 0.578/√tanh(3.68 × ${fmt(input.shellHeight, 2)}/${fmt(D, 2)}) = ${fmt(design.seismic.ks, 3)}; T_c = 1.8 × K_s × √${fmt(D, 2)}`,
                value: `${fmt(design.seismic.tc, 2)} s`,
              },
              {
                label: "Spectral accelerations",
                expr: `A_i = ${fmt(input.seismic.sds, 2)} × ${fmt(input.seismic.importance, 2)} / ${fmt(input.seismic.ri, 2)}; A_c from S_D1 = ${fmt(input.seismic.sd1, 2)}`,
                value: `Ai ${fmt(design.seismic.ai, 3)} · Ac ${fmt(design.seismic.ac, 3)}`,
              },
              {
                label: "Ringwall moment",
                expr: `M_rw = √(impulsive² + convective²), W_i = ${fmtMass(design.seismic.wi / GRAVITY)}`,
                value: `${fmt(design.seismic.mrw / 1000, 0)} kN·m`,
              },
              {
                label: "Anchorage resistance",
                expr: `w_ab = 1.273 M_rw/D² − W_t (1 − 0.4 A_v), W_t = ${fmt(design.seismic.wt, 0)} N/m`,
                value: design.seismic.anchorageRequired
                  ? `${fmt(design.seismic.anchorage, 0)} N/m`
                  : "not required",
              },
            ]}
          />
        </section>
      ) : null}

      <section>
        <h2>{nWeights}. Weights</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Component / condition</th>
              <th>Mass (kg)</th>
              <th>Weight (kN)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Shell plates</td>
              <td>{fmt(weights.shell, 0)}</td>
              <td>{fmt((weights.shell * GRAVITY) / 1000, 0)}</td>
            </tr>
            <tr>
              <td>Bottom plates</td>
              <td>{fmt(weights.bottom, 0)}</td>
              <td>{fmt((weights.bottom * GRAVITY) / 1000, 0)}</td>
            </tr>
            {bottom.annularPlate > 0 ? (
              <tr>
                <td>Annular ring (extra thickness)</td>
                <td>{fmt(weights.annular, 0)}</td>
                <td>{fmt((weights.annular * GRAVITY) / 1000, 0)}</td>
              </tr>
            ) : null}
            <tr>
              <td>Roof plates</td>
              <td>{fmt(weights.roof, 0)}</td>
              <td>{fmt((weights.roof * GRAVITY) / 1000, 0)}</td>
            </tr>
            <tr>
              <td>
                <strong>Empty weight</strong>
              </td>
              <td>
                <strong>{fmt(weights.total, 0)}</strong>
              </td>
              <td>
                <strong>{fmt((weights.total * GRAVITY) / 1000, 0)}</strong>
              </td>
            </tr>
            <tr>
              <td>Product at design level</td>
              <td>{fmt(weights.product, 0)}</td>
              <td>{fmt((weights.product * GRAVITY) / 1000, 0)}</td>
            </tr>
            <tr>
              <td>Operating weight</td>
              <td>{fmt(weights.operating, 0)}</td>
              <td>{fmt((weights.operating * GRAVITY) / 1000, 0)}</td>
            </tr>
            <tr>
              <td>Hydrostatic test water</td>
              <td>{fmt(weights.water, 0)}</td>
              <td>{fmt((weights.water * GRAVITY) / 1000, 0)}</td>
            </tr>
            <tr>
              <td>
                <strong>Hydrostatic test weight</strong>
              </td>
              <td>
                <strong>{fmt(weights.hydroTest, 0)}</strong>
              </td>
              <td>
                <strong>{fmt((weights.hydroTest * GRAVITY) / 1000, 0)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="report-text">
          Plate weights use the selected commercial thickness. Nozzle necks and flanges, manhole
          covers, roof rafters and girders, ladders, platforms, insulation and internals are not
          included; add them for a purchase weight. The hydrostatic test weight, with water to the
          design liquid level, governs the foundation and anchor design.
        </p>
      </section>

      <section>
        <h2>{nChecks}. Design checks</h2>
        <table className="report-table checks">
          <thead>
            <tr>
              <th>Item</th>
              <th>Value</th>
              <th>Limit</th>
              <th>Clause</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {design.checks.map((check) => (
              <tr key={check.id}>
                <td>{check.label}</td>
                <td>{check.value}</td>
                <td>{check.limit}</td>
                <td>{check.clause}</td>
                <td className={check.pass ? "pass" : "fail"}>{check.pass ? "OK" : "Review"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {design.notices.length > 0 ? (
        <section>
          <h2>{nNotes}. Notes and observations</h2>
          <ul className="report-notes">
            {design.notices.map((notice, index) => (
              <li key={`${notice.clause}-${index}`}>
                <strong>{notice.clause}</strong> — {notice.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="report-foot">
        <p>
          Preliminary design calculation. Only the clauses listed in the module description are
          implemented;{" "}
          {hasOpenings
            ? `the opening reinforcement uses the area-replacement method with the credit limits stated in section ${nOpenings}.`
            : "no openings are scheduled in this calculation."}{" "}
          Roof structure, foundation, anchor bolts, shell nozzle flange ratings, external nozzle
          loads (Annex P), erection tolerances and inspection/testing requirements shall be
          designed and verified separately by a qualified engineer. Verify all results against the
          current edition of API Std 650 before fabrication.
        </p>
        <p>
          {APP_NAME} v{APP_VERSION} · {AUTHOR.name} · {AUTHOR.email} · {AUTHOR.web} — printed{" "}
          {today}.
        </p>
      </footer>

      <TankDiagram design={design} openings={openings} printable />
    </div>
  );
}
