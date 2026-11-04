import { GRAVITY, type TankDesign } from "../lib/api650";
import { fmt, fmtMass } from "../lib/format";

const kN = (kg: number): string => fmt((kg * GRAVITY) / 1000, 0);

export default function WeightsPanel({ design }: { design: TankDesign }) {
  const { weights, bottom, roof } = design;
  const courseArea = (height: number) => Math.PI * design.input.diameter * height;

  const items = [
    {
      key: "shell",
      label: "Shell plates",
      detail: `${design.courses.length} courses · ${fmt(design.shell.area, 0)} m²`,
      kg: weights.shell,
    },
    {
      key: "bottom",
      label: "Bottom plates",
      detail: `${fmt(bottom.area, 0)} m² at ${bottom.plate} mm`,
      kg: weights.bottom,
    },
    ...(bottom.annularPlate > 0
      ? [
          {
            key: "annular",
            label: "Annular ring — extra thickness",
            detail: `${bottom.annularPlate} mm × ${fmt(bottom.annularWidth, 0)} mm wide`,
            kg: weights.annular,
          },
        ]
      : []),
    {
      key: "roof",
      label: "Roof plates",
      detail:
        roof.plate > 0 ? `${fmt(roof.area, 0)} m² at ${roof.plate} mm` : "open top — no roof plates",
      kg: weights.roof,
    },
  ];

  const totals = [
    {
      key: "empty",
      label: "Empty (erected) weight",
      detail: "shell + bottom + roof plates",
      kg: weights.total,
      strong: true,
    },
    {
      key: "product",
      label: "Product weight at design level",
      detail: `${fmt(design.input.designLevel, 2)} m · G = ${fmt(design.input.sg, 3)}`,
      kg: weights.product,
    },
    {
      key: "water",
      label: "Hydrostatic test water",
      detail: `${fmt(design.input.designLevel, 2)} m of water · G = 1.000`,
      kg: weights.water,
    },
    {
      key: "operating",
      label: "Operating weight",
      detail: "empty + product",
      kg: weights.operating,
      strong: true,
    },
    {
      key: "test",
      label: "Hydrostatic test weight",
      detail: "empty + water — governs the foundation",
      kg: weights.hydroTest,
      strong: true,
    },
  ];

  return (
    <div className="tab-panel">
      <div className="formula-card">
        <div className="formula-head">
          <h3>Weight summary</h3>
          <span className="muted">steel density 7850 kg/m³ · water 1000 kg/m³</span>
        </div>
        <code className="formula">
          W_steel = Σ (plate area × thickness × 7850) · W_product = (πD²/4) · H_L · G · 1000
        </code>
        <p className="substituted">
          The hydrostatic test weight is the governing foundation and anchor load:{" "}
          <strong>{fmtMass(weights.hydroTest)}</strong> ({kN(weights.hydroTest)} kN).
        </p>
      </div>

      <h3 className="section-title">Empty weight</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Basis</th>
              <th className="num">Mass (kg)</th>
              <th className="num">Weight (kN)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}>
                <td className="strong">{item.label}</td>
                <td className="muted">{item.detail}</td>
                <td className="num">{fmt(item.kg, 0)}</td>
                <td className="num">{kN(item.kg)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td className="strong">Empty weight</td>
              <td className="muted">excludes nozzles, ladders, platforms, internals, insulation</td>
              <td className="num strong">{fmt(weights.total, 0)}</td>
              <td className="num strong">{kN(weights.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Operating and test weights</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Condition</th>
              <th>Basis</th>
              <th className="num">Mass (kg)</th>
              <th className="num">Weight (kN)</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((item) => (
              <tr key={item.key} className={item.strong ? "total-row" : undefined}>
                <td className={item.strong ? "strong" : undefined}>{item.label}</td>
                <td className="muted">{item.detail}</td>
                <td className="num">{fmt(item.kg, 0)}</td>
                <td className="num">{kN(item.kg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Shell plates by course</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Elevation (m)</th>
              <th>Plate (mm)</th>
              <th className="num">Height (m)</th>
              <th className="num">Area (m²)</th>
              <th className="num">Mass (kg)</th>
            </tr>
          </thead>
          <tbody>
            {design.courses.map((course) => (
              <tr key={course.index}>
                <td>{course.index}</td>
                <td>
                  {fmt(course.bottom, 2)}–{fmt(course.top, 2)}
                </td>
                <td className="strong">{course.tSelected}</td>
                <td className="num">{fmt(course.height, 2)}</td>
                <td className="num">{fmt(courseArea(course.height), 0)}</td>
                <td className="num">{fmt(course.weight, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted small">
        Plate masses use the selected commercial thickness and the mean shell diameter. Nozzle
        necks, flanges and reinforcing pads, manhole covers, roof rafters and girders, ladders,
        platforms, insulation and internal fittings are not included — add them for a purchase
        weight. The hydrostatic test weight assumes water to the design liquid level.
      </p>
    </div>
  );
}
