# PHASE 1 — Scientific Design
## Optimizing Ocean Alkalinity Enhancement: Balancing Atmospheric Carbon Removal and Marine Carbonate Chemistry

**Status:** DESIGN ONLY — no dataset has been generated. This document is for review and approval
before any data generation (Phase 2).

**Project type:** TSA Data Science & Analytics — AI-generated synthetic dataset, Climate and
Environmental Sustainability theme.

**Dataset label (fixed):** *AI-Generated Synthetic Ocean Alkalinity Enhancement Scenario Dataset*

---

## 1. Titles

**Working title (recommended, kept from brief):**

> Optimizing Ocean Alkalinity Enhancement: Balancing Atmospheric Carbon Removal and Marine
> Carbonate Chemistry

**Five alternative poster titles (non-sensationalized):**

1. Dose–Response Behavior of Ocean Alkalinity Enhancement: A Synthetic-Scenario Analysis of CO₂
   Uptake and Carbonate-System Perturbation
2. Identifying an Operating Window for Ocean Alkalinity Enhancement: Modeled Tradeoffs Between
   Carbon Removal and Carbonate Chemistry Change
3. Diminishing Returns and Chemical Thresholds in Modeled Ocean Alkalinity Enhancement Scenarios
4. Ocean Alkalinity Enhancement Across Contrasting Ocean Environments: A Multi-Objective Analysis
   of Synthetic Carbonate-Chemistry Scenarios
5. Constraining Effective Dosing Ranges for Ocean Alkalinity Enhancement Using a Synthetic
   Carbonate-System Scenario Dataset

---

## 2. Research question

### Candidate refinements (in increasing sophistication)

- **RQ-A (original):** How does the amount of alkalinity added during OAE affect modeled
  atmospheric CO₂ uptake and marine carbonate chemistry, and can an optimal treatment range be
  identified?
- **RQ-B (adds mechanism):** Across contrasting surface-ocean environments, how do equilibrated
  CO₂ uptake and transient carbonate-system perturbation scale with alkalinity dose, and does the
  marginal molar uptake efficiency (ΔDIC/ΔTA) decline as dose increases?
- **RQ-C (adds thresholds):** As alkalinity dose increases, at what point does the modeled
  transient aragonite saturation state cross ranges associated in the experimental literature with
  abiotic carbonate precipitation, and how does that crossing point depend on baseline conditions?
- **RQ-D (multi-objective; strongest):** Across modeled surface-ocean environments, how does
  alkalinity dose control the tradeoff between equilibrated CO₂ uptake and transient
  carbonate-chemistry perturbation, and can a Pareto-optimal dosing window be identified that
  remains stable across environments and under parameter uncertainty?
- **RQ-E (interaction-focused):** Which baseline environmental properties (temperature, salinity,
  initial pH, initial DIC, buffering capacity) most strongly modify the carbon-removal benefit and
  chemical perturbation produced by a fixed alkalinity dose?

### Selected primary question: **RQ-D**, with RQ-B and RQ-C as named secondary questions.

RQ-D subsumes the others, is explicitly an optimization question (matching the analysis plan),
and builds in the robustness requirement (uncertainty analysis) so the headline answer cannot be a
fragile point estimate.

---

## 3. Hypothesis

The original hypothesis is directionally sound but needs one scientific correction. In carbonate
chemistry, the *benefit* of OAE (equilibrated CO₂ uptake) is expected to grow nearly linearly with
dose with only **modest** decline in marginal molar efficiency (published equilibrium uptake
efficiencies span roughly 0.75–0.85 mol CO₂ per mol TA; He & Tyka 2023). The strong nonlinearity
is expected on the *risk* side: the transient (pre-equilibration) pH and saturation-state spike
grows faster than linearly and can cross experimentally observed precipitation-risk ranges. An
honest hypothesis should predict where the optimum comes from rather than vaguely predicting
"diminishing returns."

**Refined hypothesis (three testable parts):**

- **H1 (benefit):** Modeled equilibrated CO₂ uptake will increase monotonically with alkalinity
  dose in every environment, but the marginal molar efficiency (Δuptake/Δdose, mol/mol) will
  decline modestly as dose increases, because larger additions shift the equilibrated carbonate
  speciation further toward CO₃²⁻, which stores alkalinity without storing proportionally more
  carbon.
- **H2 (perturbation):** The transient (pre-equilibration) perturbation — ΔpH and Δ aragonite
  saturation immediately after addition — will grow at least linearly with dose, and modeled
  aragonite saturation will enter literature-derived precipitation-risk *ranges* (tiered and
  uncertain, not a single universal threshold — see §6.4) at doses that are lower in warm,
  high-Ω waters than in cold, low-Ω waters.
