import { useEffect } from "react";
import {
  APP_NAME,
  APP_VERSION,
  AUTHOR,
  FIRST_REVISION,
  LAST_MODIFIED,
  formatDate,
} from "../lib/about";

export type Theme = "light" | "olive";

interface Props {
  open: boolean;
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onClose: () => void;
}

export default function SettingsDialog({ open, theme, onTheme, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="dialog-head">
          <div>
            <h2 id="settings-title">Settings</h2>
            <p className="muted small">Appearance and software information</p>
          </div>
          <button className="dialog-close" type="button" aria-label="Close settings" onClick={onClose}>
            ×
          </button>
        </header>

        <section className="dialog-section">
          <h3>Appearance</h3>
          <div className="segmented" role="group" aria-label="Colour theme">
            <button
              type="button"
              className={theme === "light" ? "active" : ""}
              aria-pressed={theme === "light"}
              onClick={() => onTheme("light")}
            >
              Light
            </button>
            <button
              type="button"
              className={theme === "olive" ? "active" : ""}
              aria-pressed={theme === "olive"}
              onClick={() => onTheme("olive")}
            >
              Olive green
            </button>
          </div>
        </section>

        <section className="dialog-section">
          <h3>About</h3>
          <dl className="about-grid">
            <dt>Software</dt>
            <dd>{APP_NAME}</dd>
            <dt>Version</dt>
            <dd>{APP_VERSION}</dd>
            <dt>Author</dt>
            <dd>{AUTHOR.name}</dd>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:${AUTHOR.phoneHref}`}>{AUTHOR.phone}</a>
            </dd>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>
            </dd>
            <dt>Web</dt>
            <dd>
              <a href={AUTHOR.webHref} target="_blank" rel="noreferrer">
                {AUTHOR.web}
              </a>
            </dd>
            <dt>First revision</dt>
            <dd>{formatDate(FIRST_REVISION)}</dd>
            <dt>Last modified</dt>
            <dd>{formatDate(LAST_MODIFIED)}</dd>
          </dl>
        </section>

        <p className="dialog-note">
          Preliminary design aid for API Std 650 welded steel tanks. Every result remains the
          responsibility of the reviewing engineer — verify against a licensed copy of the current
          edition before fabrication.
        </p>
      </div>
    </div>
  );
}
