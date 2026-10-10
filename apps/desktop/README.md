# AGENT Companion (desktop)

Compagnon de bureau : une île animée tout en haut de l'écran qui montre la présence de tes agents et te laisse **approuver ou refuser** leurs actions sensibles en un clic. Electron + Vite/React.

## Installer
| OS | Comment |
|---|---|
| Windows / macOS / Linux | Pousse le repo sur GitHub, lance le workflow **Desktop installers** (onglet Actions) ou crée un tag `v0.1.0` : tu récupères `.exe`, `.dmg`/`.zip`, `.AppImage`/`.deb` dans les artefacts. |
| Localement (sur ton OS) | `pnpm install && pnpm --filter @agent/desktop dist` → installateur dans `apps/desktop/release/` |
| Dev | `pnpm --filter @agent/desktop dev` (terminal 1) puis `pnpm --filter @agent/desktop dev:app` (terminal 2) |

Les builds ne sont **pas signés** : Windows SmartScreen et macOS Gatekeeper afficheront un avertissement (macOS : clic droit → Ouvrir). La signature/notarisation demande tes propres certificats.

## Utilisation
- Icône dans la zone de notification : afficher/masquer, déplier, lancer la démo, couper le son, lancer au démarrage, quitter.
- Raccourci global : **Ctrl/Cmd + Maj + Espace** (déplier/replier). Dans une alerte : **⏎** approuver, **⎋** plus tard.
- La fenêtre épouse la taille de l'île : le reste de l'écran reste cliquable.

## Brancher un agent (pont local)
Au démarrage, l'app écoute sur `127.0.0.1` (port 47821, sinon aléatoire) et écrit `bridge.json` (port + token, droits 0600) dans son dossier de config (`~/.config/AGENT Companion`, `~/Library/Application Support/AGENT Companion`, `%APPDATA%\AGENT Companion`).

```bash
# demander une décision humaine (bloque jusqu'à la réponse ou au timeout)
node apps/desktop/bin/agent-hook.mjs approve --title "Deploy to prod" --action DEPLOY_PROD --by "CI bot" --target acme/web --risk HIGH --timeout 60
# code de sortie : 0 approuvé · 1 refusé · 3 délai dépassé · 4 app fermée (0 avec --fail-open) · 2 erreur

# signaler la présence d'un agent
node apps/desktop/bin/agent-hook.mjs presence --id ci --name "CI bot" --state working --doing "Running tests"
```
API HTTP : `GET /v1/health`, `POST /v1/agents`, `POST /v1/approvals` avec `Authorization: Bearer <token>`.

**Fail-closed par défaut** : si le compagnon est fermé, `approve` échoue (code 4) au lieu d'autoriser silencieusement. `--fail-open` est un choix explicite de l'appelant.

## Sécurité
Loopback uniquement · token obligatoire (comparaison à temps constant) · requêtes de navigateur refusées (en-tête `Origin`) et `Host` étranger refusé (CSRF / DNS rebinding) · corps limité à 16 Ko · 20 approbations en attente max · renderer sandboxé (`contextIsolation`, pas de Node, API `preload` en liste blanche, CSP stricte) · navigation et `window.open` bloqués.

## État honnête
Vérifié ici : lint, 15 tests (dont le pont), build, **AppImage et .deb Linux construits**, AppImage lancée sous écran virtuel, approbations approve/reject/timeout de bout en bout. **Non testé** : Windows et macOS (installateurs produits par la CI, pas par moi), Wayland, positionnement sur une vraie encoche MacBook, mise à jour automatique (absente), signature de code (absente). Sous GNOME, l'icône de zone de notification demande une extension.