- **H3 (tradeoff):** Consequently, an intermediate dose window — set primarily by the perturbation
  constraint rather than by collapse of the carbon-removal benefit — will dominate both very low
  doses (little removal) and very high doses (threshold exceedance) in a multi-objective
  comparison.

**Falsifiability commitment:** If marginal efficiency does not measurably decline within the
modeled range, or thresholds are not crossed, the project reports that outcome and the "optimum"
becomes the top of the modeled range subject to constraints. Nothing in the generator forces H1–H3
to be true; all three follow (or fail to follow) from equilibrium chemistry computed at run time.

---

## 4. The single most important design decision: model TWO post-treatment states

A scientifically common error would be to compute one "after" state. In reality OAE has two
distinct chemical moments, and the benefit and the risk live in *different* moments:

- **State 1 — immediate / unequilibrated** (minutes–days after addition, before air–sea CO₂
  exchange): TA is raised, DIC is unchanged. pH, CO₃²⁻, and Ω spike. Seawater pCO₂ drops below
  atmospheric. **This is where chemical perturbation and precipitation risk are maximal, and where
  carbon removal is still ≈ 0.**
- **State 2 — equilibrated** (weeks–months later): CO₂ has invaded from the atmosphere until
  seawater pCO₂ approaches atmospheric. DIC has risen (this rise *is* the carbon removal); pH and
  Ω relax back toward (slightly above) baseline. **This is where the benefit is realized and the
  residual perturbation is small.**

If only State 2 were modeled, the tradeoff would look artificially tiny; if only State 1, the
benefit would look artificially absent. The dataset therefore carries both states per row, plus an
**equilibration fraction** parameter *f* so realized uptake = *f* × potential uptake. This is also
the honest answer to "where does the tradeoff come from" — it is a real, literature-documented
feature of OAE, not something painted onto the data.

**Two quantities that must never be conflated** (an earlier draft of this design cited them
loosely; corrected in Revision 1):

- **Thermodynamic uptake efficiency η_thermo = potential ΔDIC / ΔTA** at full re-equilibration.
  A pure equilibrium-chemistry quantity, *computed per row as a model output*, expected from the
  literature to fall near 0.75–0.85 mol CO₂ per mol TA (He & Tyka 2023; Renforth & Henderson
  2017). It is never an input and never sampled.
- **Equilibration fraction f** — a *kinetic/transport* quantity: how far toward air–sea
  equilibrium the treated water has come by the evaluation horizon, limited by gas-exchange
  velocity, mixed-layer depth, and subduction. Sampled as an uncertain input (provisional range
  0.55–0.95 at a ~1-year horizon; this range is itself flagged for verification against the
  regional equilibration results in He & Tyka 2023). f scales the realized uptake; it does not
  change η_thermo.

State-2 chemistry is computed consistently with f: DIC₂ = DIC₀ + f × (DIC_eq − DIC₀), then pH₂,
Ω₂, and speciation are recomputed from (TA₁, DIC₂).

**Counterfactual definition of uptake (prevents a subtle bias):** baseline water may itself be
out of equilibrium with the atmosphere. Uptake attributable to OAE is defined against the
untreated counterfactual equilibrated to the same atmosphere:

```
potential_uptake = DIC_eq(TA0 + dose, pCO2_atm) − DIC_eq(TA0, pCO2_atm)   [thermodynamic]
realized_uptake  = f × potential_uptake                                    [kinetic scaling]
eta_thermo       = potential_uptake / dose    (mol CO2 per mol TA, dimensionless)
```

The diminishing-returns (marginal-efficiency) analysis is defined on **potential** uptake, so the
sampled kinetic parameter f cannot contaminate the thermodynamic question it is meant to answer.

---

## 5. Scientific background to be modeled (poster BACKGROUND section)

The carbonate system, stated at the level the project must defend:

- CO₂(atm) ⇌ CO₂(aq); CO₂(aq) + H₂O ⇌ H₂CO₃; H₂CO₃ ⇌ H⁺ + HCO₃⁻; HCO₃⁻ ⇌ H⁺ + CO₃²⁻
- **DIC** = [CO₂*] + [HCO₃⁻] + [CO₃²⁻]  (CO₂* = dissolved CO₂ + true carbonic acid)
- **TA** ≈ [HCO₃⁻] + 2[CO₃²⁻] + [B(OH)₄⁻] + [OH⁻] − [H⁺]  (borate and water terms included;
  phosphate/silicate/organic alkalinity neglected — documented assumption)
- Given temperature, salinity, and pressure, any two of {TA, DIC, pH, pCO₂} determine the entire
  system through the equilibrium constants K₀, K₁, K₂, K_B, K_W.

