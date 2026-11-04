import { useEffect, useState } from "react";
import type { TankDesign } from "../lib/api650";
import { fmt } from "../lib/format";
import { isRoofOpening, sizeLabelFor, type OpeningResult } from "../lib/openings";

const KY = 0.26; // ellipse squash for the 3/4 view

/**
 * Pseudo-3D schematic of the tank: shell courses as shaded bands, cone roof,
 * liquid level, wind girder rings, and every opening placed on its azimuth.
 * Drawn in an oblique projection — no WebGL, no camera maths, but enough depth
 * to read the nozzle layout at a glance.
 */
export default function TankDiagram({
  design,
  openings = [],
  printable = false,
}: {
  design: TankDesign;
  openings?: OpeningResult[];
  printable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [expanded]);
  const { diameter, shellHeight, designLevel } = design.input;
  const rise = design.roof.rise;
  const totalHeight = shellHeight + rise;

  const W = 760;
  const H = 540;
  const cx = 292;
  const groundY = 462;
  const scale = Math.min(250 / Math.max(diameter, 1), 296 / Math.max(totalHeight, 1));
  const r = (diameter / 2) * scale;
  const ry = r * KY;
  const shellPx = shellHeight * scale;
  const topY = groundY - shellPx;
  const apexY = topY - rise * scale;

  const yAt = (elevation: number) => groundY - elevation * scale;
  const arcDown = (y: number) => `M ${cx - r} ${y} A ${r} ${ry} 0 0 0 ${cx + r} ${y}`;
  const bandPath = (bottom: number, top: number) => {
    const a = yAt(bottom);
    const b = yAt(top);
    return [
      `M ${cx - r} ${a}`,
      `A ${r} ${ry} 0 0 0 ${cx + r} ${a}`,
      `L ${cx + r} ${b}`,
      `A ${r} ${ry} 0 0 1 ${cx - r} ${b}`,
      "Z",
    ].join(" ");
  };

  const thicknesses = design.courses.map((course) => course.tSelected);
  const minT = Math.min(...thicknesses);
  const maxT = Math.max(...thicknesses);
  const courseTint = (t: number) => {
    if (maxT === minT) return "hsl(203 30% 72%)";
    const k = (t - minT) / (maxT - minT);
    return `hsl(203 ${34 - k * 10}% ${84 - k * 26}%)`;
  };

  const point = (azimuth: number, elevation: number) => {
    const a = (azimuth * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(a),
      y: yAt(elevation) + ry * Math.sin(a),
      a,
      front: Math.sin(a) >= 0,
    };
  };

  const shellOpenings = openings.filter((opening) => !isRoofOpening(opening.input.type));
  const roofOpenings = openings.filter((opening) => isRoofOpening(opening.input.type));

  const nozzle = (opening: OpeningResult, faded: boolean) => {
    const { input } = opening;
    const { x, y, a } = point(input.azimuth, input.elevation);
    const dx = Math.cos(a);
    const dy = KY * Math.sin(a);
    const length = Math.max(18, (input.projection / 1000) * scale);
    const tipX = x + dx * length;
    const tipY = y + dy * length;
    const flange = Math.max(5, (input.od / 2000) * scale * 1.5);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const stroke = Math.max(3.5, (input.neck / 1000) * scale * 1.6);
    const anchor = dx > 0.25 ? "start" : dx < -0.25 ? "end" : "middle";

    return (
      <g key={`${input.id}-${faded ? "back" : "front"}`} opacity={faded ? 0.42 : 1}>
        {opening.d > 250 ? (
          <ellipse
            cx={x}
            cy={y}
            rx={Math.max(4, (opening.d / 2000) * scale)}
            ry={Math.max(3, (opening.d / 2000) * scale * KY * 1.6)}
            fill="#1e293b"
            opacity={0.28}
          />
        ) : null}
        <line
          x1={x}
          y1={y}
          x2={tipX}
          y2={tipY}
          stroke="#93a6bb"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <ellipse
          cx={tipX}
          cy={tipY}
          rx={flange}
          ry={flange * 0.42}
          transform={`rotate(${angle} ${tipX} ${tipY})`}
          fill="#e6edf5"
          stroke="#5b6b80"
          strokeWidth={1}
        />
        <text
          x={tipX + dx * (flange + 6)}
          y={tipY + dy * (flange + 6) - 3}
          textAnchor={anchor}
          className="svg-tag"
        >
          {input.tag} · {sizeLabelFor(input.type, input.od)}
        </text>
      </g>
    );
  };

  const roofNozzle = (opening: OpeningResult) => {
    const { input } = opening;
    const a = (input.azimuth * Math.PI) / 180;
    const rho = r * (input.type === "roof-manhole" ? 0.42 : 0.58);
    const px = cx + rho * Math.cos(a);
    const py = apexY + (rho / r) * (topY - apexY) + (rho / r) * ry * Math.sin(a);
    const stub = 15;
    return (
      <g key={input.id}>
        <line
          x1={px}
          y1={py}
          x2={px}
          y2={py - stub}
          stroke="#93a6bb"
          strokeWidth={Math.max(4, (input.neck / 1000) * scale * 1.6)}
          strokeLinecap="round"
        />
        <ellipse
          cx={px}
          cy={py - stub}
          rx={Math.max(5, (input.od / 2000) * scale * 1.4)}
          ry={Math.max(3, (input.od / 2000) * scale * 1.4 * 0.45)}
          fill="#e6edf5"
          stroke="#5b6b80"
          strokeWidth={1}
        />
        <text x={px} y={py - stub - 8} textAnchor="middle" className="svg-tag">
          {input.tag}
        </text>
      </g>
    );
  };

  return (
    <section className={`card diagram-card${expanded ? " diagram-expanded" : ""}${printable ? " diagram-report" : ""}`}>
      <header className="card-head">
        <h2>3D schematic</h2>
        {!printable ? <button className="btn btn-ghost diagram-expand" type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Close enlarged schematic" : "Enlarge schematic"}>{expanded ? "Close ×" : "⤢ Enlarge"}</button> : null}
      </header>
      {!printable && expanded ? <button className="diagram-scrim" aria-label="Close enlarged schematic" onClick={() => setExpanded(false)} /> : null}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="tank-svg"
        onClick={() => { if (!printable) setExpanded(true); }}
        style={{ cursor: printable || expanded ? "default" : "zoom-in" }}
        role="img"
        aria-label="Three-dimensional schematic of the tank showing shell courses, roof, liquid level, wind girders and openings"
      >
        <defs>
          <linearGradient id="shell-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#61738a" />
            <stop offset="0.18" stopColor="#a9bacd" />
            <stop offset="0.42" stopColor="#e4ecf6" />
            <stop offset="0.68" stopColor="#c2cfdf" />
            <stop offset="0.88" stopColor="#8496ac" />
            <stop offset="1" stopColor="#51627a" />
          </linearGradient>
          <linearGradient id="roof-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#dfe8f2" />
            <stop offset="0.55" stopColor="#c3d0e0" />
            <stop offset="1" stopColor="#8d9db2" />
          </linearGradient>
          <linearGradient id="bottom-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8d9db2" />
            <stop offset="1" stopColor="#4a596e" />
          </linearGradient>
          <radialGradient id="ground-grad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#0f172a" stopOpacity="0.28" />
            <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
          <clipPath id="body-clip">
            <path
              d={[
                `M ${cx - r} ${topY}`,
                `L ${cx - r} ${groundY}`,
                `A ${r} ${ry} 0 0 0 ${cx + r} ${groundY}`,
                `L ${cx + r} ${topY}`,
                "Z",
              ].join(" ")}
            />
          </clipPath>
          <marker id="dim-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
          </marker>
          <marker
            id="dim-arrow-start"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto"
          >
            <path d="M8 0 L0 4 L8 8 z" fill="currentColor" />
          </marker>
        </defs>

        {/* ground shadow and horizon */}
        <ellipse cx={cx} cy={groundY + 8} rx={r * 1.3} ry={ry * 1.5} fill="url(#ground-grad)" />
        <line
          x1={40}
          x2={W - 40}
          y1={groundY + 8}
          y2={groundY + 8}
          stroke="#94a3b8"
          strokeWidth="0.6"
          strokeDasharray="3 5"
          opacity="0.5"
        />

        {/* back-side nozzles, behind the shell */}
        {shellOpenings.filter((opening) => Math.sin((opening.input.azimuth * Math.PI) / 180) < 0).map((opening) => nozzle(opening, true))}
        {roofOpenings
          .filter((opening) => Math.sin((opening.input.azimuth * Math.PI) / 180) < 0)
          .map(roofNozzle)}

        {/* shell body */}
        <rect x={cx - r} y={topY} width={2 * r} height={shellPx} fill="url(#shell-grad)" />
        {design.courses.map((course) => (
          <path
            key={`band-${course.index}`}
            d={bandPath(course.bottom, course.top)}
            fill={courseTint(course.tSelected)}
            opacity="0.55"
          />
        ))}
        {/* course seams */}
        {design.courses.slice(1).map((course) => (
          <path
            key={`seam-${course.index}`}
            d={arcDown(yAt(course.top))}
            fill="none"
            stroke="#4b5b70"
            strokeWidth="0.9"
            opacity="0.75"
          />
        ))}
        {/* bottom plate and rim */}
        <ellipse cx={cx} cy={groundY} rx={r} ry={ry} fill="url(#bottom-grad)" />
        <path d={arcDown(groundY)} fill="none" stroke="#3f4d61" strokeWidth="1.6" />

        {/* liquid */}
        <g clipPath="url(#body-clip)">
          <rect
            x={cx - r}
            y={yAt(designLevel)}
            width={2 * r}
            height={groundY - yAt(designLevel)}
            fill="#0891b2"
            opacity="0.17"
          />
        </g>
        <ellipse cx={cx} cy={yAt(designLevel)} rx={r} ry={ry} fill="#0891b2" opacity="0.16" />
        <path d={arcDown(yAt(designLevel))} fill="none" stroke="#0891b2" strokeWidth="1.6" />
        <text x={cx - r - 6} y={yAt(designLevel) + 4} textAnchor="end" className="svg-label liquid">
          LL {fmt(designLevel, 2)} m
        </text>

        {/* roof */}
        {rise > 0 ? (
          <>
            <path
              d={[
                `M ${cx - r} ${topY}`,
                `L ${cx} ${apexY}`,
                `L ${cx + r} ${topY}`,
                `A ${r} ${ry} 0 0 1 ${cx - r} ${topY}`,
                "Z",
              ].join(" ")}
              fill="url(#roof-grad)"
              stroke="#425268"
              strokeWidth="1.4"
            />
            <path d={arcDown(topY)} fill="none" stroke="#425268" strokeWidth="1.4" />
            <text x={cx} y={apexY - 12} textAnchor="middle" className="svg-label">
              {design.input.roofType === "self-supporting-cone"
                ? "self-supporting cone"
                : "supported cone"}{" "}
              · {design.roof.plate} mm
            </text>
          </>
        ) : (
          <>
            <ellipse cx={cx} cy={topY} rx={r} ry={ry} fill="#1e293b" opacity="0.16" />
            <path d={arcDown(topY)} fill="none" stroke="#425268" strokeWidth="1.6" />
            <text x={cx} y={topY - 14} textAnchor="middle" className="svg-label">
              open top · wind girder required
            </text>
          </>
        )}

        {/* wind girder rings */}
        {design.wind.girderElevations.map((elevation, index) => (
          <g key={`girder-${index}`}>
            <ellipse
              cx={cx}
              cy={yAt(elevation)}
              rx={r}
              ry={ry}
              fill="none"
              stroke="#b45309"
              strokeWidth="1"
              opacity="0.45"
            />
            <path
              d={arcDown(yAt(elevation))}
              fill="none"
              stroke="#b45309"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </g>
        ))}
        <ellipse
          cx={cx}
          cy={topY}
          rx={r}
          ry={ry}
          fill="none"
          stroke="#b45309"
          strokeWidth="1"
          opacity="0.45"
        />
        <path
          d={arcDown(topY)}
          fill="none"
          stroke="#b45309"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* front-side nozzles and roof openings */}
        {shellOpenings
          .filter((opening) => Math.sin((opening.input.azimuth * Math.PI) / 180) >= 0)
          .map((opening) => nozzle(opening, false))}
        {roofOpenings
          .filter((opening) => Math.sin((opening.input.azimuth * Math.PI) / 180) >= 0)
          .map(roofNozzle)}

        {/* diameter dimension */}
        <g className="dim">
          <line
            x1={cx - r}
            x2={cx + r}
            y1={groundY + 44}
            y2={groundY + 44}
            markerEnd="url(#dim-arrow)"
            markerStart="url(#dim-arrow-start)"
          />
          <line x1={cx - r} x2={cx - r} y1={groundY + 12} y2={groundY + 50} opacity="0.5" />
          <line x1={cx + r} x2={cx + r} y1={groundY + 12} y2={groundY + 50} opacity="0.5" />
          <text x={cx} y={groundY + 38} textAnchor="middle" className="svg-label">
            D = {fmt(diameter, 2)} m
          </text>
        </g>

        {/* height dimension */}
        <g className="dim">
          <line
            x1={cx - r - 42}
            x2={cx - r - 42}
            y1={groundY}
            y2={topY}
            markerEnd="url(#dim-arrow)"
            markerStart="url(#dim-arrow-start)"
          />
          <text
            x={cx - r - 50}
            y={(groundY + topY) / 2}
            textAnchor="middle"
            transform={`rotate(-90 ${cx - r - 50} ${(groundY + topY) / 2})`}
            className="svg-label"
          >
            H = {fmt(shellHeight, 2)} m
          </text>
        </g>

        {/* course thickness legend */}
        <g className="legend">
          <text x={cx + r + 44} y={topY + 2} className="svg-label strong">
            course · plate
          </text>
          {design.courses.map((course, index) => (
            <g key={`legend-${course.index}`}>
              <rect
                x={cx + r + 44}
                y={topY + 12 + index * 20}
                width="13"
                height="13"
                rx="2"
                fill={courseTint(course.tSelected)}
                stroke="#64748b"
                strokeWidth="0.7"
              />
              <text
                x={cx + r + 64}
                y={topY + 22.5 + index * 20}
                className="svg-label small"
              >
                {course.index} · {course.tSelected} mm
              </text>
            </g>
          ))}
        </g>

        <text x={24} y={H - 16} className="svg-label small muted-text">
          Bottom {design.bottom.plate} mm
          {design.bottom.annularPlate > 0
            ? ` · annular ${design.bottom.annularPlate} mm × ${design.bottom.annularWidth} mm`
            : ""}
          {" · "}top girder Z ≥ {fmt(design.wind.zRequired, 0)} cm³
          {openings.length > 0 ? ` · ${openings.length} openings plotted` : ""}
        </text>
      </svg>
    </section>
  );
}
