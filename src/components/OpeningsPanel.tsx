import type { TankDesign } from "../lib/api650";
import { fmt } from "../lib/format";
import type { OpeningForm } from "../lib/form";
import {
  openingTypeLabel,
  sizeKeyFor,
  sizeLabelFor,
  sizeOptionsFor,
  type OpeningResult,
  type OpeningType,
} from "../lib/openings";

interface Props {
  design: TankDesign;
  rows: OpeningForm[];
  results: OpeningResult[];
  onChange: (id: string, patch: Partial<OpeningForm>) => void;
  onAdd: (type: OpeningType) => void;
  onRemove: (id: string) => void;
}

const TYPES: OpeningType[] = ["shell-nozzle", "shell-manhole", "roof-nozzle", "roof-manhole"];

export default function OpeningsPanel({ results, rows, onChange, onAdd, onRemove }: Props) {
  const failures = results.reduce(
    (count, result) => count + result.checks.filter((check) => !check.pass).length,
    0,
  );

  return (
    <div className="tab-panel">
      <div className="opening-toolbar">
        <div>
          <h3 className="section-title">Openings schedule</h3>
          <p className="muted small">
            Nozzle and manhole sizes are stated in inches (NPS). Selecting a size fills the outside
            diameter and neck wall from ASME B36.10 Schedule 40 pipe or the Table 5.13a manhole
            dimensions; choose <em>Custom</em> to enter a non-standard OD. Area-replacement check
            per §5.7.2.
          </p>
        </div>
        <div className="opening-actions">
          <button className="btn btn-ghost" type="button" onClick={() => onAdd("shell-nozzle")}>
            + Nozzle
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => onAdd("shell-manhole")}>
            + Shell manhole
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => onAdd("roof-manhole")}>
            + Roof manhole
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="edit-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Type</th>
              <th>Size (in)</th>
              <th>t neck (mm)</th>
              <th>Proj. (mm)</th>
              <th>Pad</th>
              <th>t pad</th>
              <th>w pad</th>
              <th>Elev. (m)</th>
              <th>Az. (°)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const roof = row.type === "roof-nozzle" || row.type === "roof-manhole";
              const options = sizeOptionsFor(row.type);
              const selected = row.size || sizeKeyFor(row.type, Number(row.od));
              return (
                <tr key={row.id}>
                  <td>
                    <input
                      className="w-tag"
                      value={row.tag}
                      onChange={(event) => onChange(row.id, { tag: event.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="w-type"
                      value={row.type}
                      onChange={(event) => {
                        const type = event.target.value as OpeningType;
                        const next = sizeOptionsFor(type);
                        const match = next.find(
                          (option) => Math.abs(option.od - Number(row.od)) < 0.6,
                        );
                        onChange(
                          row.id,
                          match
                            ? { type, size: match.key }
                            : {
                                type,
                                size: next[0].key,
                                od: String(next[0].od),
                                neck: String(next[0].neck),
                                padWidth: String(next[0].padWidth ?? row.padWidth),
                              },
                        );
                      }}
                    >
                      {TYPES.map((type) => (
                        <option key={type} value={type}>
                          {openingTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="w-size"
                      value={selected}
                      onChange={(event) => {
                        const key = event.target.value;
                        if (key === "custom") {
                          onChange(row.id, { size: "custom" });
                          return;
                        }
                        const option = options.find((item) => item.key === key);
                        if (!option) return;
                        onChange(row.id, {
                          size: option.key,
                          od: String(option.od),
                          neck: String(option.neck),
                          ...(option.padWidth ? { padWidth: String(option.padWidth) } : {}),
                        });
                      }}
                    >
                      {options.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.key}
                        </option>
                      ))}
                      <option value="custom">Custom…</option>
                    </select>
                    {selected === "custom" ? (
                      <input
                        className="w-od"
                        type="number"
                        value={row.od}
                        step="0.1"
                        title="Outside diameter, mm"
                        onChange={(event) => onChange(row.id, { od: event.target.value })}
                      />
                    ) : (
                      <div className="size-note">{selected === "custom" ? "" : `${row.od} mm OD`}</div>
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.neck}
                      step="0.1"
                      onChange={(event) => onChange(row.id, { neck: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.projection}
                      step="10"
                      onChange={(event) => onChange(row.id, { projection: event.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="w-pad"
                      value={row.pad}
                      onChange={(event) => onChange(row.id, { pad: event.target.value })}
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.padThickness}
                      step="0.5"
                      onChange={(event) => onChange(row.id, { padThickness: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.padWidth}
                      step="5"
                      onChange={(event) => onChange(row.id, { padWidth: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.elevation}
                      step="0.1"
                      disabled={roof}
                      onChange={(event) => onChange(row.id, { elevation: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.azimuth}
                      step="5"
                      disabled={roof}
                      onChange={(event) => onChange(row.id, { azimuth: event.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="mini-btn"
                      title="Remove opening"
                      onClick={() => onRemove(row.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Reinforcement results</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Type</th>
              <th>Size</th>
              <th>Course</th>
              <th>d (mm)</th>
              <th>t_r (mm)</th>
              <th>A req.</th>
              <th>Shell</th>
              <th>Neck</th>
              <th>Pad</th>
              <th>Total</th>
              <th>Prov./req.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.input.id}>
                <td className="strong">{result.input.tag}</td>
                <td>{openingTypeLabel(result.input.type)}</td>
                <td>{sizeLabelFor(result.input.type, result.input.od)}</td>
                <td>{result.course ?? "roof"}</td>
                <td>{fmt(result.d, 1)}</td>
                <td>{fmt(result.tr, 2)}</td>
                <td>{fmt(result.aReq, 0)}</td>
                <td>{fmt(result.aShell, 0)}</td>
                <td>{fmt(result.aNeck, 0)}</td>
                <td>{fmt(result.aPad, 0)}</td>
                <td className="strong">{fmt(result.aProvided, 0)}</td>
                <td>{fmt(result.utilisation, 2)}</td>
                <td>
                  <span className={`chip ${result.pass ? "ok" : "bad"}`}>
                    {result.exemption && result.pass ? "exempt" : result.pass ? "OK" : "review"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted small">
        Areas in mm². Credit limits applied: shell excess over the opening width <em>d</em>, neck
        excess over a reinforcement zone of 2.5·t_n each side of the plate (limited by the actual
        projection), pad credited over its full radial width, and a 6 mm minimum neck wall pending
        the tabulated nozzle walls of Table 5.6a. A shortfall is reported below together with a pad
        width that would close it.
      </p>

      <h3 className="section-title">
        Opening checks {failures > 0 ? `— ${failures} to review` : "— all satisfied"}
      </h3>
      <div className="table-wrap">
        <table className="data-table">
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
            {results.flatMap((result) =>
              result.checks.map((check) => (
                <tr key={check.id}>
                  <td>
                    {check.label}
                    {check.note ? <div className="check-note">{check.note}</div> : null}
                  </td>
                  <td>{check.value}</td>
                  <td>{check.limit}</td>
                  <td>{check.clause}</td>
                  <td>
                    <span className={`chip ${check.pass ? "ok" : "bad"}`}>
                      {check.pass ? "OK" : "review"}
                    </span>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