**Why adding alkalinity increases carbon storage capacity (the non-oversimplified version):**
Adding alkalinity at constant DIC consumes H⁺, shifting speciation from CO₂* toward HCO₃⁻ and
CO₃²⁻. This lowers seawater pCO₂ below the atmosphere's, creating an air–sea disequilibrium that
drives CO₂ invasion. The invading CO₂ is converted mostly into bicarbonate rather than remaining
as dissolved gas, so the water can hold more *total* inorganic carbon at the same atmospheric
pCO₂. The capacity gain is not "because pH is higher" — pH returns nearly to baseline after
equilibration; it is because the TA:DIC ratio sets how much DIC the water holds at a given pCO₂.
The buffering context is quantified with the Revelle factor, computed per scenario.

---

## 6. Variables

### 6.1 Independent (treatment) variable

`alkalinity_added_umol_kg` — 12 levels: **0, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500 µmol/kg**

Tier structure (Revision 1 — labels reconciled; an earlier draft flagged only 400–500 as stress
tests while the JSON tables flagged 150+; the stricter policy below is now the single source of
truth in both places):

- **0** — control.
- **10–100 µmol/kg — deployment-relevant tier** (`stress_test = False`): perturbations comparable
  to near-field, post-dilution conditions contemplated for field deployment (Renforth & Henderson
  2017; NASEM 2021 — to be verified before locking).
- **150–500 µmol/kg — exploratory stress-test tier** (`stress_test = True`, all of it): believed
  comparable to mesocosm/laboratory additions, but that comparison is **not asserted anywhere
  until the mesocosm ΔTA sourcing is verified** (currently SOURCE VERIFICATION REQUIRED). Until
  then these doses are described only as model stress tests. Extending to 500 (beyond the brief's
  300) is kept because cold, low-Ω waters may not reach precipitation-risk ranges below 300, and
  a threshold analysis that never reaches the threshold in half the environments is uninformative.

Reporting policy: headline deployment-relevant conclusions (including any recommended dose
window) are computed on the 0–100 tier; results from the 150–500 tier are reported separately as
*model-behavior characterization* (where thresholds fall), never as deployment predictions.

### 6.2 Sampled environmental variables (the "AI-generated scenario" layer)

Six baseline environment archetypes (explicitly *not* claimed to reproduce specific real
locations), with per-archetype sampling ranges to be pinned to GLODAPv2 / published surface
climatologies in Phase 2:

| Archetype | T (°C) | S (psu) | Baseline TA (µmol/kg) | Notes |
|---|---|---|---|---|
| Polar / subpolar | −1 to 8 | 32–34.5 | ~2150–2320 | low Ω, high Revelle factor |
| Temperate | 8–18 | 33–35.5 | ~2250–2350 | |
| Subtropical gyre | 18–26 | 35–37 | ~2350–2450 | high TA, high Ω |
| Tropical | 26–30 | 34–36.5 | ~2280–2400 | highest Ω |
| Coastal, lower salinity | 5–25 | 25–33 | ~1900–2300 | TA from TA–S relation + larger noise |
| High-salinity marginal sea | 18–28 | 36.5–39.5 | ~2450–2600 | Mediterranean-like, not "the Med" |

**Note on the TA column (Revision 1):** the TA ranges in the table above are *expected-output
plausibility bounds used as a validation check*, not sampling targets. Baseline TA is generated
by the region-appropriate empirical relationship below, and a draw whose resulting TA falls
outside its archetype's expected range is flagged for review.

Sampling structure per environment draw:

- `temperature_c`, `salinity_psu`: sampled within archetype ranges.
- `ta0_umol_kg` (Revision 1 — refined): generated from the **actual zone-specific Lee et al.
  (2006) TA = f(S, T) regional equations** (which include temperature and quadratic terms, not a
  single global TA–S line), plus bounded noise, so TA covaries realistically with both S and T:
  - Archetype → Lee et al. zone mapping: tropical and subtropical gyre → (Sub)tropics equation;
    temperate → North Atlantic / North Pacific equation as appropriate to the draw; polar /
    subpolar → the high-latitude (Southern Ocean / North Pacific) equations. Coefficients are
    transcribed from the paper at implementation time and unit-tested against published example
    values — never typed from memory.
  - Each Lee et al. equation has a published (T, S) validity domain; a sampled (T, S) pair
    falling outside its mapped equation's domain is **rejected at the sampling stage** and
    logged (new validation rule V15).
  - **Coastal, lower salinity** archetype: Lee et al. is an open-ocean product, so coastal TA is
    instead generated from a two-end-member mixing line between the regional open-ocean TA
    (from the mapped Lee equation at the salinity ceiling) and a freshwater TA end-member
    sampled within a range that is currently SOURCE VERIFICATION REQUIRED, with a larger noise
    term. Documented as an explicit assumption.
  - **High-salinity marginal sea** archetype: Lee et al. excludes marginal seas, so TA comes
    from a published Mediterranean-type TA–S relationship (candidate: Schneider et al. 2007;
    coefficients to be transcribed and verified at implementation).
