# Polyptyque Server Modes

## Configuration

Le serveur supporte deux modes d'installation et de fonctionnement:

- **`FULL`** (par défaut) — Mode complet avec traitement de données
- **`PRESENTATION`** — Mode lecture seule optimisé pour la RAM

La mode est contrôlée par la variable d'environnement `POLYPTYQUE_SERVER_MODE`.

---

## Mode FULL

Fonctionnalités complètes : uploads, traitement, génération d'images, emails.

### Installation
```bash
npm install
# ou explicitement
POLYPTYQUE_SERVER_MODE=FULL npm install
```

### Démarrage
```bash
npm start
# ou
POLYPTYQUE_SERVER_MODE=FULL npm start
```

### Caractéristiques
- ✅ Routes `/upload` — POST pour intégrer de nouvelles données
- ✅ Routes `/mixes/*` — Génération dynamique d'images (canvas)
- ✅ Routes `/preview-*` — Création de thumbnails
- ✅ Envoi d'emails via nodemailer
- ✅ Conversion WebP à la volée (webp-middleware)
- 📦 Empreinte RAM: **58-65 MB**
- 📦 node_modules: **~64 MB**

---

## Mode PRESENTATION

Mode lecture seule : affichage des données historiques, **pas** d'uploads ni de traitement.

### Installation
```bash
POLYPTYQUE_SERVER_MODE=PRESENTATION npm install
```

Cela désinstalle les packages inutiles :
- `canvas` (19 MB) — génération d'images
- `nodemailer` (636 KB) — emails
- `webp-middleware` (1.4 MB) — conversion WebP

### Démarrage
```bash
POLYPTYQUE_SERVER_MODE=PRESENTATION npm start
```

### Caractéristiques
- ❌ Routes `/upload` — retourne 403 Forbidden
- ⚠️ Routes `/mixes/*` — failover graceful (404 ou fallback)
- ⚠️ Routes `/preview-*` — idem
- ❌ Pas de conversion WebP
- ❌ Pas d'emails
- 📦 Empreinte RAM: **32-40 MB** (réduction ~40%)
- 📦 node_modules: **~43 MB** (réduction ~33%)

---

## Docker Compose

### FULL mode (défaut)
```yaml
services:
  polyptyque:
    build: .
    environment:
      POLYPTYQUE_SERVER_MODE: FULL
```

### PRESENTATION mode
```yaml
services:
  polyptyque:
    build: .
    environment:
      POLYPTYQUE_SERVER_MODE: PRESENTATION
    # RAM limit peut être réduit
    mem_limit: 100m  # vs 256m en FULL
```

---

## Changement de mode

Si vous basculez de FULL → PRESENTATION (ou inversement), réexécutez :

```bash
# Nettoyer les node_modules
rm -rf node_modules package-lock.json

# Réinstaller avec le nouveau mode
POLYPTYQUE_SERVER_MODE=PRESENTATION npm install
npm start
```

Ou plus simplement, réexécutez le hook postinstall :

```bash
POLYPTYQUE_SERVER_MODE=PRESENTATION npm run install:mode
```

---

## Logs & Debugging

Au démarrage, les modes affichent des messages informatifs :

```
# FULL mode
🔧 Installing in FULL mode...
📦 FULL mode: Tous les packages sont disponibles
✅ Mode FULL activé
   → Traitement et intégration de données
```

```
# PRESENTATION mode
🔧 Installing in PRESENTATION mode...
📦 PRESENTATION mode: Désinstallation des packages inutiles...
✅ Mode PRESENTATION activé
   → Routes /upload, /mixes/*, /preview-* désactivées
   → RAM: 32-40 MB (vs 58-65 MB en FULL)
```

Routes images :
```
⚠️  PRESENTATION mode: Image generation routes (canvas) disabled
```

Canvas indisponible :
```
ATTENTION : Canvas indisponible
```

---

## Recommendations

| Cas d'usage                        | Mode         |
|------------------------------------|--------------|
| Development local                  | FULL         |
| Staging (données anciennes)        | PRESENTATION |
| Production service public (upload) | FULL         |
| Production archive historique      | PRESENTATION |
| VPS RAM limité                     | PRESENTATION |

---

## Code source

Fichiers clés:
- `scripts/install-mode.js` — Gestion des dépendances
- `src/config.js` — Détection du mode au runtime (`isPresentation`, `isFull`)
- `src/routes/upload.js` — Rejet des uploads en PRESENTATION
- `src/routes/images.js` — Log mode au démarrage
- `src/canvas.js` — Lazy loading (déjà resilient à l'absence de canvas)
