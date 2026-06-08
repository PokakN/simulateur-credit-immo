# Refonte UI & architecture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the single-file crédit-immo simulator into a multi-file architecture with a
collapsible side-by-side "section paramètres du projet" (replacing the narrow sidebar), a mode
switcher that prepares the ground for the future "Investissement locatif" tool, and a lighter
overlay-based scénario-B comparison — all while preserving every existing behavior and saved-data
format.

**Architecture:** Split `index.html` (currently ~1950 lines, single file) into a shell
(`index.html`) plus `styles.css`, `shared/calc-utils.js`, `shared/persistence.js`,
`credit/engine.js`, `credit/ui.js`, `shared/ui-components.js` (added in Phase D), and `app.js` —
all loaded via plain `<script src>`/`<link>` tags in dependency order, no bundler. The move happens
in two stages: first a behavior-preserving mechanical split (Phase B), verified to change nothing;
then the structural UI changes land on top of the new structure (Phases C–F).

**Tech Stack:** Static HTML/CSS/JS, Chart.js 4.4.0 (UMD, CDN), `localStorage`, `npx serve` — no
build step, no package manager, no test suite (manual verification via the `run`/`verify` skills).

---

## Before you start

- Spec: `docs/superpowers/specs/2026-06-08-refonte-ui-architecture-design.md` — read it once for
  the "why" behind each decision below.
- Run the app once on `master` (`npx serve -l 5500 .`, open `http://localhost:5500`) and exercise it
  manually — change a few inputs, open "Projets sauvegardés", add a scénario B — so you have a
  mental "before" picture to compare against after each phase. Take note of: the KPI values shown
  for the default inputs, the shape of the three charts, and the amortization table's first three
  rows. You'll re-check these after Phase B to confirm nothing changed.
- Work on a dedicated branch (Step 1 creates it).
- **Line numbers below are current as of commit `ca32fdc`.** The file changes as you work through
  earlier tasks — always re-locate a function by `grep -n "^\s*function name"` before cutting, never
  trust a hardcoded line number blindly.

---

## Phase A — Setup

### Task 1: Create branch and file skeleton

**Files:**
- Create: `styles.css`, `shared/calc-utils.js`, `shared/persistence.js`, `credit/engine.js`,
  `credit/ui.js`, `app.js` (empty placeholders for now)

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b refonte-ui-architecture
```

- [ ] **Step 2: Create empty placeholder files with a one-line header comment each**

Create each file with just a header comment naming its purpose — they'll be filled in later phases.
This locks in the target layout and lets you reference real paths from here on.

`styles.css`:
```css
/* Styles extraits de index.html — voir docs/superpowers/specs/2026-06-08-refonte-ui-architecture-design.md */
```

`shared/calc-utils.js`:
```js
// Formatage et calculs financiers génériques, partagés entre les modes Crédit et Investissement locatif.
```

`shared/persistence.js`:
```js
// Sauvegarde/chargement des projets (localStorage) et notifications toast, partagés entre les modes.
```

`credit/engine.js`:
```js
// Moteur de calcul du simulateur de crédit immobilier (amortissement, KPIs).
```

`credit/ui.js`:
```js
// Rendu de l'interface du mode Crédit immobilier (paramètres, résultats, graphiques, tableaux).
```

`app.js`:
```js
// Bootstrap de l'application : sélecteur de mode, init au chargement.
```

- [ ] **Step 3: Commit the skeleton**

```bash
git add styles.css shared/ credit/ app.js
git commit -m "$(cat <<'EOF'
chore: poser le squelette de fichiers pour la refonte UI/architecture

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase B — Behavior-preserving file split

The goal of this phase is to move existing code verbatim into the new files — **no logic changes**.
After each task, the app must look and behave exactly as it did on `master`. This is the highest-risk
phase (easy to break a global by missing a function or mis-ordering scripts), so each task ends with
a manual check.

### Task 2: Extract CSS into `styles.css`

**Files:**
- Modify: `index.html` (remove `<style>...</style>` block, add `<link>`)
- Modify: `styles.css`

- [ ] **Step 1: Locate the style block**

```bash
grep -n "<style>\|</style>" index.html
```
It currently spans from the `<style>` opening tag (around line 11) to `</style>` (around line 367).

- [ ] **Step 2: Read the full block**

Use Read on `index.html` with `offset` just after `<style>` and enough `limit` to cover through the
line before `</style>` (the CSS rules — everything from `:root {` through the final `.btn-add-tranche:hover`
rule).

- [ ] **Step 3: Write that CSS into `styles.css`**, replacing the placeholder header comment with
the header comment followed by the CSS content you just read (verbatim, unchanged).

- [ ] **Step 4: Replace the `<style>...</style>` block in `index.html`** with a stylesheet link,
placed where the `<style>` tag was (after the Google Fonts `<link>` and Chart.js `<script>` tags):

```html
  <link rel="stylesheet" href="styles.css">
```

- [ ] **Step 5: Manually verify nothing changed visually**

```bash
npx serve -l 5500 .
```
Open `http://localhost:5500`. Confirm: masthead, sidebar, KPI cards, charts, tables all look
identical to the "before" picture (same fonts, colors, spacing). Open devtools console — no 404 for
`styles.css`, no CSS-related errors.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css
git commit -m "$(cat <<'EOF'
refactor: extraire le CSS dans styles.css

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 3: Extract generic formatting/calc helpers into `shared/calc-utils.js`

**Files:**
- Modify: `index.html` (remove the moved functions, add `<script src>`)
- Modify: `shared/calc-utils.js`

These five functions are pure, have no DOM dependencies beyond `Intl.NumberFormat`, and are
generic enough to be reused by the future locatif module: `fmt`, `fmtPct`, `fmtRaw`,
`calcMensualite`, `calcTAEG`.

- [ ] **Step 1: Locate each function's current bounds**

```bash
grep -n "^\s*function \(fmt\|fmtPct\|fmtRaw\|calcMensualite\|calcTAEG\)\b" index.html
```

Read each function in full (Read with the right `offset`/`limit`) so you have its exact current
text — they must move byte-for-byte.

- [ ] **Step 2: Write them into `shared/calc-utils.js`**, after the header comment, in this order:
`fmt`, `fmtPct`, `fmtRaw`, `calcMensualite`, `calcTAEG` — each exactly as it reads in `index.html`
(same body, same formatting).

- [ ] **Step 3: Remove the five function definitions from `index.html`**

Use Edit to delete each function block from `index.html` (the whole `function name(...) { ... }`,
including its closing brace). Do this one function at a time, re-running the grep from Step 1
between deletions if line numbers drift.

- [ ] **Step 4: Add the script tag** in `index.html`, immediately before the first remaining
`<script>` block (the one that still contains `calcAmortissement`/`calcSimulation`):