- `atm_co2_ppm`: fixed at ~425 ppm (NOAA GML, mid-2020s) in the core dataset; varied in
  sensitivity runs.
- `baseline_disequilibrium_uatm`: sampled ±40 µatm around atmospheric, representing natural
  seasonal/biological disequilibrium; `pco2_0 = atm + disequilibrium`.
- `equilibration_fraction f`: sampled 0.55–0.95 (uncertain-parameter layer).
- `dic0_umol_kg` is then **calculated** from (TA₀, pCO₂₀, T, S) — never sampled independently, so
  baseline chemistry is internally consistent by construction.

### 6.3 Calculated variables (deterministic chemistry; the majority of columns)

Baseline (state 0): `ph0_total`, `dic0`, `hco3_0`, `co3_0`, `co2aq_0`, `omega_arag_0`,
`omega_calc_0`, `revelle_factor_0`.

Immediate post-addition (state 1, TA₁ = TA₀ + dose, DIC unchanged): `ph1`, `pco2_1`, `co3_1`,
`omega_arag_1`, `omega_calc_1`, `delta_ph_immediate`, `delta_omega_arag_immediate`,
`air_sea_disequilibrium_uatm` (pCO₂_atm − pCO₂_1).

Equilibrated (state 2, TA₁ with pCO₂ relaxed toward atmospheric by fraction f): `dic2`, `ph2`,
`hco3_2`, `co3_2`, `co2aq_2`, `omega_arag_2`, `delta_ph_equilibrated`.

Carbon removal: `co2_uptake_potential_umol_kg`, `co2_uptake_realized_umol_kg`,
`co2_removed_mg_kg` (× 44.01 g/mol), `thermo_efficiency_eta_mol_mol` (potential uptake / dose —
the thermodynamic quantity, deliberately named to prevent confusion with the kinetic
equilibration fraction f), and `marginal_thermo_efficiency_mol_mol` (finite difference of
*potential* uptake between adjacent dose levels **within the same environment draw** — the
design pairs every environment draw with the full dose ladder precisely so this is computable
without confounding, and it is defined on potential rather than realized uptake so f cannot
contaminate the diminishing-returns test). Bookkeeping columns added in Revision 1:
`constants_set` (which K₁/K₂ formulation was used for the row — see §7) and `extreme_flag`
(chemically valid but statistically extreme rows retained and marked — see V13).

### 6.4 Derived indices (transparent, documented, and quarantined from "discovery" claims)

- `precipitation_risk_index` (Revision 1 — the largest correction in this revision). **There is
  no universal Ω threshold for CaCO₃ precipitation**, and an earlier draft wrongly implied
  Ω_arag ≈ 5 acts as one. Experimentally, the critical Ω depends on whether reactive particle
  surfaces are available to nucleate on. The index is therefore tiered and particle-context
  dependent:
  - *Heterogeneous / particle-mediated tier*: runaway precipitation has been observed in
    particle-rich experimental conditions (mineral feedstock grains, resuspended sediment) at
    roughly Ω_arag ≈ 4–7 (Moras et al. 2022; Hartmann et al. 2023 — exact ranges to be verified
    from the papers, not asserted from memory). Lower bound θ_het sampled ~4–7 in Monte Carlo.
  - *Pseudo-homogeneous tier*: without abundant particles, nucleation requires much higher
    supersaturation, roughly Ω_arag ≳ 10–12 (candidate sources exist but are currently
    SOURCE VERIFICATION REQUIRED). Bound θ_hom sampled ~10–12.5 in Monte Carlo.
  - Implementation: a continuous index computed against *both* uncertain bounds, plus two flags
    (`precip_risk_het_flag`, `precip_risk_hom_flag`) and a documented `particle_context`
    assumption. Because this project idealizes the feedstock as fully dissolved NaOH-equivalent,
    the low-particle framing is the nominal case, but results are reported under both framings
    since real solid-feedstock deployments are particle-rich.
  - Language rule: the project never states "Ω above X causes precipitation" — only that a
    scenario enters a literature-derived, particle-context-dependent risk range.
- `perturbation_index`: normalized composite of |ΔpH_immediate|, ΔΩ_arag_immediate, and relative
  ΔCO₃²⁻ — weights documented in the data dictionary, and a weight-sensitivity analysis showing
  conclusions are (or are not) robust to the weighting.
