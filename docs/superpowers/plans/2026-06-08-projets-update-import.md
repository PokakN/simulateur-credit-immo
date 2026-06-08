# Projets : mise à jour, import clarifié, suppression du partage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Mettre à jour" action for saved projects, fix the confusing "0 projet(s) importé(s)" import message, and remove the URL-sharing feature entirely.

**Architecture:** All changes live in `index.html` (single-file static app, no build step). New behavior follows the existing patterns in the "SAUVEGARDE" script section (`sauvegarderProjet`, `chargerProjets`/`sauvegarderProjets`, `renderProjetsList`, `showToast`). No new files, no new storage format.

**Tech Stack:** Vanilla JS, `localStorage` (`STORAGE_KEY = 'simulateur_projets'`), no test harness — verified manually in the browser per `CLAUDE.md` (`npx serve -l 5500 .` then exercise the UI, per the `verify`/`run` skill).

---

## Spec reference

Implements `docs/superpowers/specs/2026-06-08-projets-update-import-design.md` sections 1–3.

## Before you start

Serve the app so you can reload and click through it after each task:

```bash
npx serve -l 5500 .
```

Open `http://localhost:5500` in a browser. Open the project's "Mes projets" panel (the button that calls `openProjetsPanel()`) so you can see the saved-project cards while you work — you'll need at least one saved project. If you don't have one yet, fill in some sidebar values, type a name in "Nom du projet", and click "Sauvegarder le projet actuel" to create one before starting Task 1.

---

### Task 1: Add "Mettre à jour" button and `mettreAJourProjet()`

**Files:**
- Modify: `index.html:1762-1787` (insert new function after `sauvegarderProjet`)
- Modify: `index.html:1884-1888` (card action buttons in `renderProjetsList`)

- [ ] **Step 1: Add the "Mettre à jour" button to the project card template**

In `renderProjetsList` (around `index.html:1884-1888`), the actions row currently reads:

```html
      <div class="projet-card-actions">
        <button onclick="chargerProjet('${p.id}')">Charger</button>
        <button onclick="partagerProjet('${p.id}')">Partager</button>
        <button onclick="supprimerProjet('${p.id}')" style="color:var(--brick);border-color:var(--brick)">Suppr.</button>
      </div>
```

Insert a new button between "Charger" and "Partager":

```html
      <div class="projet-card-actions">
        <button onclick="chargerProjet('${p.id}')">Charger</button>
        <button onclick="mettreAJourProjet('${p.id}')">Mettre à jour</button>
        <button onclick="partagerProjet('${p.id}')">Partager</button>
        <button onclick="supprimerProjet('${p.id}')" style="color:var(--brick);border-color:var(--brick)">Suppr.</button>
      </div>
```

(The "Partager" button is removed later, in Task 3 — leave it in place for now so the file stays runnable between tasks.)

- [ ] **Step 2: Write `mettreAJourProjet(id)`**

Insert this new function immediately after `sauvegarderProjet` ends (after the closing `}` at `index.html:1787`, before `function chargerProjet(id) {`):

```javascript
function mettreAJourProjet(id) {
  const projets = chargerProjets();
  const idx = projets.findIndex(p => p.id === id);
  if (idx === -1) return;

  const nomSaisi = document.getElementById('projet-nom')?.value?.trim();
  const urlSaisie = document.getElementById('projet-url')?.value?.trim();
  const params = lireParams('a');
  const res = calcSimulation(params);
  const projet = projets[idx];

  projets[idx] = {
    ...projet,
    nom: nomSaisi || projet.nom,
    urlAnnonce: urlSaisie || projet.urlAnnonce,
    typeProjet: params.typeProjet,
    date: new Date().toLocaleDateString('fr-FR'),
    mensualite: res ? res.mensualite : 0,
    params
  };

  sauvegarderProjets(projets);
  renderProjetsList();
  document.getElementById('projet-nom').value = '';
  document.getElementById('projet-url').value = '';
  showToast(`Projet "${projets[idx].nom}" mis à jour`);
}
```

This mirrors `sauvegarderProjet` (same `lireParams`/`calcSimulation`/toast pattern) but overwrites the existing entry in place via `findIndex` instead of `unshift`-ing a new one, and only replaces `nom`/`urlAnnonce` when the save-panel fields are non-empty.

- [ ] **Step 3: Verify in the browser**