```html
  <script src="shared/calc-utils.js"></script>
```

- [ ] **Step 5: Verify**

Reload `http://localhost:5500`. Open devtools console — there should be **no** "fmt is not defined"
/ "calcTAEG is not defined" errors, and no 404 for `shared/calc-utils.js`. KPI cards, charts and
tables should render with the same numbers as the "before" picture (formatted amounts like
"290 000 €" prove `fmt` is working from its new location).

- [ ] **Step 6: Commit**

```bash
git add index.html shared/calc-utils.js
git commit -m "$(cat <<'EOF'
refactor: extraire fmt/fmtPct/fmtRaw/calcMensualite/calcTAEG dans shared/calc-utils.js

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 4: Extract persistence and toast helpers into `shared/persistence.js`

**Files:**
- Modify: `index.html`
- Modify: `shared/persistence.js`

These functions manage saved-projects storage, the projets slide-over panel, and toast
notifications — all generic enough to be reused once the locatif mode also needs to save projects:
`STORAGE_KEY` (the constant), `chargerProjets`, `sauvegarderProjets`, `genId`, `sauvegarderProjet`,
`mettreAJourProjet`, `chargerProjet`, `supprimerProjet`, `exporterProjets`, `importerProjets`,
`renderProjetsList`, `openProjetsPanel`, `closeProjetsPanel`, `showToast`.

- [ ] **Step 1: Locate current bounds**

```bash
grep -n "^\s*\(const STORAGE_KEY\|function \(chargerProjets\|sauvegarderProjets\|genId\|sauvegarderProjet\|mettreAJourProjet\|chargerProjet\|supprimerProjet\|exporterProjets\|importerProjets\|renderProjetsList\|openProjetsPanel\|closeProjetsPanel\|showToast\)\)\b" index.html
```

Read each in full — they run contiguously from `const STORAGE_KEY` to the end of `showToast`
(roughly lines 1747–1942 on `master`, but re-check with the grep above since Tasks 2–3 shifted
things).

- [ ] **Step 2: Write them into `shared/persistence.js`**, after the header comment, in this order:
`STORAGE_KEY`, `chargerProjets`, `sauvegarderProjets`, `genId`, `sauvegarderProjet`,
`mettreAJourProjet`, `chargerProjet`, `supprimerProjet`, `exporterProjets`, `importerProjets`,
`renderProjetsList`, `openProjetsPanel`, `closeProjetsPanel`, `showToast` — each exactly as it
currently reads.

> Note: `chargerProjet` calls `setTranches`, `onTypeChange`, and reads `lireParams`/`calcSimulation`
> — all credit-mode functions defined elsewhere. That's fine: these are plain global functions, and
> script load order (Task 6 wires this up) guarantees they exist by the time `chargerProjet` runs
> (it only runs in response to a user click, long after all scripts have loaded).

- [ ] **Step 3: Remove these definitions from `index.html`** (one at a time, re-grepping between
deletions as line numbers shift).

- [ ] **Step 4: Add the script tag**, after `shared/calc-utils.js`:

```html
  <script src="shared/persistence.js"></script>
```

- [ ] **Step 5: Verify**

Reload. Open "Projets sauvegardés" (bottom of sidebar A) — the panel should slide in with no
console errors. Save a project, confirm the toast appears ("Projet ... sauvegardé"), confirm it
shows in the list, click "Mettre à jour" and "Charger" on it, then delete it via the trash icon in
its card. Export to JSON and re-import it. All flows should behave exactly as before.

- [ ] **Step 6: Commit**

```bash
git add index.html shared/persistence.js
git commit -m "$(cat <<'EOF'
refactor: extraire la persistance des projets et les toasts dans shared/persistence.js

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 5: Extract the credit calculation engine into `credit/engine.js`

**Files:**
- Modify: `index.html`
- Modify: `credit/engine.js`

Two functions: `calcAmortissement`, `calcSimulation`. (`calcMensualite`/`calcTAEG`, which they call,
already live in `shared/calc-utils.js` loaded earlier — that's fine, they're globals.)

- [ ] **Step 1: Locate current bounds**

```bash
grep -n "^\s*function \(calcAmortissement\|calcSimulation\)\b" index.html
```

Read both functions in full.

- [ ] **Step 2: Write them into `credit/engine.js`**, after the header comment, `calcAmortissement`
then `calcSimulation`, exactly as they read.

- [ ] **Step 3: Remove both from `index.html`.**

- [ ] **Step 4: Add the script tag**, after `shared/persistence.js`:

```html
  <script src="credit/engine.js"></script>
```

You should now have an (almost) empty first `<script>` block left in `index.html` — the comment
banner `<!-- ==================== MOTEUR DE CALCUL ==================== -->` and its `<script>` tags
now wrap nothing. Remove that empty `<script>...</script>` pair and its banner comment too.

- [ ] **Step 5: Verify**

Reload. KPI values, the amortization table, and all three charts must show the exact same numbers
as your "before" picture — these functions are the heart of every calculation in the app, so any
typo here would show up as wrong numbers or a blank results area. Check the console for errors.

- [ ] **Step 6: Commit**

```bash
git add index.html credit/engine.js
git commit -m "$(cat <<'EOF'
refactor: extraire calcAmortissement/calcSimulation dans credit/engine.js

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 6: Extract the remaining credit UI code into `credit/ui.js`, wire up `app.js`

**Files:**
- Modify: `index.html`
- Modify: `credit/ui.js`
- Modify: `app.js`

Everything left in the second `<script>` block is credit-mode UI/state code. Move it all into
`credit/ui.js`, in its current order:

`chartPrincipal`, `chartSecondaire`, `chartDonut`, `modeGraphique`, `modeChartPrincipal`,
`modeTableau`, `scenarioBActif`, `tranchesA`, `tranchesB` (the `let` declarations), `getTranches`,
`setTranches`, `initTranches`, `renderTranchesUI`, `refreshTrancheDerivedValues`,
`onTrancheChange`, `addTranche`, `removeTranche`, `PRESETS`, `selectTypeProjet`,
`syncTypeSegment`, `onTypeChange`, `onTravauxInput`, `lireParams`, `updateCapitalDisplay`,
`_kpiHTML`, `renderKPIs`, `onInput`, `renderGraphiquePrincipal`, `toggleGraphiquePrincipalMode`,
`renderGraphiqueSecondaire`, `toggleGraphiqueMode`, `renderDonut`, `renderRecapFrais`,
`renderRecapFinancement`, `renderTableau`, `toggleTableauMode`, `toggleScenarioB`.

- [ ] **Step 1: Locate the bounds of the whole remaining block**

```bash
grep -n "INTERFACE & RENDU\|^\s*function toggleScenarioB" index.html
```

Read from the `<script>` opening tag of the "INTERFACE & RENDU" block through the end of
`toggleScenarioB`'s closing brace (everything that's left of that second script block, minus the
trailing init code — see Step 3).

- [ ] **Step 2: Write that whole block into `credit/ui.js`**, after the header comment, verbatim.

- [ ] **Step 3: Identify and separate the trailing bootstrap code**

At the very end of the second `<script>` block (right before `</script></body></html>`), there's
init code that doesn't belong to any named function — it sets the masthead date, seeds
`tranchesA` with a default principal tranche, and calls `onTypeChange('a')`:

```bash
grep -n "mastheadDateEl\|Init$" index.html
```

This snippet (roughly the last ~8 lines of the script block) is bootstrap logic — it belongs in
`app.js`, not `credit/ui.js`. Do **not** include it in the `credit/ui.js` content from Step 2 (cut
it separately).

- [ ] **Step 4: Write the bootstrap snippet into `app.js`**, after the header comment:

```js
function initApp() {
  const mastheadDateEl = document.getElementById('masthead-date');
  if (mastheadDateEl) mastheadDateEl.textContent = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  // Start with default tranches for Ancien
  if (tranchesA.length === 0) {
    setTranches('a', [{ id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false, taux: 3.40, duree: 20 }]);
  }
  onTypeChange('a');
}