- `treatment_classification` ∈ {LOW TREATMENT, EFFECTIVE, OPTIMAL TRADEOFF, REVIEW, EXCESSIVE
  PERTURBATION}: assigned by an explicit published rule table (e.g., realized uptake percentile ×
  perturbation/risk thresholds), printed in full in the methodology. Not learned, not tuned to
  produce a pretty distribution.

### 6.5 Controlled / context variables

Surface mixed layer only (pressure ≈ 0 dbar); alkalinity feedstock treated as NaOH-equivalent
(pure TA addition, no added Ca²⁺, DIC, or trace metals); no biology; no dilution/transport beyond
the equilibration-fraction abstraction; nutrients/phosphate/silicate set to zero in the TA
equation. Each is a documented limitation.

---

## 7. Equations, constants, and software

| Component | Formulation | Source |
|---|---|---|
| CO₂ solubility K₀ | f(T, S) | Weiss (1974) |
| K₁, K₂ (carbonic acid) | f(T, S), total pH scale | Lueker et al. (2000) |
| K_B (boric acid) | f(T, S) | Dickson (1990) |
| K_W (water) | f(T, S) | Millero (1995) |
| Total borate from S | B_T ∝ S | Uppström (1974) / Lee et al. (2010) |
| Aragonite/calcite K_sp | f(T, S) | Mucci (1983) |
| [Ca²⁺] from S | conservative with salinity | Riley & Tongudai (1967) |
| Ω | [Ca²⁺][CO₃²⁻]/K_sp | standard |
| Revelle factor | numerical ∂ln pCO₂/∂ln DIC at constant TA | Zeebe & Wolf-Gladrow (2001) |
| System solver | **PyCO2SYS** (established community package) | Humphreys et al. (2022) |
| Cross-check solver | independent bisection solver for [H⁺] written from the equations above | this project |

Two solver note: using PyCO2SYS as primary and a from-scratch solver as validation is both a
genuine QC step and a strong judge-defense ("we did not trust a black box; we reproduced it").

Constants policy for cold water (Revision 1 — upgraded from "accept a mild extrapolation" to an
explicit per-row policy): Lueker et al. (2000) constants are calibrated for T ≈ 2–35 °C,
S ≈ 19–43 and are used **only inside that domain**. Rows with T < 2 °C use an alternative
PyCO2SYS constant set whose documented validity extends below 2 °C (candidate: Millero 2010;
the final choice is confirmed against the stated validity ranges in the PyCO2SYS documentation
at implementation time, never assumed). Every row records which formulation was used in a
`constants_set` column — the two sets are never mixed silently — and the entire dataset is
re-run under the alternative set as a sensitivity case to show conclusions do not hinge on the
choice. A further documented caveat: published work has questioned K₁/K₂ accuracy in polar
waters generally (candidate: Sulpis et al. 2020 — to be verified), so polar-archetype results
carry an explicit constants-uncertainty note in the limitations.

**What is "AI-generated" here (TSA compliance framing):** the AI tool designs the generator,
writes the code, and specifies scenario distributions; scenario draws are pseudo-random (seeded)
and all chemistry columns are deterministic physics. The disclosure will state exactly this and
preserve the full prompt. The dataset is never described as ocean observations.

---

## 8. Dataset shape

- **1,500 environment draws × 12 dose levels = 18,000 rows** (within the 10k–25k target).
- `env_id` groups the 12 rows sharing one environment (paired design → clean marginal-efficiency
  and within-environment dose–response analysis).
- ~38 columns; every column enters `oae_data_dictionary.csv` with definition, unit, type
  (sampled / calculated / derived-index / flag), source or formula, and allowed range.

---

## 9. Statistical analysis plan

1. **Descriptives & distributions** for all key variables, by archetype.
2. **Dose–response curves**: realized uptake, ΔpH_immediate, Ω_arag_1 vs dose, per archetype,
   with within-environment pairing.
3. **Marginal efficiency analysis (diminishing returns)**: Δuptake/Δdose vs dose; changepoint /
   piecewise-linear fit to locate where (if anywhere) marginal efficiency measurably declines;
   report the curve even if flat.
4. **Correlations**: Spearman throughout (monotonic, nonlinear-safe); Pearson only where linearity
   holds. TA₀–salinity collinearity is handled by (a) reporting the correlation matrix openly and
   (b) using the TA-residual (TA₀ minus its salinity prediction) as the independent TA signal in
   regression.
5. **Regression**: multiple regression with standardized coefficients for equilibrated uptake and
   for Ω_arag_1; explicit interaction terms (dose×T, dose×S, dose×pH₀, dose×DIC₀, dose×Revelle);
   nonlinear terms where residual analysis demands them. Report R², effect sizes, CIs, residual
   diagnostics — not p-values alone (with n = 18,000, near-everything is "significant";
   this is stated on the poster).
