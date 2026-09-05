---
name: ui-composants
description: >-
  Design system ecole-manager (toasts violet, CustomSelect, LoadingUI,
  onglets chip-tabs, toggles, boutons Trier, menus). Chargement = shell
  (menu + chrome) → spinner zone données → données. Utiliser pour UI
  frontend, toasts, listes déroulantes, onglets, boutons, LoadingButton, PageLoader.
---

# UI composants — ecole-manager

Toujours lire ce skill avant d’ajouter / modifier un toast, une liste déroulante,
un onglet, un toggle, un bouton Trier, un loader ou un bouton de sauvegarde.

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

```js
// Composant : frontend/src/components/Toast.js
import Toast, { toastStyle, toastStyleFixed, TOAST } from '../components/Toast';

// Inline (à côté d’un bouton)
{toast.message && <Toast message={toast.message} />}

// Ou styles manuels (équivalent)
{toast.message && (
  <span style={{ fontSize:13, fontWeight:600, padding:'6px 14px', borderRadius:8, background:'#ede9fe', color:'#4c1d95' }}>
    {toast.message}
  </span>
)}

// Toast fixe (coin écran) → toastStyleFixed / fixed prop
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

### Pattern shell → spinner → données (partout)

À chaque navigation / onglet / sous-vue (liste, détail classe, tableau, etc.) :

1. **Afficher tout de suite le shell** : menu latéral Layout (toujours monté), titre, boutons, filtres, en-têtes de tableau / structure de la page.
2. **Spinner uniquement dans la zone de données** (corps du tableau, liste, grille) — jamais remplacer toute la page ni le menu.
3. **Quand le fetch est fini** : afficher les lignes / cartes. Empty state (« Aucun… ») **uniquement** si `!loading && length === 0`.

```jsx
{/* ✅ BON — chrome toujours visible */}
<div style={stickyPageChrome()}>
  <h2>…</h2>
  {/* boutons, filtres, onglets */}
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

Même logique pour un **détail** (ex. classe CSC 2 → liste élèves) : garder en-tête / onglets de la classe, spinner dans le tableau élèves (`loadingEleves`), pas « Aucun élève » avant la fin du fetch.

### Layout / navigation

- Le **menu latéral** vit dans `Layout.js` et doit rester monté pendant les changements de page.
- `MfaGate` wrappe **seulement** le contenu (`KeepAliveOutlet`), pas tout le Layout.
- Keep-alive : clé = **pathname** (pas la query) — voir `KeepAliveOutlet.js`.
- Ne pas remonter `PageLoader` plein écran dans une page métier (réservé login / 1er check session hors Layout).

### Bouton sauvegarde

```js
<LoadingButton
  type="submit"
  loading={saving}
  loadingLabel="En cours de sauvegarde…"
  style={styles.btnSauver}
>
  Sauvegarder
</LoadingButton>
```

- `setSaving(true)` **après** validations ; `finally { setSaving(false) }`
- Animation CSS : `@keyframes em-spin` dans `frontend/src/index.css`

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
- ❌ `<select>` natif pour l’UI principale (utiliser `CustomSelect`)
- ❌ Onglets pastilles sans fond `#ede9fe` / actif hors `#6366f1`
- ❌ Texte « Chargement… » sans `PageLoader`
- ❌ Bouton Sauvegarder sans `loading` / disable pendant l’appel API
- ❌ `if (loading) return <PageLoader />` / remplacer toute la page (menu ou chrome disparu)
- ❌ Message « Aucun… » pendant le fetch — toujours `!loading && length===0`
- ❌ Spinner plein écran dans une page sous Layout (sauf login / gate auth hors shell)
- ❌ Inventer une nouvelle palette hors violet thème

## Empty vs chargement (dans la zone données)

```js
const [loading, setLoading] = useState(() => !peekCachedGet('/ressource'));
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
| `components/MobilePageEnhancer.js` | chip-tabs mobile, scroll tableaux |
| `styles/theme.js` | Tokens couleurs |
| `styles/pageShell.js` | stickyPageChrome |
| `index.css` | `em-spin`, tableaux, modals |