initApp();
```

(This wraps the exact same statements in a named function — purely organizational, the behavior is
identical: it still runs once, synchronously, when the script loads.)

- [ ] **Step 5: Remove the entire second `<script>...</script>` block (including its
"INTERFACE & RENDU" banner comment) from `index.html`.**

- [ ] **Step 6: Add the two remaining script tags**, in order, right before `</body>`:

```html
  <script src="credit/ui.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 7: Verify the full app end-to-end**

Reload `http://localhost:5500`. Walk through every interactive element and compare against your
"before" picture:
- Change "Prix du bien", "Apport" — KPIs and charts update live.
- Switch project type (Ancien/Neuf/VEFA) — notaire badge, travaux section, PTZ tranche appear/disappear correctly.
- Add/remove a tranche ("+ Ajouter un prêt").
- Toggle the three chart modes (gain/capital, barres/aires, mois/année).
- Open "Projets sauvegardés", save, load, update, delete, export, import.
- Click "+ Ajouter scénario B" — sidebar B appears pre-filled with A's values; KPIs render as a
  side-by-side comparison grid; remove it again.
- Check the masthead date is populated.
- Open devtools console — zero errors.

- [ ] **Step 8: Commit**

```bash
git add index.html credit/ui.js app.js
git commit -m "$(cat <<'EOF'
refactor: extraire l'UI du mode crédit dans credit/ui.js, créer app.js

Termine le découpage en fichiers : index.html devient une coquille qui
charge styles.css + shared/*.js + credit/*.js + app.js dans l'ordre.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 7: Full regression check of the file split

**Files:** none (verification only)

- [ ] **Step 1: Use the `run`/`verify` skill to drive the app fresh**

Restart the server (`npx serve -l 5500 .`), open in a clean browser tab, and re-run through the full
checklist from Task 6 Step 7 once more — plus: reload the page mid-session (does the masthead date
still populate? do default tranches still seed correctly on a blank `localStorage`?), and resize the
window below 980px to confirm the responsive layout still collapses the sidebar to full width.

- [ ] **Step 2: Confirm no behavior differs from `master`**

If you noted specific KPI values / chart shapes / table rows in "Before you start", compare them
now — they must be identical (the calculation engine moved file but not logic).

This task has no commit — it's a checkpoint. If you find a regression, fix it now (with its own
commit) before moving to Phase C; the rest of the plan builds UI changes on top of this split, and
debugging a structural issue later, mixed in with new UI code, is much harder.

---

## Phase C — Mode switcher infrastructure

### Task 8: Add the Crédit / Investissement-locatif mode switcher

**Files:**
- Modify: `index.html` (masthead markup)
- Modify: `styles.css`
- Modify: `app.js`

- [ ] **Step 1: Add the switcher markup to the masthead**

In `index.html`, find the `<header class="masthead">` block:

```bash
grep -n "masthead-meta\|masthead-title" index.html
```

Add a `<div class="mode-switch">` between `.masthead-title` and `.masthead-meta`:

```html
  <header class="masthead">
    <div class="masthead-title">Simulateur <em>Crédit Immobilier</em></div>
    <div class="mode-switch" id="mode-switch">
      <button type="button" class="mode-btn active" data-mode="credit" onclick="switchMode('credit')">Crédit immobilier</button>
      <button type="button" class="mode-btn" data-mode="locatif" disabled title="Bientôt disponible">
        Investissement locatif <span class="mode-badge">bientôt</span>
      </button>
    </div>
    <div class="masthead-meta">
      <span>Réf. Sim—01</span>
      <span>Échelle 1:1</span>
      <span id="masthead-date"></span>
    </div>
  </header>
```

- [ ] **Step 2: Add the switcher styles to `styles.css`**

Append to the end of the file (or near the existing `.type-segment`/`.type-seg-btn` rules they're
modeled on — search for `TYPE CONTROL`):

```css
/* ---- MODE SWITCH ---- */
.mode-switch { display: flex; gap: 7px; }
.mode-btn {
  background: rgba(8, 13, 26, .35);
  border: 1px solid rgba(138, 166, 196, .3); border-radius: 3px;
  color: var(--parchment-muted);
  font-family: var(--font-display); font-style: italic; font-size: 13px;
  padding: 8px 16px; cursor: pointer; transition: all .2s ease;
}
.mode-btn:hover:not(:disabled) { border-color: var(--blueprint-soft); color: var(--parchment); }
.mode-btn.active {
  background: var(--rust); border-color: var(--rust);
  color: var(--paper); font-style: normal; font-weight: 600;
}
.mode-btn:disabled { cursor: not-allowed; opacity: .55; }
.mode-badge {
  font-family: var(--font-mono); font-size: 9px; letter-spacing: .08em; text-transform: uppercase;
  background: rgba(138,166,196,.18); color: var(--parchment-muted);
  border-radius: 2px; padding: 2px 6px; margin-left: 6px;
}
```

- [ ] **Step 3: Add `switchMode` to `app.js`**

The "Investissement locatif" button is `disabled`, so it can't be clicked — `switchMode` only ever
receives `'credit'` for now. It exists so the routing seam is in place for the next spec (which will
remove `disabled`, mount a `#app-locatif` container, and extend this function to actually swap
views). Add it above `initApp`:

```js
let currentMode = 'credit';

function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}
```

- [ ] **Step 4: Verify**