Reload `http://localhost:5500`. Open "Mes projets" — your saved card should now show three buttons: "Charger", "Mettre à jour", "Partager" (still there for now), "Suppr." (four total, that's fine).

Run through these checks:
1. **Update params only:** Change a sidebar value (e.g. "Prix du projet"), leave the "Nom du projet"/"URL de l'annonce" fields in the save panel empty, click "Mettre à jour" on your existing card. Expect: toast `Projet "<nom existant>" mis à jour`, the card's monthly-payment KPI and date update, the card's name and URL stay the same, and no new card is created.
2. **Update + rename:** Type a new name (and optionally a URL) into the save-panel fields, click "Mettre à jour" again on the same card. Expect: the card's name/URL change to the typed values, fields clear afterwards, still only one card (no duplicate).
3. **Persistence:** Reload the page, reopen "Mes projets" — the updated values should still be there (confirms `sauvegarderProjets` persisted correctly).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: ajouter la mise à jour d'un projet sauvegardé"
```

---

### Task 2: Clarify the import toast message

**Files:**
- Modify: `index.html:1846-1866` (`importerProjets`)

- [ ] **Step 1: Update the toast logic in `importerProjets`**

The function currently reads:

```javascript
function importerProjets(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Format invalide');
      const existing = chargerProjets();
      const existingIds = new Set(existing.map(p => p.id));
      const newOnes = imported.filter(p => !existingIds.has(p.id));
      sauvegarderProjets([...existing, ...newOnes]);
      renderProjetsList();
      showToast(`${newOnes.length} projet(s) importé(s)`);
    } catch {
      showToast('Erreur : fichier JSON invalide');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
```

Replace the body of the `try` block (everything from `const imported = ...` through the `showToast` call) with:

```javascript
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Format invalide');
      const existing = chargerProjets();
      const existingIds = new Set(existing.map(p => p.id));
      const newOnes = imported.filter(p => !existingIds.has(p.id));
      const ignores = imported.length - newOnes.length;
      sauvegarderProjets([...existing, ...newOnes]);
      renderProjetsList();
      if (newOnes.length === 0 && ignores > 0) {
        showToast(`Aucun nouveau projet : ${ignores} déjà présent(s)`);
      } else if (ignores > 0) {
        showToast(`${newOnes.length} projet(s) importé(s), ${ignores} déjà présent(s) (ignorés)`);
      } else {
        showToast(`${newOnes.length} projet(s) importé(s)`);
      }
```

The duplicate-skipping behavior itself is unchanged (still never overwrites local data on import) — only the reported message changes, so the user understands *why* a count might be lower than expected.

- [ ] **Step 2: Verify in the browser**

Reload, open "Mes projets":
1. **Re-import your own export (the bug as reported):** Click "Exporter JSON" to download `projets-immo.json`, then immediately click "Importer JSON" and pick that same file. Expect toast: `Aucun nouveau projet : N déjà présent(s)` (where N = your saved count) — no more silent/confusing "0 projet(s) importé(s)".
2. **Mixed import:** Open the exported JSON file in a text editor, change one project's `"id"` field to a new unique string (e.g. append `-test`), save, and import that edited file. Expect toast: `1 projet(s) importé(s), N déjà présent(s) (ignorés)`, and the list now shows one extra card.
3. **Fresh import (no collisions):** Use "Suppr." to delete all saved projects, then import the original exported file. Expect toast: `N projet(s) importé(s)` (no "ignorés" clause), and all projects reappear.
4. **Invalid file:** Try importing a non-JSON file (e.g. rename any `.txt` to `.json` with random text inside). Expect toast: `Erreur : fichier JSON invalide` (unchanged from before).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: message d'import plus clair en cas de doublons d'ID"
```

---

### Task 3: Remove the URL-sharing feature entirely

**Files:**
- Modify: `index.html:1884-1888` (remove "Partager" button — Task 1 left it in place)
- Modify: `index.html:1908-1970` (remove `genererStateURL`, `partagerProjet`, `restaurerDepuisURL` and the "URL PARTAGEABLE" section)
- Modify: `index.html:1974` (remove the `restaurerDepuisURL();` init call)
- Modify: `index.html:1975` (update now-stale comment)

- [ ] **Step 1: Remove the "Partager" button from the card template**

In `renderProjetsList` (the block you edited in Task 1), remove the "Partager" button line so the actions row reads:

```html
      <div class="projet-card-actions">
        <button onclick="chargerProjet('${p.id}')">Charger</button>
        <button onclick="mettreAJourProjet('${p.id}')">Mettre à jour</button>
        <button onclick="supprimerProjet('${p.id}')" style="color:var(--brick);border-color:var(--brick)">Suppr.</button>
      </div>
```

(i.e. delete the line `<button onclick="partagerProjet('${p.id}')">Partager</button>`).

- [ ] **Step 2: Delete the entire "URL PARTAGEABLE" section**

Locate the block starting at the `// ==================== URL PARTAGEABLE ====================` comment (`index.html:1909`) and ending at the closing `}` of `restaurerDepuisURL` (`index.html:1969`), including the blank line that follows it before `// Init`. Delete this whole block — `genererStateURL`, `partagerProjet`, and `restaurerDepuisURL` in their entirety:

```javascript
// ==================== URL PARTAGEABLE ====================

function genererStateURL(params) {
  const state = btoa(unescape(encodeURIComponent(JSON.stringify(params))));
  const url = new URL(window.location.href);
  url.searchParams.set('state', state);
  return url.toString();
}

function partagerProjet(id) {
  const projets = chargerProjets();
  const projet = projets.find(p => p.id === id);
  if (!projet) return;
  const url = genererStateURL(projet.params);
  navigator.clipboard.writeText(url).then(() => {
    showToast('URL copiée dans le presse-papier !');
  }).catch(() => {
    prompt('Copiez cette URL :', url);
  });
}

function restaurerDepuisURL() {
  const params = new URLSearchParams(window.location.search);
  const state = params.get('state');
  if (!state) return;
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(state))));
    if (!p || typeof p !== 'object') return;

    const set = (suffix, val) => {
      const el = document.getElementById(`a-${suffix}`);
      if (el !== null && val !== undefined) el.value = val;
    };

    set('type-projet',    p.typeProjet  || 'ancien');
    set('prix-projet',    p.prixProjet);
    set('apport',         p.apport);
    set('assurance',      p.tauxAssurance);
    set('notaire',        p.fraisNotairePct);
    set('dossier',        p.fraisDossier);
    set('garantie-pct',   p.tauxGarantie ?? 1.5);
    set('differe-mois',   p.differeMois);
    set('travaux-total',  p.travaux);
    set('apprec',         p.tauxApprec);

    const dtEl = document.getElementById('a-differe-type');
    if (dtEl) dtEl.value = p.differeType || 'partiel';

    if (p.tranches && Array.isArray(p.tranches) && p.tranches.length > 0) {
      setTranches('a', JSON.parse(JSON.stringify(p.tranches)));
    } else {
      const fallback = [{ id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false, taux: p.tauxNominal ?? 3.40, duree: p.duree ?? 20 }];
      if ((p.ptzMontant || 0) > 0) fallback.push({ id: 'ptz', label: 'PTZ', isPrincipal: false, isPTZ: true, taux: 0, duree: p.ptzDuree ?? 10, montant: p.ptzMontant });
      setTranches('a', fallback);
    }

    showToast('Projet chargé depuis le lien partagé');
  } catch {
    console.warn('State URL invalide');
  }
}
```

After deletion, `index.html:1907-1908` (the closing `}` of `showToast` and the blank line after it) should be followed directly by the `// Init` comment block — i.e. exactly one blank line between `showToast`'s closing brace and `// Init`.

- [ ] **Step 3: Remove the `restaurerDepuisURL();` init call and fix the stale comment**

The init block currently reads:

```javascript
  // Init
  const mastheadDateEl = document.getElementById('masthead-date');
  if (mastheadDateEl) mastheadDateEl.textContent = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  restaurerDepuisURL();
  // If URL state didn't set tranches, start with defaults for Ancien
  if (tranchesA.length === 0) {
    setTranches('a', [{ id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false, taux: 3.40, duree: 20 }]);
  }
  onTypeChange('a');
```

Remove the `restaurerDepuisURL();` line and rewrite the now-misleading comment (it referenced "URL state", which no longer exists) so the block reads:

```javascript
  // Init
  const mastheadDateEl = document.getElementById('masthead-date');
  if (mastheadDateEl) mastheadDateEl.textContent = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  // Start with default tranches for Ancien
  if (tranchesA.length === 0) {
    setTranches('a', [{ id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false, taux: 3.40, duree: 20 }]);
  }
  onTypeChange('a');
```

- [ ] **Step 4: Verify in the browser**

Reload `http://localhost:5500` and open the browser console (no errors should appear on load — this catches any leftover reference to the removed functions).

1. **No share button:** Open "Mes projets" — each card shows exactly three buttons: "Charger", "Mettre à jour", "Suppr." (no "Partager").
2. **Console is clean:** Click around the app (load a project, switch project type, open/close the panel) — no `ReferenceError: partagerProjet is not defined` or similar in the console.
3. **`?state=` link is now inert:** Manually visit `http://localhost:5500/?state=anything` — the page should load normally with default values (Ancien defaults), with no "Projet chargé depuis le lien partagé" toast and no console error about `restaurerDepuisURL`.
4. **Save/load/update/delete/export/import still work:** Quickly re-run the Task 1 and Task 2 checks (save a project, update it, delete it, export, import) to confirm nothing broke during the removal.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "refactor: retirer la fonctionnalité de partage par URL"
```

---

## Done

At this point:
- Saved project cards offer Charger / Mettre à jour / Suppr.
- Import reports clearly how many projects were imported vs. skipped as duplicates.
- The `?state=` sharing mechanism (button, generation, restoration) is fully removed.

Use `superpowers:finishing-a-development-branch` if you want help deciding how to merge/PR this work once all three tasks are committed.
