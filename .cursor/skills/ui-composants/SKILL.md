---
name: ui-composants
description: >-
  Design system ecole-manager (toasts violet inline à gauche des boutons,
  CustomSelect, LoadingUI, onglets chip-tabs, toggles, boutons Trier, menus).
  Chargement = shell → spinner zone données → données. Utiliser pour UI
  frontend, nouvelles pages, toasts, listes, onglets, LoadingButton, PageLoader.
---

# UI composants — ecole-manager

Toujours lire ce skill avant d’ajouter / modifier une **page**, un toast, une
liste déroulante, un onglet, un toggle, un bouton Trier, un loader ou un bouton
de sauvegarde.

## Palette thème (violet)

| Token | Hex | Usage |
|-------|-----|--------|
| Primary | `#6366f1` | Boutons, onglet actif, en-têtes tableau |
| Soft | `#ede9fe` | Fond toast, fond chip-tabs / toggle group |
| Texte toast | `#4c1d95` | Texte toast / messages feedback |
| Muted | `#6d28d9` | Texte onglet inactif dans chip-tabs |
| Border soft | `#c7d2fe` | Bordure toast fixe |
| Page bg | `#f8fafc` | Fond pages |

Fichier tokens : `frontend/src/styles/theme.js` (`colors.primary`, `toastBg`, …).

## Toasts (toujours violet)

**Règle** : tous les toasts (succès, info, erreur) utilisent le même style violet.
Ne pas utiliser vert (`#dcfce7`) ni rouge pour les toasts de feedback.

### Placement (OBLIGATOIRE)

Le toast s’affiche **inline, à gauche des boutons d’action** (Sauvegarder, Imprimer, + Ajouter, etc.) dans la barre d’actions / header — **jamais** en `position: fixed` par-dessus les boutons.

```jsx
{/* ✅ BON — même rangée flex, toast puis boutons */}
<div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
  {toast.message && <Toast message={toast.message} />}
  <LoadingButton loading={saving} …>Sauvegarder</LoadingButton>
</div>

{/* ❌ INTERDIT */}
{toast.message && <div style={{ position: 'fixed', top: 20, right: 20, … }}>…</div>}  // chevauche les boutons
<Toast fixed />  // déprécié
```

```js
// Composant : frontend/src/components/Toast.js
import Toast from '../components/Toast';

{toast.message && <Toast message={toast.message} />}
```

Pattern state local courant :

```js
const [toast, setToast] = useState({ message: '', type: 'success' });
const showToast = (message, type = 'success') => {
  setToast({ message, type });
  setTimeout(() => setToast({ message: '', type: 'success' }), 2200);
};
// Le `type` peut rester pour la logique ; le style reste violet.
```

- Toujours le composant `Toast` (pas de `<span>` / `<div>` manuels `#ede9fe`).
- `toastStyleFixed` / `fixed` : **dépréciés** — ne plus utiliser pour le feedback page.
## Listes déroulantes — CustomSelect

**Toujours** `CustomSelect` (pas de `<select>` natif pour les filtres/formulaires UI).

```js
import CustomSelect from '../components/CustomSelect';

<CustomSelect
  value={valeur}
  onChange={(v) => setValeur(v)}
  options={[{ value: 'a', label: 'Label A' }, …]}
  placeholder="Choisir…"
  allowClear
  searchable
  style={{ minWidth: 160 }}
/>
```

Fichier : `frontend/src/components/CustomSelect.js` (violet `#6366f1` / `#ede9fe`).

## Chargement — LoadingUI (OBLIGATOIRE)

```js
import { PageLoader, LoadingButton, LoadingSpinner } from '../components/LoadingUI';
```

### Principe (toute page, y compris nouvelle)

L’utilisateur ne doit **jamais** se demander si ça charge. Règle unique :