Reload. The masthead now shows two buttons: "Crédit immobilier" (active, rust-colored) and
"Investissement locatif" with a "bientôt" badge — greyed out, cursor shows "not-allowed", and
clicking it does nothing (it's `disabled`). Clicking "Crédit immobilier" again does nothing
(already active). No console errors.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css app.js
git commit -m "$(cat <<'EOF'
feat: ajouter le sélecteur de mode Crédit / Investissement locatif

L'onglet Investissement locatif est visible mais désactivé ("bientôt") ;
prépare la structure de routage pour le module à venir.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase D — New collapsible "section paramètres du projet"

### Task 9: Replace the sidebar wrapper with a collapsible `<section class="params-section">`

**Files:**
- Modify: `index.html` (markup)
- Modify: `styles.css`

We keep every `.sidebar-group` / `.sidebar-field` / `.sidebar-footer` element and class **exactly as
they are** (including the dynamically-generated tranche cards, which reference `sidebar-field` in
JS strings) — only the **outer wrapper** changes, from a narrow fixed-width `<aside class="sidebar">`
to a wider, collapsible `<section class="params-section">` with a toggle header and an inner
scrollable body wrapping a responsive grid of the same group cards.

- [ ] **Step 1: Locate the sidebar markup**

```bash
grep -n '<aside class="sidebar"' index.html
```

There are two: `id="sidebar-a"` and `id="sidebar-b"`.

- [ ] **Step 2: Wrap sidebar A's groups in the new structure**

Replace the opening `<aside class="sidebar" id="sidebar-a">` and its matching closing `</aside>`
(keep every `<div class="sidebar-group">...</div>` and the `<div class="sidebar-footer">` between
them untouched) with:

```html
    <!-- ===== SECTION PARAMÈTRES — SCÉNARIO A ===== -->
    <section class="params-section" id="params-section-a">
      <button type="button" class="params-toggle" onclick="toggleParamsSection()" aria-expanded="true" aria-controls="params-body-a">
        <span class="params-toggle-label">Paramètres du projet</span>
        <span class="params-toggle-chevron">▾</span>
      </button>
      <div class="params-body" id="params-body-a">
        <div class="params-grid">
          <!-- les 6 cartes .sidebar-group existantes restent ici, inchangées -->
        </div>
        <!-- le .sidebar-footer existant reste ici, inchangé -->
      </div>
    </section>
```

i.e.: insert the `<section class="params-section" id="params-section-a">` opening + toggle button +
`<div class="params-body"><div class="params-grid">` right after the old `<aside ...>` opening tag,
move the closing `</div></div>` (for `.params-grid`/`.params-body`) to just before the
`<div class="sidebar-footer">`, and close with `</section>` where `</aside>` was. Concretely with
Edit: replace `<aside class="sidebar" id="sidebar-a">\n\n      <!-- PROJET -->` with the section
opening shown above followed by `\n\n      <!-- PROJET -->`; replace
`<div class="sidebar-footer">` with `</div>\n\n      <div class="sidebar-footer">`; replace the
`</aside>` that closes sidebar A with `</div>\n    </section>`.

- [ ] **Step 3: Repeat for sidebar B**, but **do not** add a `params-toggle`/collapse wrapper around
it — sidebar B is being replaced by an overlay panel in Phase E (Task 12), so leave `sidebar-b`'s
`<aside>` markup untouched for now. (It stays hidden via its existing `style="display:none"` and
will be deleted/repurposed in Task 12.)

- [ ] **Step 4: Add `.params-section` styles to `styles.css`**

These replace `.sidebar`'s role (the old `.sidebar` rule becomes dead — remove it, see Step 5).
Add near the old sidebar rules (search for `---- SIDEBAR ----`):

```css
/* ---- SECTION PARAMÈTRES (collapsible, côte à côte) ---- */
.params-section {
  width: 560px; min-width: 560px; max-width: 560px;
  background: var(--ink); color: var(--parchment);
  border-radius: 5px; overflow: hidden;
  display: flex; flex-direction: column;
  height: 100%;
  transition: width .25s ease, min-width .25s ease, max-width .25s ease;
}
.params-section.collapsed { width: 60px; min-width: 60px; max-width: 60px; }
.params-section.collapsed .params-body { display: none; }
.params-toggle {
  flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
  width: 100%; background: rgba(232,225,210,.04); border: none;
  border-bottom: 1px solid var(--ink-line); color: var(--parchment);
  font-family: var(--font-display); font-style: italic; font-size: 15px;
  padding: 16px 20px; cursor: pointer; transition: background .15s ease;
}
.params-toggle:hover { background: rgba(232,225,210,.08); }
.params-toggle-chevron { font-size: 13px; transition: transform .2s ease; color: var(--rust); }
.params-section.collapsed .params-toggle-chevron { transform: rotate(-90deg); }
.params-section.collapsed .params-toggle-label { writing-mode: vertical-rl; text-orientation: mixed; }
.params-body { flex: 1; min-height: 0; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.params-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}
```

- [ ] **Step 5: Remove the now-dead `.sidebar` rule**

Search for `.sidebar {` (the rule with `width: 320px; min-width: 320px;`) and delete that whole
rule block — it no longer matches any element (sidebar A's wrapper is now `.params-section`;
sidebar B's `<aside class="sidebar">` still exists until Task 12, so **keep `.sidebar` for now** —
skip this sub-step until Task 12 removes the last `<aside class="sidebar">`).

- [ ] **Step 6: Update the `.sidebar-footer` rule** (it used `position: sticky` relative to the old
narrow scrolling `<aside>`; the new scroll container is `.params-body`). Find `.sidebar-footer {`
and change it to a simple static footer:

```css
.sidebar-footer {
  margin-top: 8px; padding-top: 14px; border-top: 1px solid var(--ink-line);
  display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;
}
```

(Drop the `position: sticky; bottom: -22px; z-index: 5; margin: 8px -20px -22px; padding: 14px 20px 22px; background: var(--ink);` — those compensated for the old narrow-aside layout.)

- [ ] **Step 7: Update the responsive media query**

Find `@media (max-width: 980px)` and change `.sidebar, .content { height: auto; overflow-y: visible; }`
and `.sidebar { width: 100%; min-width: 0; }` to also/instead target `.params-section`:

```css
    @media (max-width: 980px) {
      body { overflow: auto; }
      .app, .app-mode { flex-direction: column; height: auto; }
      .params-section, .content { height: auto; overflow-y: visible; }
      .params-section { width: 100%; min-width: 0; max-width: none; }
      .charts-row { grid-template-columns: 1fr; }
      .comparison-grid { grid-template-columns: 1fr; }
      .recap-row { grid-template-columns: 1fr; }
    }
```

(`.app-mode` doesn't exist yet — it's introduced as a wrapper in the next step; adding it here now
means you won't have to revisit this query.)

- [ ] **Step 8: Wrap params-section + content in a `.app-mode` flex row**

Currently `<div class="app">` directly contains `<aside id="sidebar-a">`, `<aside id="sidebar-b">`,
and `<main class="content">`. Wrap the params section and the main content (but not sidebar B —
that's leaving in Task 12) in a new `.app-mode` container so the side-by-side layout is scoped to
the credit mode (ready for a sibling `#app-locatif` later):

```html
  <div class="app">
    <div class="app-mode" id="app-credit">
      <!-- ===== SECTION PARAMÈTRES — SCÉNARIO A ===== -->
      <section class="params-section" id="params-section-a"> ... </section>
      <!-- ===== MAIN CONTENT ===== -->
      <main class="content"> ... </main>
    </div>
    <!-- ===== SIDEBAR B (sera retirée en Phase E) ===== -->
    <aside class="sidebar" id="sidebar-b" style="display:none"> ... </aside>
  </div>
```

Add the `.app-mode` rule to `styles.css` (near `.app`):

```css
.app-mode { display: flex; flex: 1; min-height: 0; gap: 18px; padding: 0 0 0 0; }
```

Wait — check the existing `.app` rule (`display: flex; flex: 1; min-height: 0;`) and `.content`'s
padding (`padding: 28px`). To avoid doubling up spacing, give `.app-mode` the gap and let `.content`
keep its own padding; `.app` itself just becomes a simple flex container for `.app-mode` (and later
`#app-locatif`). Add `padding: 22px 0 22px 30px` to `.app-mode` so the params-section aligns with
the masthead's left padding (the old `.sidebar` had `padding: 22px 20px` baked in — replicate that
visual alignment at the `.app-mode` level instead, and remove the now-redundant top/bottom padding
from `.params-body` if it looks doubled when you check visually in Step 9).

- [ ] **Step 9: Verify visually**

Reload. You should see: a wider dark panel on the left (params, ~560px) with a header bar reading
"Paramètres du projet ▾", grouped cards now arranged in a multi-column grid instead of one narrow
column, and the results area to its right — both visible simultaneously. Compare spacing/alignment
against the masthead and adjust the padding values from Step 8 if anything looks doubled or
misaligned. Confirm every input still works (typing in a field still triggers `onInput()` and
updates results live) — the `id` attributes didn't change, only their container did.

- [ ] **Step 10: Commit**

```bash
git add index.html styles.css
git commit -m "$(cat <<'EOF'
feat: remplacer la sidebar par une section paramètres plus large, côte à côte

Conserve toutes les cartes/champs existants ; seul le conteneur change
(aside étroite -> section repensée avec en-tête de bascule).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 10: Make the params section collapsible, with persisted state

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add `toggleParamsSection` and a restore-on-load helper**

Append to `app.js` (above `initApp`):

```js
const PARAMS_COLLAPSED_KEY = 'simulateur_params_collapsed';

function toggleParamsSection() {
  const section = document.getElementById('params-section-a');
  if (!section) return;
  const collapsed = section.classList.toggle('collapsed');
  localStorage.setItem(PARAMS_COLLAPSED_KEY, collapsed ? '1' : '0');
  section.querySelector('.params-toggle').setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function restoreParamsSectionState() {
  const section = document.getElementById('params-section-a');
  if (!section) return;
  if (localStorage.getItem(PARAMS_COLLAPSED_KEY) === '1') {
    section.classList.add('collapsed');
    section.querySelector('.params-toggle').setAttribute('aria-expanded', 'false');
  }
}
```

- [ ] **Step 2: Call `restoreParamsSectionState()` from `initApp`**

In `app.js`, find `initApp` and add the call right after the masthead-date line:

```js
function initApp() {
  const mastheadDateEl = document.getElementById('masthead-date');
  if (mastheadDateEl) mastheadDateEl.textContent = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  restoreParamsSectionState();
  // Start with default tranches for Ancien
  if (tranchesA.length === 0) {
    setTranches('a', [{ id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false, taux: 3.40, duree: 20 }]);
  }
  onTypeChange('a');
}
```

- [ ] **Step 3: Verify**

Reload. Click the "Paramètres du projet ▾" header — the panel collapses to a slim vertical strip
(chevron rotates, label becomes vertical text), and the results area expands to fill the freed
space. Click again — it expands back, inputs are untouched (same values as before collapsing).
Reload the page — the collapsed/expanded state persists (check both: collapse it, reload, confirm
still collapsed; expand it, reload, confirm still expanded). Open devtools → Application →
Local Storage — confirm a `simulateur_params_collapsed` key with value `'0'` or `'1'`.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "$(cat <<'EOF'
feat: rendre la section paramètres repliable, état persisté

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase E — Comparaison de scénarios A/B repensée

### Task 11: Replace sidebar B with an on-demand overlay panel

**Files:**
- Modify: `index.html` (markup: remove `<aside id="sidebar-b">`, add overlay; update the trigger
  button)
- Modify: `styles.css`

- [ ] **Step 1: Remove the `<aside class="sidebar" id="sidebar-b">` block**

```bash
grep -n '<aside class="sidebar" id="sidebar-b"' index.html
```

Read it fully first (you'll need its inner `.sidebar-group` cards for Step 2), then delete the
entire `<aside ...>...</aside>` block from `index.html`.

- [ ] **Step 2: Add the overlay markup**, reusing the existing slide-over pattern (`.projets-overlay`
/ `.projets-panel`) with a wide modifier. Place it right after the `<!-- ===== PANNEAU PROJETS ===== -->`
overlay block:

```html
  <!-- ===== PANNEAU SCÉNARIO B ===== -->
  <div class="projets-overlay" id="scenario-b-overlay" onclick="closeScenarioBPanel(event)">
    <div class="projets-panel projets-panel--wide" onclick="event.stopPropagation()">
      <div class="projets-panel-header">
        <h2>Scénario B — comparaison</h2>
        <button class="projets-panel-close" onclick="closeScenarioBPanel()">✕</button>
      </div>
      <div class="params-body" id="params-body-b">
        <div class="params-grid">
          <!-- les 6 cartes .sidebar-group de l'ancienne sidebar B vont ici, avec leurs ids b-* inchangés -->
        </div>
      </div>
      <div class="projets-panel-footer">
        <button class="btn-danger" onclick="removeScenarioB()" style="flex:1">✕ Retirer le scénario B</button>
      </div>
    </div>
  </div>
```

Paste the six `.sidebar-group` cards you read in Step 1 (Type de projet — B, Emprunts — B, Frais — B,
Travaux — B, Différé — B, Valorisation — B) verbatim inside `.params-grid` — their `b-*` ids and
`onclick`/`oninput` handlers stay exactly as they were; only their container changed (just like
Task 9 did for scenario A). **Do not** include the old sidebar B's `.sidebar-footer` (the
"✕ Supprimer scénario B" button) — it's replaced by the new "Retirer le scénario B" footer button
shown above.

- [ ] **Step 3: Replace the trigger button**

In sidebar A's footer (now inside `#params-body-a .sidebar-footer`), find:

```html
<button class="btn-scenario" onclick="toggleScenarioB()">+ Ajouter scénario B</button>
```

Replace with:

```html
<button class="btn-scenario" id="btn-scenario-b-toggle" onclick="openScenarioBPanel()">+ Comparer un scénario B</button>
```

- [ ] **Step 4: Add the `--wide` modifier style**

In `styles.css`, near `.projets-panel {`, add:

```css
.projets-panel--wide { width: 640px; }
```

- [ ] **Step 5: Now that the last `<aside class="sidebar">` is gone, remove the dead `.sidebar` rule**

```bash
grep -n "^\s*\.sidebar {" styles.css
```

Delete that rule block (the one with `width: 320px; min-width: 320px; padding: 22px 20px; ...`).

- [ ] **Step 6: Verify markup-only state (logic comes in Task 12)**

Reload. Clicking "+ Comparer un scénario B" will currently call `openScenarioBPanel` which doesn't
exist yet — the console will show "openScenarioBPanel is not defined". That's expected at this
checkpoint; don't worry about it. Just confirm: the page loads without *other* errors, and
`#scenario-b-overlay` exists in the DOM (inspect via devtools) with `display: none` (closed state,
inherited from `.projets-overlay`'s default).

- [ ] **Step 7: Commit**

```bash
git add index.html styles.css
git commit -m "$(cat <<'EOF'
refactor: remplacer la sidebar B par un panneau overlay à la demande

Markup uniquement — la logique d'ouverture/fermeture arrive au commit suivant.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 12: Implement open/close/remove logic for the scénario-B panel

**Files:**
- Modify: `credit/ui.js`

- [ ] **Step 1: Locate `toggleScenarioB`**

```bash
grep -n "^\s*function toggleScenarioB" credit/ui.js
```

Read it in full — you'll replace it with three new functions that reuse its pre-fill logic.

- [ ] **Step 2: Replace `toggleScenarioB` with `openScenarioBPanel`, `closeScenarioBPanel`, and
`removeScenarioB`**

```js
function openScenarioBPanel() {
  if (!scenarioBActif) {
    scenarioBActif = true;
    // Pré-remplir B avec les valeurs de A
    const ids = ['prix-projet','assurance','apport','notaire',
                 'dossier','garantie-pct','differe-mois',
                 'travaux-m2','travaux-prix-m2','travaux-total','apprec'];
    ids.forEach(id => {
      const src = document.getElementById(`a-${id}`);
      const dst = document.getElementById(`b-${id}`);
      if (src && dst) dst.value = src.value;
    });
    ['differe-type','type-projet'].forEach(id => {
      const src = document.getElementById(`a-${id}`);
      const dst = document.getElementById(`b-${id}`);
      if (src && dst) dst.value = src.value;
    });
    // Copy tranches from A to B
    setTranches('b', JSON.parse(JSON.stringify(tranchesA)));
    renderTranchesUI('b');
    // Apply type presets (notaire badge etc) without reiniting tranches
    const type = document.getElementById('b-type-projet')?.value || 'ancien';
    const pr = PRESETS[type] || PRESETS.ancien;
    const notaireEl = document.getElementById('b-notaire');
    if (notaireEl) { notaireEl.min = pr.notaireMin; notaireEl.max = pr.notaireMax; notaireEl.value = pr.notaire; }
    const badgeEl = document.getElementById('b-notaire-badge');
    if (badgeEl) badgeEl.textContent = pr.notaireBadge;
    const travauxEl = document.getElementById('b-travaux-section');
    if (travauxEl) travauxEl.style.display = pr.travaux ? 'block' : 'none';
  }
  document.getElementById('scenario-b-overlay').classList.add('open');
  onInput();
}

function closeScenarioBPanel(event) {
  if (event && event.target.id !== 'scenario-b-overlay') return;
  document.getElementById('scenario-b-overlay').classList.remove('open');
}

function removeScenarioB() {
  scenarioBActif = false;
  document.getElementById('scenario-b-overlay').classList.remove('open');
  onInput();
}
```

(`openScenarioBPanel` is `toggleScenarioB`'s old "turning on" branch, restructured to be
idempotent — reopening an already-active B just shows the panel without re-copying A's values, so
the user's B edits aren't lost. `closeScenarioBPanel` mirrors `closeProjetsPanel`'s
click-outside-to-close pattern. `removeScenarioB` is the old "turning off" branch, minus the chart
`.destroy()` calls — those are no longer needed because, after Task 13, the charts never render
scénario-B datasets in the first place.)

- [ ] **Step 3: Verify** (logic only — the comparison strip itself lands in Task 13, so `onInput`
will currently still try to render the old `.comparison-grid` markup)

Reload, click "+ Comparer un scénario B" — the overlay panel should slide in from the right,
pre-filled with scénario A's current values. Edit a field (e.g. change B's "Taux"). Close the panel
(✕ button or click outside). Reopen it — your edit to B should still be there (idempotent re-open).
Click "✕ Retirer le scénario B" — panel closes and B is deactivated.

- [ ] **Step 4: Commit**

```bash
git add credit/ui.js
git commit -m "$(cat <<'EOF'
feat: ouvrir/fermer le panneau scénario B à la demande (overlay)

Remplace toggleScenarioB par openScenarioBPanel/closeScenarioBPanel/removeScenarioB ;
réutilise la logique de pré-remplissage existante, la rend idempotente.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 13: Build the compact KPI comparison strip, simplify charts to single-scenario

**Files:**
- Modify: `index.html` (markup: add `#comparison-strip` container, remove old
  `.comparison-grid`-producing code path)
- Modify: `styles.css`
- Modify: `credit/ui.js` (`onInput`, `renderKPIs`/`_kpiHTML` usage, `renderGraphiquePrincipal`)

- [ ] **Step 1: Add the comparison-strip container to the markup**

In `index.html`, find `<div id="kpis" class="kpis"></div>` (inside `<main class="content">`) and add
a sibling right after it:

```html
      <div id="kpis" class="kpis"></div>
      <div id="comparison-strip" class="comparison-strip" style="display:none"></div>
```

- [ ] **Step 2: Add comparison-strip styles to `styles.css`**

```css
/* ---- COMPARAISON COMPACTE A/B ---- */
.comparison-strip {
  background: var(--paper); border-radius: 4px; padding: 16px 20px;
  box-shadow: 0 10px 30px rgba(10,17,32,.3);
}
.comparison-strip-header {
  display: grid; grid-template-columns: 1.4fr 1fr 0.8fr 1fr; gap: 10px;
  padding-bottom: 8px; margin-bottom: 6px; border-bottom: 1px solid var(--paper-line);
}
.comparison-strip-header .scenario-label { margin-bottom: 0; text-align: right; }
.comparison-strip-header .scenario-label:first-child { text-align: left; visibility: hidden; }
.comparison-row {
  display: grid; grid-template-columns: 1.4fr 1fr 0.8fr 1fr; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--paper-line);
  font-family: var(--font-mono); font-size: 13px; color: var(--ink-text);
}
.comparison-row:last-child { border-bottom: none; }
.comparison-label { color: var(--ink-muted); font-size: 11px; text-transform: uppercase; letter-spacing: .07em; }
.comparison-value { font-weight: 600; text-align: right; }
.comparison-value--a { color: var(--blueprint-soft); }
.comparison-value--b { color: var(--rust); }
.comparison-delta { text-align: center; font-size: 12px; }
.comparison-delta--good { color: var(--sage); }
.comparison-delta--bad { color: var(--brick); }
```

- [ ] **Step 3: Remove the now-unused `.comparison-grid` / `.recap-row` scenario-comparison rule**

These were sized for two full side-by-side `.kpis` blocks; the new layout uses `.comparison-strip`
instead. Search for `.comparison-grid {` in `styles.css` and delete that rule (the `.recap-row` rule
right above it stays — it's still used by the "Récapitulatif des frais"/"Plan de financement" cards).

- [ ] **Step 4: Add `fmtDelta` and `renderComparisonStrip` to `credit/ui.js`**

Add these near `_kpiHTML` (they depend on `fmt`/`fmtPct` from `shared/calc-utils.js`):

```js
function fmtDelta(delta, fmtFn) {
  if (delta === 0) return '=';
  return (delta > 0 ? '+' : '−') + fmtFn(Math.abs(delta));
}

function renderComparisonStrip(resA, resB) {
  const rows = [
    { label: 'Mensualité',              a: resA.mensualite,          b: resB.mensualite,          fmt },
    { label: 'Coût total opération',    a: resA.coutTotalOperation,  b: resB.coutTotalOperation,  fmt },
    { label: 'Plus-value nette',        a: resA.plusValueNette,      b: resB.plusValueNette,      fmt },
    { label: 'TAEG',                    a: resA.taeg,                b: resB.taeg,                fmt: fmtPct },
    { label: 'Mois de rentabilité',     a: resA.moisRentabilite,     b: resB.moisRentabilite,     fmt: n => n ? `Mois ${n}` : '—', noDelta: true }
  ];
  const body = rows.map(r => {
    let deltaTxt = '', deltaClass = '';
    if (!r.noDelta) {
      const delta = r.b - r.a;
      deltaTxt = fmtDelta(delta, r.fmt);
      deltaClass = delta === 0 ? '' : (delta <= 0 ? 'comparison-delta--good' : 'comparison-delta--bad');
    }
    return `<div class="comparison-row">
      <span class="comparison-label">${r.label}</span>
      <span class="comparison-value comparison-value--a">${r.fmt(r.a)}</span>
      <span class="comparison-delta ${deltaClass}">${deltaTxt}</span>
      <span class="comparison-value comparison-value--b">${r.fmt(r.b)}</span>
    </div>`;
  }).join('');
  document.getElementById('comparison-strip').innerHTML = `
    <div class="comparison-strip-header">
      <span class="scenario-label">·</span>
      <span class="scenario-label scenario-a-label">Scénario A</span>
      <span class="scenario-label">Δ</span>
      <span class="scenario-label scenario-b-label">Scénario B</span>
    </div>
    ${body}`;
}
```

> Note on the "good/bad" delta coloring: for every row here (mensualité, coût total, TAEG — lower is
> better; plus-value nette — higher is better framed as "B costs/gains less/more than A" isn't
> uniformly signed). To keep this simple and avoid encoding judgment calls about what's "better"
> per metric (which the spec doesn't define), `comparison-delta--good`/`--bad` simply reflects
> "B is lower than A" (`delta <= 0` → sage/green) vs "B is higter than A" (→ brick/red) — a neutral
> magnitude indicator, not a verdict. This matches the spec's ask for "écarts (deltas)" without
> overreaching into financial-advice territory.

- [ ] **Step 5: Rewrite `onInput` to drive the strip instead of the old comparison grid**

Find `onInput` in `credit/ui.js` and replace its body:

```js
function onInput() {
  const pA = lireParams('a');
  if (pA.capital <= 0 || pA.duree < 1) return;
  const resA = calcSimulation(pA);
  if (!resA) return;

  updateCapitalDisplay('a', pA);
  refreshTrancheDerivedValues('a');
  renderKPIs(resA);

  const stripEl = document.getElementById('comparison-strip');
  if (scenarioBActif) {
    const pB = lireParams('b');
    if (pB.capital > 0 && pB.duree >= 1) {
      const resB = calcSimulation(pB);
      if (resB) {
        updateCapitalDisplay('b', pB);
        refreshTrancheDerivedValues('b');
        renderComparisonStrip(resA, resB);
        stripEl.style.display = '';
      }
    }
  } else {
    stripEl.style.display = 'none';
    stripEl.innerHTML = '';
  }

  renderGraphiquePrincipal(resA);
  renderGraphiqueSecondaire(resA);
  renderDonut(resA);
  renderRecapFrais(pA);
  renderRecapFinancement(pA, resA);
  renderTableau(resA.amortissement, pA.duree);
}
```

- [ ] **Step 6: Simplify `renderGraphiquePrincipal` to drop the dual-scenario branches**

It's now always called with a single argument. Find `function renderGraphiquePrincipal(res, resB) {`
and:
1. Change the signature to `function renderGraphiquePrincipal(res) {`.
2. Remove the `' — A'` / `' — B'` label suffixes (they only made sense when both scenarios were
   plotted) — change `'Gain net' + (resB ? ' — A' : '')` to `'Gain net'`, and similarly for
   `'Capital restant dû' + (resB ? ' — A' : '')` and `'Valeur du bien' + (resB ? ' — A' : '')`.
3. Delete both `if (resB) { datasets.push(...) }` blocks entirely (one in the `gain` branch pushing
   "Gain net — B", one in the `capital` branch pushing "Capital restant dû — B" and
   "Valeur du bien — B").

The function should end up with `datasets` arrays that only ever contain the scenario-A series.

- [ ] **Step 7: Verify**

Reload. With scenario B inactive: only the regular KPI cards show, `#comparison-strip` stays
hidden, charts show single-scenario data with plain titles ("Gain net", no " — A" suffix). Open the
B panel, adjust a value (e.g. raise B's taux), close it — the comparison strip appears above the
KPIs showing rows "Mensualité / Coût total opération / Plus-value nette / TAEG / Mois de
rentabilité", each with A's value, a delta (colored sage if B ≤ A, brick if B > A), and B's value.
Change an A input — both the KPI cards and the strip's "A" column update live; change a B input via
the panel — the strip's "B" column and deltas update live too. Remove scenario B — strip
disappears, charts remain single-scenario. No console errors, no leftover references to
`_kpiHTML(resB, ...)` or `.comparison-grid`.

- [ ] **Step 8: Commit**

```bash
git add index.html styles.css credit/ui.js
git commit -m "$(cat <<'EOF'
feat: bandeau de comparaison KPI compact A/B, graphiques recentrés sur A

Remplace le double dashboard (deux jeux de KPIs+graphiques complets) par
un bandeau compact d'écarts ; les graphiques détaillés ne tracent plus
que le scénario A.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase F — Persistance : champ `mode`

### Task 14: Tag saved projects with their mode, default missing ones to `'credit'`

**Files:**
- Modify: `shared/persistence.js` (`sauvegarderProjet`, `mettreAJourProjet`, `chargerProjets`)

- [ ] **Step 1: Add `mode: 'credit'` when creating/updating a project**

In `shared/persistence.js`, find `sauvegarderProjet` and add a `mode: 'credit'` field to the
`projet` object literal it builds (alongside `id`, `nom`, `urlAnnonce`, etc.):

```js
  const projet = {
    id: genId(),
    nom,
    urlAnnonce,
    typeProjet: params.typeProjet,
    mode: 'credit',
    date: new Date().toLocaleDateString('fr-FR'),
    mensualite: res ? res.mensualite : 0,
    params
  };
```

In `mettreAJourProjet`, add `mode: projets[idx].mode || 'credit'` to the spread-replacement object
(so existing entries get tagged on first update, and the field survives subsequent updates):

```js
  projets[idx] = {
    ...projet,
    nom: nomSaisi || projet.nom,
    urlAnnonce: urlSaisie || projet.urlAnnonce,
    typeProjet: params.typeProjet,
    mode: projet.mode || 'credit',
    date: new Date().toLocaleDateString('fr-FR'),
    mensualite: res ? res.mensualite : 0,
    params
  };
```

- [ ] **Step 2: Default missing `mode` on read**

Find `chargerProjets` and normalize entries as they're loaded, so every consumer (the list renderer,
`chargerProjet`, future locatif code) sees a `mode` field even for projects saved before this change:

```js
function chargerProjets() {
  try {
    const projets = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return projets.map(p => ({ mode: 'credit', ...p }));
  }
  catch { return []; }
}
```

(`{ mode: 'credit', ...p }` lets `p.mode` win when present, and only supplies the default when
`p.mode` is `undefined` — exactly the backward-compat behavior the spec calls for.)

- [ ] **Step 3: Verify backward compatibility**

Open devtools → Application → Local Storage → `simulateur_projets`. If you have existing saved
projects from before this change, confirm they load and display normally (no `mode` in their stored
JSON, but the app treats them as `'credit'`). Save a brand-new project — inspect its stored JSON,
confirm it now includes `"mode": "credit"`. Update an old project (without `mode`) via "Mettre à
jour" — confirm its stored JSON now includes `"mode": "credit"` too. Export to JSON and check the
exported file contains the `mode` field for new/updated entries.

If you have no pre-existing saved projects to test the backward-compat path with, create one
manually: open devtools console and run
`localStorage.setItem('simulateur_projets', JSON.stringify([{id:'test1', nom:'Test sans mode', typeProjet:'ancien', date:'01/01/2026', mensualite:1000, params: {/* any valid params object, e.g. copy one from an existing save */}}]))`,
reload, open "Projets sauvegardés", and confirm "Test sans mode" appears and loads correctly despite
having no `mode` field in storage.

- [ ] **Step 4: Commit**

```bash
git add shared/persistence.js
git commit -m "$(cat <<'EOF'
feat: marquer les projets sauvegardés avec leur mode (credit/locatif)

Les entrées existantes sans champ `mode` sont traitées comme 'credit' —
rétrocompatible, sans migration de données.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase G — Final regression pass

### Task 15: Full manual verification against the spec's non-regression checklist

**Files:** none (verification only)

- [ ] **Step 1: Run the complete checklist from the spec's "Stratégie de non-régression" section**

Using the `run`/`verify` skill, restart the server fresh and walk through, on the **scénario crédit
existant**:
- Every input field in the params section (all 6 groups: Type de projet, Emprunts incl.
  add/remove/edit tranches and PTZ, Frais, Travaux, Différé, Valorisation) — confirm live
  recalculation.
- All three charts (Gain net/Capital vs Valeur toggle, Barres/Aires toggle, donut) — confirm
  correct rendering and mode-toggle behavior.
- Both recap tables (frais, financement) and the amortissement table (mois/année toggle).
- The complete saved-projects flow: save, update, load, delete, export, import — including a
  project saved before this branch existed, if you have one (or simulate one as in Task 14 Step 3).
- The new collapsible params section: collapse, expand, reload-persistence.
- The new scénario-B overlay: open (pre-fill from A), edit, close, reopen (idempotent), compare
  strip values/deltas update live, remove.
- The mode switcher: "Crédit immobilier" active, "Investissement locatif" disabled with "bientôt"
  badge.
- Resize below 980px — responsive layout still stacks sensibly.

- [ ] **Step 2: Compare against your "Before you start" notes**

The default-input KPI values, chart shapes, and amortization table rows you noted before Phase B
must still match exactly — the calculation engine never changed, only its file location and the UI
around it.

- [ ] **Step 3: If everything checks out, hand off**

Use the `finishing-a-development-branch` skill to decide how to integrate `refonte-ui-architecture`
(merge to `master`, open a PR, etc.) — this task has no commit of its own; it's the final
confirmation gate before integration.

---

## Notes for the next iteration

Once this branch is integrated, the "Investissement locatif" spec can: remove the `disabled`
attribute from the locatif `.mode-btn`, extend `switchMode` to actually swap `#app-credit` for a new
`#app-locatif` container, and create `locatif/engine.js` + `locatif/ui.js` mirroring the
`credit/engine.js` + `credit/ui.js` shape established here. If a generic "collapsible params
section" or "thematic card grid" helper turns out to be needed by both modes at that point, that's
the moment to factor it into `shared/ui-components.js` (named in the spec) — not before, per YAGNI.
