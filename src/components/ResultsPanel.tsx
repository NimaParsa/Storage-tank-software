import type { TankDesign } from "../lib/api650";
import { fmt, fmtMass } from "../lib/format";
import type { OpeningForm } from "../lib/form";
import type { OpeningResult, OpeningType } from "../lib/openings";
import OpeningsPanel from "./OpeningsPanel";
import Report from "./Report";
import WeightsPanel from "./WeightsPanel";

export type TabId =
  | "shell"
  | "bottom"
  | "wind"
  | "seismic"
  | "openings"
  | "weights"
  | "report";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "shell", label: "Shell" },
  { id: "bottom", label: "Bottom & roof" },
  { id: "wind", label: "Wind & stability" },
  { id: "seismic", label: "Seismic" },
  { id: "openings", label: "Openings" },
  { id: "weights", label: "Weights" },
  { id: "report", label: "Design report" },
];

interface Props {
  design: TankDesign;
  tab: TabId;
  onTab: (tab: TabId) => void;
  onEnableSeismic: () => void;
  openingRows: OpeningForm[];
  openingResults: OpeningResult[];
  onOpeningChange: (id: string, patch: Partial<OpeningForm>) => void;
  onAddOpening: (type: OpeningType) => void;
  onRemoveOpening: (id: string) => void;
}

function Chip({ pass, children }: { pass: boolean; children: React.ReactNode }) {
  return <span className={`chip ${pass ? "ok" : "bad"}`}>{children}</span>;
}