1. **Shell immédiat** : menu Layout + titre + boutons + filtres / sélecteurs + en-têtes de tableau restent visibles tout de suite.
2. **Spinner dans la zone de données seulement** (`PageLoader compact`) pendant le fetch.
3. **Données ou empty state** : « Aucun… » **uniquement** si `!loading && length === 0`.
4. **Chargements secondaires** : dès qu’un choix (CustomSelect, clic œil, onglet, semestre…) déclenche un nouvel appel API, un état `loadingXxx` + spinner dans la zone concernée — **pas** laisser l’ancien contenu figé ni le message « Sélectionnez… » pendant le fetch.

Références : `EmploiDuTemps` (`planningProfLoading`, `planningClasseLoading`, `disposLoading`), `Notes` (`loadingEvals`, `loadingBulletin`, `loadingSaisie`), `Parametres` (`loadingProfil`, `loadingEcole`, …), `Classes` (`loadingElevesClasse`), `Archives` (`loadingTable`).

### Pattern shell → spinner → données

```jsx
{/* ✅ BON — chrome toujours visible */}
<div style={stickyPageChrome()}>
  <h2>…</h2>
  {/* boutons, filtres, onglets, CustomSelect */}
</div>
<div style={tableWrap}>
  <table>
    <thead>{/* colonnes toujours visibles */}</thead>
    <tbody>
      {loading ? (
        <tr><td colSpan={n}><PageLoader compact label="Chargement…" /></td></tr>
      ) : rows.length === 0 ? (
        <tr><td colSpan={n} style={empty}>Aucun élément</td></tr>
      ) : (
        rows.map(…)
      )}
    </tbody>
  </table>
</div>

{/* ❌ INTERDIT */}
if (loading) return <PageLoader />;           // remplace toute la page
{loading ? <PageLoader /> : <PageWithChrome />} // flash blanc / shell disparu
{rows.length === 0 && <div>Aucun…</div>}       // pendant le fetch (sans !loading)
```

### Chargements secondaires (sélection / sous-vue)

Quand l’utilisateur choisit un élément pour charger un détail (prof → planning, classe → élèves, matière → évaluations, onglet paramètres, etc.) :

```js
const [selectionId, setSelectionId] = useState('');
const [detail, setDetail] = useState(null);
const [loadingDetail, setLoadingDetail] = useState(false);

const chargerDetail = async (id) => {
  if (!id) {
    setDetail(null);
    setLoadingDetail(false);
    return;
  }
  setLoadingDetail(true);
  setDetail(null); // évite d’afficher l’ancien détail d’une autre sélection
  try {
    const r = await apiClient.get('/…/' + id, { headers });
    setDetail(r.data || null);
  } catch (err) {
    setDetail(null);
    // toast erreur éventuel
  } finally {
    setLoadingDetail(false);
  }
};
```

```jsx
{!selectionId && <div style={msgVide}>Sélectionnez…</div>}
{selectionId && loadingDetail && (
  <PageLoader compact label="Chargement…" style={msgVide} />
)}
{selectionId && !loadingDetail && !detail && (
  <div style={msgVide}>Impossible de charger…</div>
)}
{selectionId && !loadingDetail && detail && (
  /* contenu */
)}
```

- Un état de loading **par zone** si plusieurs fetches indépendants (`loadingListe` vs `loadingDetail`).
- Masquer les boutons Sauvegarder de la zone pendant son load (comme Paramètres / dispos EDT).
- `setLoading(true)` en début de fetch ; `finally { setLoading(false) }` toujours.

### Checklist nouvelle page

1. Titre + chrome (`stickyPageChrome` si pertinent) rendus **avant** la fin du fetch initial.
2. `loading` initial `true` → `PageLoader` dans le corps (tableau / grille), pas `if (loading) return …`.
3. Tout `CustomSelect` / bouton qui recharge des données → son `loadingXxx` + spinner.
4. Empty state uniquement après `!loading`.
5. Actions longues → `LoadingButton`.
6. Toasts violet ; listes → `CustomSelect` ; onglets → chip-tabs violet.
7. Pas de prefetch / cache GET menu ; pas de keep-alive Outlet.
8. Réponses API listes : toujours `Array.isArray(…)` avant `.map` / `.filter`.