6. **Sensitivity analysis, two-track (methodologically the right way):**
   - *On the simulator directly*: Sobol variance decomposition (SALib, Saltelli sampling) of the
     chemistry model itself — the correct object for "which inputs matter."
   - *On the dataset*: permutation importance + partial-dependence from a random-forest
     **emulator** of the simulator, cross-checked against Spearman and standardized coefficients.
7. **Multi-objective optimization**: per-row (benefit = realized uptake; cost = perturbation
   index); Pareto frontier per archetype and pooled; identify the dose window that is
   Pareto-efficient *and* below the precipitation-risk range. Pareto optimality explained for
   judges as: "a dose is kept only if no other dose removes more carbon with less chemical
   disturbance."
8. **Uncertainty (Monte Carlo)**: re-run the pipeline ≥ 200 times perturbing f, the Ω risk
   threshold, pK₁/pK₂ within stated uncertainties, and atmospheric CO₂; report the optimal window
   as median [5th, 95th percentile] and state whether it is stable.
9. **Optional ML (kept subordinate)**: linear model vs gradient boosting predicting realized
   uptake from (archetype, T, S, TA₀, DIC₀, dose, f); train/test split by `env_id` (not by row —
   rows within an environment are not independent, and splitting by row would leak); report
   MAE/RMSE/R²; discuss interpretability tradeoff. Framed honestly as *emulation* of a known
   simulator, not discovery.

**Anti-circularity rules (printed in the methodology):**

- No analysis may "discover" a relationship that is definitional (e.g., sustainability-type
  scores vs their own ingredients). Any figure involving a derived index carries a caption note
  that the index is constructed, with a pointer to its formula.
- The legitimate discoveries this design can support are emergent properties of the chemistry:
  the *size* of efficiency decline, *where* thresholds fall per environment, *which* baseline
  variables control the response, and whether an optimum window *exists and is robust*. None of
  these are typed into the generator.
- ML never has derived indices as features or targets.

---

## 10. Validation strategy (rule table to be shipped as part of methodology)

| # | Rule | Type |
|---|---|---|
| V1 | S ∈ [20, 41]; T ∈ [−2, 32] °C; no negative concentrations anywhere | range |
| V2 | TA₁ − TA₀ = dose exactly (mass balance of treatment) | consistency |
| V3 | DIC = CO₂* + HCO₃⁻ + CO₃²⁻ reproduced within numerical tolerance | consistency |
| V4 | TA recomputed from speciation matches input TA within tolerance | consistency |
| V5 | pH₀ ∈ [7.6, 8.4]; baseline Ω_arag ∈ [0.5, 6]; baseline DIC ∈ [1700, 2400] µmol/kg (vs published surface ranges, GLODAPv2 / Jiang et al. 2019) | plausibility |
| V6 | Directional checks: dose ↑ ⇒ pH₁ ↑, pCO₂_1 ↓, Ω₁ ↑, potential uptake ↑ (every environment) | directional |
| V7 | 0 < η < 1 for every row with dose > 0 (thermodynamic bound: cannot absorb more CO₂ mol-for-mol than TA added at these conditions) | physical bound |
| V8 | State-2 pH between state-0 and state-1 pH; dose = 0 rows show identically zero change | logical |
| V9 | Ω consistent with CO₃²⁻ (Ω monotone in CO₃²⁻ at fixed T, S) | consistency |
| V10 | PyCO2SYS vs independent solver agree (|ΔpH| < 0.001) on a 500-row audit sample | software |
| V11 | Solver reproduces the published check values in Dickson, Sabine & Christian (2007) | external |
| V12 | Units audit table: every column's unit derived and stated | units |
| V13 | Outlier scan (\|z\| > 4) on all calculated columns → flagged rows are **reviewed, not removed**: a row is rejected only if it violates a physical/consistency rule (V1–V9) or came from an invalid input draw; rows that are extreme but chemically valid (e.g., high-dose polar scenarios) are **retained** with `extreme_flag = True` and a logged explanation. Statistical extremeness alone is never grounds for removal — rejection happens at the input-sampling stage, never at the output stage (Revision 1) | outliers |
| V14 | Rejected-scenario log retained and counted in the methodology (nothing silently dropped) | provenance |
| V15 | Domain check: every sampled (T, S) pair must fall inside the published validity domain of the TA equation mapped to its archetype; violations are rejected at the sampling stage and logged (Revision 1) | range |

---

## 11. Planned figures (8 candidates → best 4–6 for poster)