export default function ResultsPanel({
  design,
  tab,
  onTab,
  onEnableSeismic,
  openingRows,
  openingResults,
  onOpeningChange,
  onAddOpening,
  onRemoveOpening,
}: Props) {
  const { input } = design;
  const first = design.courses[0];

  return (
    <section className="card results-card">
      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`tab ${tab === item.id ? "active" : ""}`}
            onClick={() => onTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "shell" ? (
        <div className="tab-panel">
          <div className="formula-card">
            <div className="formula-head">
              <h3>
                {input.shellMethod === "vdp"
                  ? "§5.6.3.3 Variable-design-point method"
                  : "§5.6.3.2 One-foot method"}
              </h3>
              <span className="muted">
                Sd {design.sd} MPa · St {design.st} MPa · E {input.jointEfficiency}
              </span>
            </div>
            {input.shellMethod === "vdp" ? (
              <>
                <code className="formula">
                  t₁ = [1.06 − (0.0696 D/H) √(H·G/Sd)] · (4.9 H D G / Sd) + CA
                </code>
                <code className="formula">
                  x_e = min[0.61 √(R·t_u) + 320 C H, 1000 C H, 1.22 √(R·t_u)]
                </code>
                <code className="formula">
                  t_i = 4.9 D (H − x_e/1000) G / Sd + CA
                </code>
              </>
            ) : (
              <>
                <code className="formula">t_d = 4.9·D·(H − 0.3)·G / (S_d·E) + CA</code>
                <code className="formula">t_t = 4.9·D·(H − 0.3) / (S_t·E)</code>
              </>
            )}
            <p className="substituted">
              1st course: t_d = 4.9 × {fmt(input.diameter, 2)} × {fmt(first.head, 2)} ×{" "}
              {fmt(input.sg, 3)} / ({design.sd} × {input.jointEfficiency}) +{" "}
              {fmt(input.corrosionAllowance, 1)} = <strong>{fmt(first.td, 2)} mm</strong> · t_t ={" "}
              <strong>{fmt(first.tt, 2)} mm</strong>
            </p>
            <p className="muted small">
              H is measured from the bottom of the course under consideration to the design liquid
              level. Minimum nominal thickness for D = {fmt(input.diameter, 2)} m is {design.tMin} mm
              (Table 5-1).
            </p>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Elev. (m)</th>
                  <th>H (m)</th>
                  <th>t_d (mm)</th>
                  <th>t_t (mm)</th>
                  <th>t req.</th>
                  <th>Plate</th>
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
                    <td>{fmt(course.td, 2)}</td>
                    <td>{fmt(course.tt, 2)}</td>
                    <td>{fmt(course.tRequired, 2)}</td>
                    <td className="strong">{course.tSelected}</td>
                    <td>
                      <span className={`gov ${course.governing}`}>
                        {course.governing === "minimum"
                          ? "min. thickness"
                          : course.governing === "test"
                            ? "test"
                            : "design"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="summary-grid">
            <div>
              <span>Course plate width</span>
              <strong>{fmt(design.shell.plateWidth * 1000, 0)} mm</strong>
            </div>
            <div>
              <span>Average shell thickness</span>
              <strong>{fmt(design.shell.avgThickness, 2)} mm</strong>
            </div>
            <div>
              <span>Shell plate area</span>
              <strong>{fmt(design.shell.area, 0)} m²</strong>
            </div>
            <div>
              <span>Shell weight</span>
              <strong>{fmtMass(design.weights.shell)}</strong>
            </div>
          </div>
          <p className="muted small">
            Required thicknesses are rounded up to commercial plate: {design.courses.map((c) => c.tSelected).join(", ")} mm.
            Hydrostatic test thickness uses water (G = 1.0) with no corrosion allowance.
          </p>
        </div>
      ) : null}

      {tab === "bottom" ? (
        <div className="tab-panel">
          <h3 className="section-title">Bottom plates</h3>
          <div className="table-wrap">
            <table className="data-table key-value">
              <tbody>
                <tr>
                  <th>Bottom plate thickness</th>
                  <td>{design.bottom.plate} mm</td>
                  <td className="muted">6 mm nominal + CA · §5.4.1</td>
                </tr>
                <tr>
                  <th>First-course product stress</th>
                  <td>{fmt(design.bottom.stress, 0)} MPa</td>
                  <td className="muted">Entering Table 5-1a</td>
                </tr>
                <tr>
                  <th>Annular plate thickness</th>
                  <td>{design.bottom.annularPlate > 0 ? `${design.bottom.annularPlate} mm` : "not provided"}</td>
                  <td className="muted">Table 5-1a + CA · §5.5.1</td>
                </tr>
                <tr>
                  <th>Annular radial width</th>
                  <td>{design.bottom.annularPlate > 0 ? `${design.bottom.annularWidth} mm` : "—"}</td>
                  <td className="muted">max(600, 215 t_b/√(H·G)) · §5.5.2</td>
                </tr>
                <tr>
                  <th>Bottom plate + annular weight</th>
                  <td>
                    {fmtMass(design.bottom.weight + design.bottom.annularWeight)}
                  </td>
                  <td className="muted" />
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="section-title">Roof</h3>
          <div className="table-wrap">
            <table className="data-table key-value">
              <tbody>
                <tr>
                  <th>Roof type</th>
                  <td>
                    {input.roofType === "none"
                      ? "Open top"
                      : input.roofType === "supported-cone"
                        ? "Supported cone (rafters)"
                        : "Self-supporting cone"}
                  </td>
                  <td className="muted">§5.10</td>
                </tr>
                <tr>
                  <th>Slope</th>
                  <td>
                    {fmt(input.roofSlope, 1)}° (1:{fmt(1 / Math.tan((input.roofSlope * Math.PI) / 180), 1)})
                  </td>
                  <td className="muted">Rise {fmt(design.roof.rise, 2)} m</td>
                </tr>
                <tr>
                  <th>Roof plate thickness</th>
                  <td>{design.roof.plate > 0 ? `${design.roof.plate} mm` : "—"}</td>
                  <td className="muted">
                    {input.roofType === "self-supporting-cone" ? "§5.10.5.1" : "min. 5 mm + CA · §5.10.2"}
                  </td>
                </tr>
                <tr>
                  <th>Roof area / weight</th>
                  <td>
                    {fmt(design.roof.area, 0)} m² · {fmtMass(design.roof.weight)}
                  </td>
                  <td className="muted" />
                </tr>
              </tbody>
            </table>
          </div>

          {design.roof.plate > 0 ? (
            <>
              <h3 className="section-title">Roof design loads</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Case</th>
                      <th>Dead (kPa)</th>
                      <th>Live/snow (kPa)</th>
                      <th>External P (kPa)</th>
                      <th>Total (kPa)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>DL + (Lr or S) + 0.4 Pe</td>
                      <td>{fmt(design.roof.deadLoad, 3)}</td>
                      <td>{fmt(Math.max(design.roof.liveLoad, design.roof.snowLoad), 2)}</td>
                      <td>{fmt(0.4 * design.roof.externalPressure, 3)}</td>
                      <td>{fmt(design.roof.t1, 3)}</td>
                    </tr>
                    <tr>
                      <td>DL + Pe + 0.4 (Lr or S)</td>
                      <td>{fmt(design.roof.deadLoad, 3)}</td>
                      <td>{fmt(0.4 * Math.max(design.roof.liveLoad, design.roof.snowLoad), 2)}</td>
                      <td>{fmt(design.roof.externalPressure, 3)}</td>
                      <td>{fmt(design.roof.t2, 3)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="muted small">
                Governing uniform load T = {fmt(design.roof.T, 3)} kPa. Roof rafters, girders and the
                roof-to-shell compression ring are not designed by this module — size them for the
                same loads.
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "wind" ? (
        <div className="tab-panel">
          <div className="table-wrap">
            <table className="data-table key-value">
              <tbody>
                <tr>
                  <th>Design wind speed (3-s gust)</th>
                  <td>{fmt(input.windSpeed, 0)} km/h</td>
                  <td className="muted">{fmt(input.windSpeed / 3.6, 1)} m/s</td>
                </tr>
                <tr>
                  <th>Velocity pressure q</th>
                  <td>{fmt(design.wind.q, 3)} kPa</td>
                  <td className="muted">q = 0.613 V²</td>
                </tr>
                <tr>
                  <th>Wind force on shell</th>
                  <td>{fmt(design.wind.force, 1)} kN</td>
                  <td className="muted">Cf = 0.8 on projected area</td>
                </tr>
                <tr>
                  <th>Overturning moment</th>
                  <td>{fmt(design.wind.moment, 0)} kN·m</td>
                  <td className="muted">§5.11.2</td>
                </tr>
                <tr>
                  <th>Resisting moment (2/3 W · D/2)</th>
                  <td>{fmt(design.wind.resisting, 0)} kN·m</td>
                  <td className="muted" />
                </tr>
                <tr>
                  <th>Stability</th>
                  <td>
                    <Chip pass={design.wind.stable}>
                      {design.wind.stable ? "Stable without anchors" : "Anchorage required"}
                    </Chip>
                  </td>
                  <td className="muted">
                    ratio {fmt(design.wind.moment / Math.max(design.wind.resisting, 1), 2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="section-title">Top wind girder — §5.9.6.1</h3>
          <div className="table-wrap">
            <table className="data-table key-value">
              <tbody>
                <tr>
                  <th>Required section modulus Z</th>
                  <td className="strong">{fmt(design.wind.zRequired, 0)} cm³</td>
                  <td className="muted">Z = (D²H/17)(V/190)²</td>
                </tr>
                <tr>
                  <th>Maximum unstiffened height H₁</th>
                  <td>{fmt(design.wind.h1, 2)} m</td>
                  <td className="muted">H₁ = 9.47 t (t/D)^1.5 (190/V)²</td>
                </tr>
                <tr>
                  <th>Transformed shell width W_tr</th>
                  <td>{fmt(design.wind.wtr, 2)} m</td>
                  <td className="muted">W_tr = Σ h (t_top/t_i)^2.5</td>
                </tr>
                <tr>
                  <th>Intermediate wind girders</th>
                  <td className="strong">{design.wind.intermediateGirders}</td>
                  <td className="muted">§5.9.7.2</td>
                </tr>
                {design.wind.girderElevations.length > 0 ? (
                  <tr>
                    <th>Girder elevations</th>
                    <td colSpan={2}>
                      {design.wind.girderElevations.map((elevation) => `${fmt(elevation, 2)} m`).join(", ")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            Select a girder with a section modulus at least {fmt(design.wind.zRequired, 0)} cm³, including
            a contributing width of shell 16t above and below the ring (§5.9.6.1). The top wind girder
            is mandatory for open-top tanks.
          </p>
        </div>
      ) : null}

      {tab === "seismic" ? (
        <div className="tab-panel">
          {design.seismic ? (
            <>
              <div className="table-wrap">
                <table className="data-table key-value">
                  <tbody>
                    <tr>
                      <th>Spectral accelerations</th>
                      <td>
                        Ai {fmt(design.seismic.ai, 3)} · Ac {fmt(design.seismic.ac, 3)} · Av{" "}
                        {fmt(design.seismic.av, 3)}
                      </td>
                      <td className="muted">§E.4.6</td>
                    </tr>
                    <tr>
                      <th>Convective period Tc</th>
                      <td>{fmt(design.seismic.tc, 2)} s</td>
                      <td className="muted">Ks = {fmt(design.seismic.ks, 3)}</td>
                    </tr>
                    <tr>
                      <th>Effective weights Wi / Wc</th>
                      <td>
                        {fmtMass(design.seismic.wi / 9.81)} / {fmtMass(design.seismic.wc / 9.81)}
                      </td>
                      <td className="muted">§E.6.1.1</td>
                    </tr>
                    <tr>
                      <th>Base shear</th>
                      <td>{fmt(design.seismic.baseShear / 1000, 0)} kN</td>
                      <td className="muted">SRSS of impulsive + convective</td>
                    </tr>
                    <tr>
                      <th>Ringwall moment Mrw</th>
                      <td>{fmt(design.seismic.mrw / 1000, 0)} kN·m</td>
                      <td className="muted">§E.6.1.5</td>
                    </tr>
                    <tr>
                      <th>Slab moment Ms</th>
                      <td>{fmt(design.seismic.ms / 1000, 0)} kN·m</td>
                      <td className="muted">§E.6.1.5</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="section-title">Dynamic hoop stress — §E.6.1.4</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Y (m)</th>
                      <th>Ni (N/mm)</th>
                      <th>Nc (N/mm)</th>
                      <th>Nh (N/mm)</th>
                      <th>σt (MPa)</th>
                      <th>1.33 Sd</th>
                      <th>Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {design.seismic.courses.map((course) => (
                      <tr key={course.index}>
                        <td>{course.index}</td>
                        <td>{fmt(course.Y, 2)}</td>
                        <td>{fmt(course.ni, 1)}</td>
                        <td>{fmt(course.nc, 1)}</td>
                        <td>{fmt(course.nh, 1)}</td>
                        <td className="strong">{fmt(course.sigmaT, 1)}</td>
                        <td>{fmt(course.allowable, 0)}</td>
                        <td>
                          <Chip pass={course.ratio <= 1}>{fmt(course.ratio, 2)}</Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="summary-grid">
                <div>
                  <span>Shell compression σc</span>
                  <strong>{fmt(design.seismic.sigmaC, 1)} MPa</strong>
                </div>
                <div>
                  <span>Allowable Fc</span>
                  <strong>{fmt(design.seismic.fc, 1)} MPa</strong>
                </div>
                <div>
                  <span>Compression ratio</span>
                  <strong>{fmt(design.seismic.compressionRatio, 2)}</strong>
                </div>
                <div>
                  <span>Anchorage w_ab</span>
                  <strong>
                    {design.seismic.anchorageRequired
                      ? `${fmt(design.seismic.anchorage, 0)} N/m`
                      : "not required"}
                  </strong>
                </div>
              </div>
              <p className="muted small">
                Annex E screening using the design spectral accelerations entered. Long-period and
                site-specific effects, sloshing freeboard, anchor bolt and chair design, and
                foundation loads are outside this module.
              </p>
            </>
          ) : (
            <div className="empty-state">
              <h3>Annex E seismic screening is off</h3>
              <p>
                Enable it to check dynamic hoop stress, longitudinal shell compression and the minimum
                anchorage resistance for the design spectral accelerations.
              </p>
              <button className="btn btn-primary" type="button" onClick={onEnableSeismic}>
                Enable seismic screening
              </button>
            </div>
          )}
        </div>
      ) : null}

      {tab === "openings" ? (
        <OpeningsPanel
          design={design}
          rows={openingRows}
          results={openingResults}
          onChange={onOpeningChange}
          onAdd={onAddOpening}
          onRemove={onRemoveOpening}
        />
      ) : null}

      {tab === "weights" ? <WeightsPanel design={design} /> : null}

      {tab === "report" ? <Report design={design} openings={openingResults} /> : null}
    </section>
  );
}