### Layout / navigation

- Le **menu latéral** vit dans `Layout.js` et doit rester monté pendant les changements de page.
- Contenu des routes : `<Outlet />` — **pas de keep-alive** ni de prefetch menu / cache GET (retirés : pages blanches / `filter`/`forEach` sur données non-tableau).
- `MfaGate` + `PageErrorBoundary` wrappent **seulement** le contenu, pas tout le Layout.
- Session : `sessionStorage` via `session.js` pour éviter un flash plein écran au refresh.
- Ne pas remonter `PageLoader` plein écran dans une page métier.

### Boutons longue action — LoadingButton (OBLIGATOIRE)

**Même comportement que « Se connecter »** sur la page login : spinner dans le bouton + libellé d’attente + bouton **désactivé** (pas de double-clic).

S’applique à **toute** action async :
- Sauvegarder / Enregistrer / Créer / Modifier
- Importer / Mise à jour LORA / Upload
- Exporter (Excel, PDF, LORA, ZIP…)
- Envoyer, Calculer, Transférer, etc.

```js
import { LoadingButton } from '../components/LoadingUI';

// Sauvegarde
<LoadingButton type="submit" loading={saving} loadingLabel="En cours de sauvegarde…" style={styles.btnSauver}>
  Sauvegarder
</LoadingButton>

// Import
<LoadingButton type="submit" loading={importLoading} loadingLabel="Import en cours…" style={styles.btnPrimary}>
  Importer
</LoadingButton>

// Export
<LoadingButton type="button" loading={exportLoading} loadingLabel="Export en cours…" onClick={exporter} style={styles.btnPrimary}>
  Exporter
</LoadingButton>
```

Règles :
- Toujours `LoadingButton` — **pas** de `<button>` nu avec seulement `disabled` / texte « … » / emoji ⏳
- `setXxx(true)` **après** validations ; `finally { setXxx(false) }`
- Libellés d’attente typiques : `En cours de sauvegarde…`, `Import en cours…`, `Export en cours…`, `Connexion…`
- Défaut de `loadingLabel` dans le composant : `En cours de sauvegarde…` (surcharger pour import/export)
- Animation : `@keyframes em-spin` dans `frontend/src/index.css`

```jsx
{/* ❌ INTERDIT */}
<button disabled={loading}>{loading ? '…' : 'Sauvegarder'}</button>
<button disabled={exportLoading}>{exportLoading ? 'Export...' : 'Exporter'}</button>
<label>{loading ? 'Mise à jour...' : 'Mise à jour LORA'}<input type="file" /></label> // sans spinner LoadingButton
```

Pour un import via `<input type="file">` caché : wrapper le déclencheur en `LoadingButton` (ou label stylé + état `loading` qui bloque + spinner visible à côté / sur un bouton « Importer »).

## Onglets / chip-tabs / toggle group

Pastilles violettes (groupe + bouton actif) :

```jsx
<div className="chip-tabs" style={{ display:'flex', background:'#ede9fe', borderRadius:20, padding:3, gap:2 }}>
  {onglets.map(o => {
    const actif = valeur === o.id;
    return (
      <button
        key={o.id}
        type="button"
        onClick={() => setValeur(o.id)}
        style={{
          padding:'7px 14px', borderRadius:17, border:'none',
          background: actif ? '#6366f1' : 'transparent',
          color: actif ? 'white' : '#6d28d9',
          fontWeight: actif ? 700 : 600, fontSize:13, cursor:'pointer',
          fontFamily:'inherit', whiteSpace:'nowrap',
        }}
      >
        {o.label}
      </button>
    );
  })}
</div>
```

- Classe `chip-tabs` (ou `mobile-chip-tabs`) : layout mobile via `MobilePageEnhancer`
- Onglets principaux Layout : query `?tab=` (voir `Layout.js`)
- Chrome collant : `stickyPageChrome()` / `stickyPageChromeBleed()` dans `frontend/src/styles/pageShell.js`

