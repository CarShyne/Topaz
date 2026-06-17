Topaz is a free, self-hosted markdown note-taking app inspired by tools like Obsidian and Logseq,
built around local-first sync without subscriptions,no paywalled features,no third-party cloud dependancy.

   Markdown-based notes, organized into projects
-  Selfhosted sync   
-  Code pairing between devices   
-  Link notes together with `[[double brackets]]`
-  Built-in sync across devices via a custom REST API — no third-party sync service required
-  Run any device as the primary server, including dedicated PC installs
-  Docker support for always-on home servers and power users
-  Optional [Tailscale](https://tailscale.com) support for secure remote sync outside your local network
-  Free. Forever. No feature gating, no subscription tiers.

Topaz uses a local-first sync model. One device acts as the **primary server**, and other devices sync to
it over a custom REST API. There’s no mandatory cloud backend — your notes stay on your network unless you 
choose otherwise.

Topaz is an independent project, built from the ground up with its own codebase, design, and branding. It is
not affiliated with, endorsed by, or associated with Obsidian, Dynalist Inc., Logseq, or any other note-taking 
application or company.


Trademark & Branding
The Topaz name and logo are not covered by the GPLv3 license and are reserved as the branding of this project. Forks that redistribute the project under a different name and identity are welcome, but should not use the Topaz name or logo to avoid confusion with the original project.


Design Language
Topaz’s visual identity — its dark theme, color palette, typography, and overall UI design — is a core part of what makes it Topaz. While the code is fully open for contributions, modifications, and new functionality, I’d ask that contributors keep the existing design language intact rather than reskinning it. New features are very welcome — just please build them to match the look and feel that’s already there, rather than changing it.


## Docker / Portainer (self-hosted web app)

Every push to `main` builds a Docker image automatically: **`ghcr.io/carshyne/topaz:latest`**

### Portainer — pull from GitHub (recommended)

Use the pre-built image (no local build, avoids “permission denied” errors):

1. Open **Portainer** → **Stacks** → **Add stack**
2. Name: `topaz`
3. Build method: **Repository**
4. Repository URL: `https://github.com/CarShyne/Topaz`
5. Repository reference: `refs/heads/main`
6. Compose path: **`docker-compose.portainer.yml`** ← important (not `docker-compose.yml`)
7. Deploy the stack

No GitHub login is required (the repo is public).

After deploy, open `http://YOUR-SERVER:3921`. You should see **Next Level Notes** and **Updated · build …** under the title.

### “Permission denied” fixes

| Error | Cause | Fix |
|-------|--------|-----|
| `pull access denied` for `jt7777/topaz` | Old compose used Docker Hub image that was never pushed | Use `docker-compose.portainer.yml` (pulls from GitHub Container Registry) |
| `permission denied` on docker.sock during **build** | Portainer cannot build images on that host | Use `docker-compose.portainer.yml` (pull only, no build) |
| `pull access denied` for `ghcr.io/carshyne/topaz` | GitHub Action has not run yet, or package is private | Wait for [Actions](https://github.com/CarShyne/Topaz/actions) to finish, then set package visibility to **Public** under GitHub → Packages → topaz |

### Update to latest version

Portainer → Stacks → `topaz` → **Pull and redeploy** (or recreate the container).

### Local Mac (Docker Desktop)

```bash
git clone https://github.com/CarShyne/Topaz.git
cd Topaz
./scripts/deploy-topaz.sh
```

### Optional: mirror to Docker Hub (`jt7777/topaz`)

In GitHub repo **Settings → Secrets → Actions**, add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`, then extend the workflow if you want Hub publishing.