1. Realized CO₂ uptake vs dose, by archetype (with f-uncertainty band) — *the benefit curve*
2. Marginal efficiency (mol/mol) vs dose — *the diminishing-returns test, H1*
3. Transient ΔpH and Ω_arag(state 1) vs dose with precipitation-risk band — *the risk curve, H2*
4. **Pareto frontier**: realized uptake vs perturbation index, optimal window shaded — *centerpiece, H3*
5. Heatmap: dose × temperature → realized uptake (and/or → Ω_arag_1) — *interactions*
6. Sensitivity: Sobol indices / permutation importance, side by side — *drivers*
7. Two-state schematic: TA–DIC diagram showing baseline → immediate → equilibrated path — *the concept figure judges will remember*
8. Robustness: optimal-window bounds across Monte Carlo runs (distribution strip) — *uncertainty*

All with units, uncertainty where meaningful, and captions that state the finding, not the axes.

---

## 12. Poster story (conditional — used only if results support it)

Take-home candidate: *"In 18,000 modeled scenarios, alkalinity enhancement raised seawater
carbon storage in every environment, but the transient chemistry spike — not the carbon benefit —
set the ceiling: an intermediate dose window balanced removal against perturbation, and its
location depended on where you are in the ocean."* To be rewritten from actual results.

Sections: TAKE-HOME MESSAGE → BACKGROUND → RESEARCH QUESTION → HYPOTHESIS → METHODS (8-step
numbered workflow) → DATASET (n, variables, generation, AI disclosure pointer, validation) →
RESULTS AT A GLANCE (3–5 quantified headlines, filled only after analysis) → KEY TAKEAWAYS →
LIMITATIONS → FUTURE WORK.

---

## 13. Limitations (declared up front)

Synthetic scenarios, not observations; equilibration reduced to a single fraction (no explicit
mixing, dilution, or circulation); no biology (calcifier response, primary production, ecosystem
feedbacks absent); feedstock idealized as NaOH-equivalent (no Ca²⁺/trace-metal/particle effects of
lime or olivine); precipitation represented as a risk index, not simulated kinetics; constants
extrapolated slightly below 2 °C for polar draws; archetypes are stylized, not site predictions;
no lifecycle emissions of the alkalinity source; results are conditional on the parameterizations
cited and require experimental/field validation.

---

## 14. Sources to locate and verify in Phase 2 (none cited on poster until verified)

Core (high confidence these exist; exact details to be verified, not invented):
Zeebe & Wolf-Gladrow (2001) *CO₂ in Seawater*; Dickson, Sabine & Christian (2007) *Guide to Best
Practices for Ocean CO₂ Measurements*; Lueker et al. (2000); Weiss (1974); Dickson (1990);
Millero (1995, 2010); Mucci (1983); Uppström (1974); Lee et al. (2006, TA–S); Lee et al. (2010,
borate); Riley & Tongudai (1967); Humphreys et al. (2022, PyCO2SYS); Renforth & Henderson (2017,
OAE review); NASEM (2021) *A Research Strategy for Ocean-Based CDR*; He & Tyka (2023, uptake
efficiency & equilibration); Moras et al. (2022) and Hartmann et al. (2023)
(particle-mediated precipitation-risk ranges — exact experimental Ω ranges to be transcribed
from the papers); Oschlies et al. (2023) *Guide to Best Practices in OAE Research*;
GLODAPv2 (Lauvset et al.); Jiang et al. (2019, surface pH climatology); NOAA GML (atmospheric
CO₂); IPCC AR6 (acidification & CDR context). Added in Revision 1: Millero (2010) carbonate
constants (candidate low-temperature alternative set); Sulpis et al. (2020) (polar K₁/K₂
caution); Schneider et al. (2007) (Mediterranean-type TA–S relationship for the marginal-sea
archetype).

Marked **SOURCE VERIFICATION REQUIRED**: any regulatory ΔpH guideline (e.g., ±0.2 pH at mixing
zones) used to motivate perturbation thresholds; exact mesocosm ΔTA ranges used to justify the
150–500 µmol/kg stress-test tier (until verified, those doses are described only as model
stress tests); the pseudo-homogeneous nucleation Ω range (~10–12); the freshwater TA
end-member range for the coastal mixing line; the equilibration-fraction range (0.55–0.95 at a
~1-year horizon) against He & Tyka (2023).

A `Parameter/Claim | Source | Why used` table ships as `oae_sources.md`.

---

## 15. Scientific weaknesses found in the original brief (and fixes adopted)

1. **"CO₂ uptake" was undefined in time** — uptake without an equilibration state is ambiguous.
   *Fix:* two-state model + equilibration fraction (§4).