## Bouton Trier / filtre dropdown

Pattern courant (VisiteClasses, Sorties, Branches, Classes, TCF) :

1. Bouton « Trier » inactif (bordure grise) → ouvre le groupe pastilles
2. Groupe `background:'#ede9fe'` + pastille active `#6366f1`
3. Option « Trier » / « Tous » remet le filtre à vide et referme

```js
// Styles de référence
btnTrier: { padding:'7px 14px', borderRadius:17, border:'1.5px solid #e2e8f0', background:'white', cursor:'pointer', fontWeight:600, color:'#94a3b8', fontSize:13 },
triGroup: { display:'flex', background:'#ede9fe', borderRadius:20, padding:3, gap:2 },
triBtn: { padding:'7px 14px', borderRadius:17, border:'none', background:'transparent', cursor:'pointer', fontWeight:600, color:'#6d28d9', fontSize:13 },
triBtnActif: { background:'#6366f1', color:'white', fontWeight:700 },
```

TCF : helper local `FiltreDropdown` (même esprit, menu déroulant).

## Boutons primaires / actions

```js
// Primaire (sauvegarder, ajouter)
{ padding:'8px 16px', background:'#6366f1', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }

// Secondaire / annuler
{ padding:'8px 16px', background:'white', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13, color:'#64748b' }
```

Pour toute action longue : préférer `LoadingButton` plutôt qu’un `<button>` nu.

## Toggle switch (on/off)

Exemple (validé / non validé) — piste `#6366f1` quand actif, `#e2e8f0` sinon ; pastille blanche.

Ne pas confondre avec **chip-tabs** (choix exclusif multi-options).

## Anti-patterns

- ❌ Toast vert / rouge / bleu selon le type
- ❌ Toast `position: fixed` / coin écran / `Toast fixed` — se superpose aux boutons
- ❌ Toast au-dessus des boutons (wrap qui pousse le message sur une ligne couvrant les actions) — le garder **à gauche** dans le même flex
- ❌ `<span>` / `<div>` toast manuel au lieu du composant `Toast`
- ❌ `<select>` natif pour l’UI principale (utiliser `CustomSelect`)
- ❌ Onglets pastilles sans fond `#ede9fe` / actif hors `#6366f1`
- ❌ Texte « Chargement… » sans `PageLoader`
- ❌ Bouton Sauvegarder / Importer / Exporter sans `LoadingButton` (spinner + disable comme « Se connecter »)
- ❌ `if (loading) return <PageLoader />` / remplacer toute la page (menu ou chrome disparu)
- ❌ Message « Aucun… » pendant le fetch — toujours `!loading && length===0`
- ❌ Spinner plein écran dans une page sous Layout (sauf login / gate auth hors shell)
- ❌ Sélection (prof, classe, onglet…) qui fetch **sans** spinner — UI figée / doute « ça marche ? »
- ❌ Garder l’ancien détail visible pendant le load d’une autre sélection (réinitialiser ou spinner)
- ❌ Inventer une nouvelle palette hors violet thème

## Empty vs chargement (dans la zone données)

```js
const [loading, setLoading] = useState(true);
// fetch: try { … } finally { setLoading(false); }

// Shell (titre, boutons, <thead>) toujours rendu au-dessus
{loading ? (
  <PageLoader compact label="Chargement…" />
) : list.length === 0 ? (
  <div>Aucun élément…</div>
) : (
  /* lignes */
)}
```

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `components/Toast.js` | Toast violet |
| `components/CustomSelect.js` | Liste déroulante |
| `components/LoadingUI.js` | Spinner, PageLoader, LoadingButton |
| `components/PageErrorBoundary.js` | Erreur page sans blanchir le menu |
| `components/MobilePageEnhancer.js` | chip-tabs mobile, scroll tableaux |
| `styles/theme.js` | Tokens couleurs |
| `styles/pageShell.js` | stickyPageChrome |
| `index.css` | `em-spin`, tableaux, modals |
