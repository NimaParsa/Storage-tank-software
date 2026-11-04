import { useEffect, useMemo, useState } from "react";
import { designTank } from "./lib/api650";
import {
  buildInput,
  buildOpenings,
  DEFAULT_FORM,
  DEFAULT_OPENINGS,
  newOpening,
  type FormState,
  type OpeningForm,
} from "./lib/form";
import { evaluateOpenings, openingFailures, type OpeningType } from "./lib/openings";
import { fmt, fmtMass } from "./lib/format";
import InputPanel from "./components/InputPanel";
import TankDiagram from "./components/TankDiagram";
import ResultsPanel, { type TabId } from "./components/ResultsPanel";
import SettingsDialog, { type Theme } from "./components/SettingsDialog";

const THEME_KEY = "tankcalc-theme";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "olive") return saved;
  if (saved === "dark") return "olive";
  return "light";
}

function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">
        {value}
        {unit ? <em>{unit}</em> : null}
      </span>
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [openings, setOpenings] = useState<OpeningForm[]>(DEFAULT_OPENINGS);
  const [tab, setTab] = useState<TabId>("shell");
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const design = useMemo(() => designTank(buildInput(form)), [form]);
  const openingResults = useMemo(
    () => evaluateOpenings(design, buildOpenings(openings)),
    [design, openings],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const update = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const applyPreset = (values: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...values }));
    setTab("shell");
  };

  const updateOpening = (id: string, patch: Partial<OpeningForm>) =>
    setOpenings((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );

  const addOpening = (type: OpeningType) =>
    setOpenings((current) => [...current, newOpening(type, current.length + 1)]);

  const removeOpening = (id: string) =>
    setOpenings((current) => current.filter((row) => row.id !== id));

  const printReport = () => {
    setTab("report");
    window.setTimeout(() => window.print(), 80);
  };

  const shellThicknesses = design.courses.map((course) => course.tSelected);
  const issues = design.notices.filter((notice) => notice.level !== "info");
  const infos = design.notices.filter((notice) => notice.level === "info");
  const nozzleIssues = openingFailures(openingResults);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M8 18h32v22a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z" fill="#0f766e" opacity="0.15" />
            <path
              d="M8 18h32v22a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path d="M6 14.5 24 5l18 9.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M8 26h32M8 34h32" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
            <path d="M18 18v26M30 18v26" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
          </svg>
          <div>
            <h1>TankCalc 650</h1>
            <p>Welded steel storage tank design · API Std 650</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="badge">Preliminary design aid</span>
          <button
            className="icon-btn"
            type="button"
            aria-label="Settings and about"
            title="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.5-2-3.5-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.4a7.6 7.6 0 0 0-2.6 1.5l-2.4-.9-2 3.5 2 1.5a7.7 7.7 0 0 0 0 3l-2 1.5 2 3.5 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.4h4l.4-2.4a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.5-2-1.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button className="btn btn-primary" type="button" onClick={printReport}>
            Print / Save PDF
          </button>
        </div>
      </header>

      <div className="layout">
        <InputPanel form={form} onChange={update} onPreset={applyPreset} design={design} />

        <main className="workspace">
          <section className="kpis">
            <Kpi label="Nominal capacity" value={fmt(design.volume, 0)} unit="m³" />
            <Kpi
              label="Shell plates"
              value={`${Math.min(...shellThicknesses)}–${Math.max(...shellThicknesses)}`}
              unit="mm"
            />
            <Kpi
              label="Empty / test weight"
              value={`${fmtMass(design.weights.total)} / ${fmtMass(design.weights.hydroTest)}`}
              unit={`${design.courses.length} courses`}
            />
            <Kpi
              label="Design stresses"
              value={`${design.sd} / ${design.st}`}
              unit="MPa · Sd / St"
            />
          </section>

          {issues.length > 0 ? (
            <ul className="notice-list">
              {issues.map((notice, index) => (
                <li key={`${notice.clause}-${index}`} className={`notice ${notice.level}`}>
                  <span className="notice-tag">{notice.level === "error" ? "Check" : "Note"}</span>
                  <span className="notice-clause">{notice.clause}</span>
                  <span>{notice.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="notice all-clear">
              <span className="notice-tag ok">OK</span>
              <span>
                No blocking issues detected for the geometry and loads entered. Seismic screening is
                shown in its own tab when enabled.
              </span>
            </div>
          )}

          {nozzleIssues > 0 ? (
            <div className="notice">
              <span className="notice-tag">Note</span>
              <span className="notice-clause">§5.7</span>
              <span>
                {nozzleIssues} opening check{nozzleIssues === 1 ? "" : "s"} need review — see the
                Openings tab.
              </span>
            </div>
          ) : null}

          <div className="workbench">
            <TankDiagram design={design} openings={openingResults} />
            <ResultsPanel
              design={design}
              tab={tab}
              onTab={setTab}
              onEnableSeismic={() => update("seismicEnabled", "yes")}
              openingRows={openings}
              openingResults={openingResults}
              onOpeningChange={updateOpening}
              onAddOpening={addOpening}
              onRemoveOpening={removeOpening}
            />
          </div>

          {infos.length > 0 ? (
            <ul className="notice-list infos">
              {infos.map((notice, index) => (
                <li key={`info-${index}`} className="notice info">
                  <span className="notice-tag">Info</span>
                  <span className="notice-clause">{notice.clause}</span>
                  <span>{notice.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </main>
      </div>

      <SettingsDialog
        open={settingsOpen}
        theme={theme}
        onTheme={setTheme}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
