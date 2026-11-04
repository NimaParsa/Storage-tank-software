import { useState } from "react";
import { allowableStresses, MATERIALS, type TankDesign } from "../lib/api650";
import { PRESETS, type FormState } from "../lib/form";
import { fmt } from "../lib/format";

interface Props {
  form: FormState;
  onChange: (key: keyof FormState, value: string) => void;
  onPreset: (values: Partial<FormState>) => void;
  design: TankDesign;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  step?: string;
  min?: string;
  hint?: string;
}

function Field({ label, value, onChange, unit, step = "any", min = "0", hint }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          onChange={(event) => onChange(event.target.value)}
        />
        {unit ? <span className="unit">{unit}</span> : null}
      </span>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
      </span>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export default function InputPanel({ form, onChange, onPreset, design }: Props) {
  const [preset, setPreset] = useState("crude");
  const material = MATERIALS.find((m) => m.id === form.materialId) ?? MATERIALS[5];
  const allowables = allowableStresses(material.sy, material.su);

  return (
    <aside className="input-panel">
      <div className="panel-head">
        <h2>Design data</h2>
        <p>SI units · API 650, 13th edition</p>
      </div>

      <section className="panel-section">
        <h3>Project</h3>
        <Select
          label="Load a preset"
          value={preset}
          onChange={(value) => {
            setPreset(value);
            const found = PRESETS.find((item) => item.id === value);
            if (found) onPreset(found.values);
          }}
        >
          {PRESETS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
        <label className="field">
          <span className="field-label">Project</span>
          <span className="field-input">
            <input
              type="text"
              value={form.projectName}
              onChange={(event) => onChange("projectName", event.target.value)}
            />
          </span>
        </label>
        <label className="field">
          <span className="field-label">Tank tag</span>
          <span className="field-input">
            <input
              type="text"
              value={form.tankTag}
              onChange={(event) => onChange("tankTag", event.target.value)}
            />
          </span>
        </label>
      </section>

      <section className="panel-section">
        <h3>Geometry</h3>
        <Field
          label="Nominal diameter D"
          value={form.diameter}
          onChange={(value) => onChange("diameter", value)}
          unit="m"
        />
        <Field
          label="Shell height H"
          value={form.shellHeight}
          onChange={(value) => onChange("shellHeight", value)}
          unit="m"
        />
        <Field
          label="Design liquid level"
          value={form.designLevel}
          onChange={(value) => onChange("designLevel", value)}
          unit="m"
          hint="Measured from the tank bottom (top of bottom plate)."
        />
        <Field
          label="Target course height"
          value={form.courseHeight}
          onChange={(value) => onChange("courseHeight", value)}
          unit="m"
          hint="Courses are equalised; plate width must be ≥ 1.8 m."
        />
      </section>

      <section className="panel-section">
        <h3>Product</h3>
        <label className="field">
          <span className="field-label">Stored product</span>
          <span className="field-input">
            <input
              type="text"
              value={form.productName}
              onChange={(event) => onChange("productName", event.target.value)}
            />
          </span>
        </label>
        <Field
          label="Design specific gravity G"
          value={form.sg}
          onChange={(value) => onChange("sg", value)}
          unit="—"
        />
        <Field
          label="Corrosion allowance"
          value={form.ca}
          onChange={(value) => onChange("ca", value)}
          unit="mm"
          hint="Added to design thickness only, not to the hydrostatic test thickness."
        />
      </section>

      <section className="panel-section">
        <h3>Material</h3>
        <Select
          label="Shell / bottom / roof plate"
          value={form.materialId}
          onChange={(value) => onChange("materialId", value)}
        >
          {MATERIALS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
        {form.materialId === "custom" ? (
          <div className="field-row">
            <Field
              label="Min. yield Sy"
              value={form.sy}
              onChange={(value) => onChange("sy", value)}
              unit="MPa"
            />
            <Field
              label="Min. tensile Su"
              value={form.su}
              onChange={(value) => onChange("su", value)}
              unit="MPa"
            />
          </div>
        ) : (
          <p className="readout">
            Sy {material.sy} MPa · Su {material.su} MPa
            <br />
            <strong>
              Sd {allowables.sd} MPa · St {allowables.st} MPa
            </strong>{" "}
            (Table 5-2a)
          </p>
        )}
        <Field
          label="Joint efficiency E"
          value={form.jointEfficiency}
          onChange={(value) => onChange("jointEfficiency", value)}
          unit="—"
          step="0.05"
          min="0.4"
          hint="Use 1.00 for new API 650 tanks."
        />
        <div className="segmented" role="group" aria-label="Shell design method">
          <button
            type="button"
            className={form.shellMethod === "one-foot" ? "active" : ""}
            onClick={() => onChange("shellMethod", "one-foot")}
          >
            One-foot method
          </button>
          <button
            type="button"
            className={form.shellMethod === "vdp" ? "active" : ""}
            onClick={() => onChange("shellMethod", "vdp")}
          >
            Variable design point
          </button>
        </div>
        <p className="readout small">
          §5.6.3.2 one-foot method is the default. §5.6.3.3 variable design point usually saves plate
          in the upper courses of large tanks.
        </p>
      </section>

      <section className="panel-section">
        <h3>Roof &amp; bottom</h3>
        <Select
          label="Roof type"
          value={form.roofType}
          onChange={(value) => onChange("roofType", value)}
        >
          <option value="supported-cone">Supported cone (rafters)</option>
          <option value="self-supporting-cone">Self-supporting cone</option>
          <option value="none">Open top</option>
        </Select>
        <Field
          label="Roof slope"
          value={form.roofSlope}
          onChange={(value) => onChange("roofSlope", value)}
          unit="deg"
          hint={`≈ 1:${fmt(1 / Math.tan((Number(form.roofSlope) * Math.PI) / 180), 1)} slope`}
        />
        <Select
          label="Annular bottom plates"
          value={form.useAnnular}
          onChange={(value) => onChange("useAnnular", value)}
        >
          <option value="yes">Provided</option>
          <option value="no">Not provided</option>
        </Select>
      </section>

      <section className="panel-section">
        <h3>Loads</h3>
        <Field
          label="Design wind speed (3-s gust)"
          value={form.windSpeed}
          onChange={(value) => onChange("windSpeed", value)}
          unit="km/h"
        />
        <div className="field-row">
          <Field
            label="Roof live load"
            value={form.roofLive}
            onChange={(value) => onChange("roofLive", value)}
            unit="kPa"
            hint="Minimum 1.2 kPa per §5.10.2."
          />
          <Field
            label="Snow load"
            value={form.snow}
            onChange={(value) => onChange("snow", value)}
            unit="kPa"
          />
        </div>
        <Field
          label="Design external pressure"
          value={form.externalPressure}
          onChange={(value) => onChange("externalPressure", value)}
          unit="kPa"
          hint="0.25 kPa unless the Purchaser specifies otherwise."
        />
      </section>

      <section className="panel-section">
        <h3>Seismic (Annex E)</h3>
        <Select
          label="Screening"
          value={form.seismicEnabled}
          onChange={(value) => onChange("seismicEnabled", value)}
        >
          <option value="no">Disabled</option>
          <option value="yes">Enabled</option>
        </Select>
        <div className="field-row">
          <Field
            label="S_DS"
            value={form.sds}
            onChange={(value) => onChange("sds", value)}
            unit="g"
          />
          <Field
            label="S_D1"
            value={form.sd1}
            onChange={(value) => onChange("sd1", value)}
            unit="g"
          />
        </div>
        <div className="field-row">
          <Field
            label="T_L"
            value={form.tl}
            onChange={(value) => onChange("tl", value)}
            unit="s"
          />
          <Field
            label="Importance I"
            value={form.importance}
            onChange={(value) => onChange("importance", value)}
            unit="—"
            step="0.05"
          />
        </div>
        <div className="field-row">
          <Field
            label="Ri"
            value={form.ri}
            onChange={(value) => onChange("ri", value)}
            unit="—"
            step="0.5"
          />
          <Field
            label="Rc"
            value={form.rc}
            onChange={(value) => onChange("rc", value)}
            unit="—"
            step="0.5"
          />
        </div>
      </section>

      <div className="panel-foot">
        <p>
          Shell {fmt(design.shell.avgThickness, 1)} mm average · {design.courses.length} courses ·
          bottom {design.bottom.plate} mm
        </p>
      </div>
    </aside>
  );
}
