# TankCalc 650

A browser-based calculation and design tool for welded steel storage tanks to
**API Standard 650 — Welded Tanks for Oil Storage** (13th edition, 2020, SI units).
It follows the workflow of commercial tank design packages such as COADE TANK:
enter geometry, product and load data, and get course-by-course shell
thicknesses, bottom and roof design, wind girder requirements, opening
reinforcement, seismic screening, a full weight breakdown, a 3D schematic of
the tank and a printable calculation sheet with every substituted formula.

![workflow](https://img.shields.io/badge/units-SI%20(m%2C%20mm%2C%20MPa%2C%20kN)-0f766e)

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # type-check + production bundle
npm run verify     # engine checks against published worked examples
```

## What is calculated

| Module | Clause | Output |
| --- | --- | --- |
| Shell, one-foot method | §5.6.3.2 | t_d, t_t per course, plate selection |
| Shell, variable-design-point | §5.6.3.3 | t₁, x_e, per-course thickness |
| Minimum shell thickness | §5.6.1.1, Table 5-1 | 5 / 6 / 8 / 10 mm by diameter |
| Allowable stresses | Table 5-2a | Sd = min(2/3 Sy, 2/5 Su), St = min(3/4 Sy, 3/7 Su) |
| Bottom plates | §5.4.1 | 6 mm nominal + CA |
| Annular plates | §5.5, Table 5-1a | thickness + minimum radial width |
| Roof plates | §5.10.2, §5.10.5 | supported cone minimum, self-supporting cone design |
| Roof loads | §5.10.2 | DL + (Lr or S) + 0.4 Pe and DL + Pe + 0.4 (Lr or S) |
| Wind girders | §5.9.6, §5.9.7 | top girder Z, H₁, W_tr, intermediate girder count, elevations and required section modulus |
| Wind overturning | §5.11.2 | moment vs 2/3 resisting weight |
| Seismic screening | Annex E | Ai/Ac, Wi/Wc, Mrw, Ms, hoop stress, shell compression, anchorage |
| Shell and roof openings | §5.7 | reinforcement area, pad sizing, neck and clearance checks |
| Weights | — | empty, operating, product and hydrostatic test weights |

### The equations

Shell (SI, mm):

```
t_d = 4.9 · D · (H − 0.3) · G / (S_d · E) + CA
t_t = 4.9 · D · (H − 0.3) / (S_t · E)
```

Variable design point, bottom course:

```
t₁ = [1.06 − (0.0696 D/H) √(H·G/S_d)] · (4.9 H D G / S_d) + CA
```

Variable design point, upper courses:

```
K  = t_lower / t_trial
C  = K (K − 1) / (1 + K^1.5)
x_e = min[0.61 √(R t_u) + 320 C H, 1000 C H, 1.22 √(R t_u)]
t_i = 4.9 · D · (H − x_e/1000) · G / S_d + CA
```

Roof, self-supporting cone:

```
t_r = D / (4.8 sin θ) · √(T / 2.2) + CA        T = max(DL + (Lr or S) + 0.4 Pe,
                                                   DL + Pe + 0.4 (Lr or S))
```

Wind girders:

```
Z  = (D² H / 17) · (V / 190)²                  [cm³, D and H in m, V in km/h]
H₁ = 9.47 t (t / D)^1.5 · (190 / V)²           [m, t in mm]
W_tr = Σ h_i (t_top / t_i)^2.5
```

Openings (§5.7.2 area replacement):

```
A_req  = d · t_r                    d = neck bore, t_r = required plate thickness
A_prov = A_shell + A_neck + A_pad
A_shell = (t_s − t_r) · d                       excess plate around the hole
A_neck  = (t_n − t_rn) · [t_s + min(projection, 5 t_n)]   excess neck, 2.5 t_n each side
A_pad   = 2 · w_pad · t_pad                     reinforcing pad, both sides
```

Opening checks: no reinforcement required at or below 60 mm nominal bore; 75 mm clear
distance from horizontal shell joints and between adjacent openings; the pad must fit
inside its course; roof manholes need their reinforcing plate (Table 5.13a).

Weights:

```
W_steel   = Σ (π D h_i × t_i × 7850)          shell, bottom, annular ring, roof
W_empty   = W_shell + W_bottom + W_annular + W_roof
W_product = (π D²/4) · H_L · G · 1000
W_water   = (π D²/4) · H_L · 1000             hydrostatic test
W_test    = W_empty + W_water                 governs the foundation
```

## Interface

* **Nozzle and manhole sizes are entered in inches (NPS).** Choosing a size fills the
  outside diameter and neck wall from ASME B36.10 Schedule 40 pipe (Table 5.13a for
  manholes); choose *Custom* to type a non-standard OD in millimetres.
* **3D schematic** in the left panel: oblique projection with shell courses shaded by
  plate thickness, cone roof, liquid level, wind girder rings and every opening drawn on
  its azimuth (front openings solid, back openings faded).
* **Settings (gear, top right)** switches the light/olive theme, remembers the choice, and
  shows the author, contact details, version and revision dates.
* **Weights tab** breaks the empty weight down by component, then adds the product and
  hydrostatic-test water to give the operating and test weights.
* **Print / Save PDF** prints the design report *including the substituted calculations*:
  one line per shell course, plus bottom, annular, roof, wind, openings, seismic and
  weights, with the numbers filled in.

## Verification

`npm run verify` reproduces published worked examples:

* 30 m × 14.4 m A516-70 crude tank (course-by-course t_d = 11.68, 9.95, 8.22,
  6.48, 4.75, 3.02 mm and plates 12/10/9/7/6/6 mm),
* 20 m × 12 m A36 water tank (8.67 / 7.44 mm),
* 11.5 m tank by the variable-design-point method (t₁ = 9.93 mm) and its
  39.8 cm³ top wind girder,
* Table 5-1a and Table 5-1 lookups.

## Scope and limitations

This is a **preliminary design aid**, not a certified design package. It does
not implement: shell nozzle flange ratings, external nozzle loads (Annex P),
roof structure (rafters, girders, compression ring), Annex F pressurised
service, bottom/foundation design, anchor bolt and chair design, sloshing
freeboard, erection tolerances, or fabrication and inspection requirements.
Verify every result against the current edition of API Std 650 and have the
design reviewed by a qualified engineer before fabrication.

### On the §5.7 reinforcement method

The clause text of §5.7 is only available in a licensed copy of the standard,
so the area-replacement method is implemented with the credit limits stated
above — shell excess credited over the opening width, neck excess over
2.5 t_n each side limited by the actual projection, pad over its full width.
Other accepted procedures may credit a wider shell band. Each opening reports
the area it has, the area it needs, and the pad width that would close any
deficit, so the result can be checked clause by clause against your copy of
the standard.

## Project layout

```
src/lib/api650.ts        tank calculation engine (framework free, testable in Node)
src/lib/openings.ts      §5.7 opening reinforcement and clearance checks
src/lib/form.ts          form state, presets, conversion to engine input
src/lib/about.ts         author, version and revision dates shown in settings
src/components/          input panel, 3D schematic, tabs, openings editor,
                         weights panel, settings dialog, printable report
scripts/verify.ts        worked-example and behaviour checks
```

Version 1.2.0 — enlargable 3D schematic, olive theme, intermediate wind-girder
section modulus and elevations, wind anchorage demand, and expanded print calculations.
Edit `src/lib/about.ts` and `package.json` together when revising the software.