2. **The tradeoff was implicitly located in the wrong place** — the brief expects benefit to
   saturate; chemistry says benefit is near-linear (η ~0.75–0.85) and *risk* is the nonlinear
   term. *Fix:* hypothesis restructured (H1–H3) so the project cannot be accused of hiding a flat
   benefit curve.
3. **delta_pH was ambiguous** — equilibrated ΔpH is small and transient ΔpH is large; one column
   would mislead. *Fix:* both reported.
4. **Circularity risk in scores/classifications** — *Fix:* rule-table construction, quarantine
   from ML, caption disclosure (§9).
5. **"Sustainability score" overclaims** — nothing biological is modeled, so "sustainability"
   isn't measured. *Fix:* renamed **treatment suitability score**; ecosystem language excluded.
6. **Sampling DIC and pH independently would create impossible water** — *Fix:* only TA, T, S,
   and pCO₂ disequilibrium are sampled; DIC/pH are computed.
7. **TA–salinity collinearity** would corrupt naive regressions. *Fix:* residualized TA in
   regression; collinearity reported.
8. **Dose ladder capped at 300** may keep thresholds out of range in cold water. *Fix:* extended
   to 500 with `stress_test` flag.
9. **Depth/pressure adds complexity without insight** for a surface intervention. *Fix:* surface
   mixed layer only, documented.
10. **Row-wise ML splits would leak** (12 rows share an environment). *Fix:* group split by
    `env_id`.
11. **p-values nearly meaningless at n = 18,000** — *Fix:* effect sizes and CIs lead; stated on
    poster.
12. **Feedstock identity matters in reality** (Ca(OH)₂ adds Ca²⁺ and raises Ω per mole more than
    NaOH) — out of scope but must be a named limitation, not silently ignored.

---

## 16. Revision 1 — corrections adopted from external design review (2026-08-24)

| # | Reviewed item | Correction adopted |
|---|---|---|
| R1.1 | Dose-ladder labels inconsistent between design doc and JSON tables | Single tier policy everywhere: 0 control; 10–100 deployment-relevant; **all** of 150–500 `stress_test = True` until mesocosm sourcing is verified; headline conclusions from 0–100 only (§6.1) |
| R1.2 | Baseline chemistry generation underspecified | TA generated from the actual zone-specific Lee et al. (2006) TA = f(S, T) regional equations with archetype→zone mapping and published validity domains; archetype TA ranges demoted to plausibility checks; coastal archetype uses a two-end-member mixing line; marginal sea uses a Mediterranean-type relation (§6.2) |
| R1.3 | Lee et al. treated as a single TA–S line | Actual regional T+S equations implemented, coefficients transcribed from the paper and unit-tested against published example values (§6.2) |
| R1.4 | Upper doses over-claimed as mesocosm-comparable | Strictly labeled model stress tests until sourced; reporting policy split into deployment-relevant vs model-characterization results (§6.1) |
| R1.5 | Equilibration fraction f conflated with uptake efficiency η | Explicitly separated: η_thermo is a computed thermodynamic output (~0.75–0.85 per literature); f is a sampled kinetic input; columns renamed (`thermo_efficiency_eta_mol_mol`); marginal analysis defined on potential uptake (§4, §6.3) |
| R1.6 | Ω ≈ 5 used as a universal precipitation threshold — biggest issue | Replaced with a tiered, particle-context-dependent risk framework: heterogeneous tier θ_het ~4–7 (particle-rich, Moras/Hartmann, to verify) and pseudo-homogeneous tier θ_hom ~10–12.5 (verification required), both uncertain in Monte Carlo; two flags plus a documented particle-context assumption; "causes precipitation" language banned (§6.4) |
| R1.7 | Outlier rule could auto-delete valid physics | V13 rewritten: statistical extremeness alone never removes a row; rejection only for physical/consistency violations at the input stage; valid extremes retained with `extreme_flag` (§10) |
| R1.8 | Lueker constants extrapolated below 2 °C | Per-row constants policy with a low-temperature-valid alternative set, a `constants_set` column, no silent mixing, and a whole-dataset sensitivity rerun; polar K₁/K₂ caution added to limitations (§7) |
| R1.9 | Dataset generation | Still not generated — Phase 2 begins only after these corrections are approved |

## 17. Phase 2 gate

On approval of this design: implement generator + validation + solver cross-check; produce
`oae_synthetic_dataset.csv`, `oae_data_dictionary.csv`, `oae_methodology.md`,
`oae_ai_disclosure.md` (naming the AI tool and model and preserving the full generation prompt,
as TSA requires), `oae_sources.md` (verified), analysis code, `oae_analysis_summary.csv`,
`/figures/`, and `README.md` with full reproduction instructions (fixed seed).
