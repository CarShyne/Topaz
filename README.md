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

Docker image: **`jt7777/topaz:latest`** on [Docker Hub](https://hub.docker.com/r/jt7777/topaz).

### Raspberry Pi / OpenMediaVault (Portainer)

Your Pi is **arm64** — same as Apple Silicon Mac. The URL working only means the **old** container runs; Docker will **not** replace it unless the image on Docker Hub changes **and** the Pi pulls a **new tag or new digest**.

**Why pull does not seem to update**

1. `latest` on Docker Hub still points at the **same old build** (your log shows `(hub publishing on)` = old code).
2. Portainer **restarts** the container without re-pulling the image.
3. Docker on the Pi **caches** `jt7777/topaz:latest` and says “already up to date”.

**Fix (maintainer, on your Mac)**

```bash
cd ~/Projects/Topaz && git pull && ./scripts/publish-jt7777.sh
```

This pushes a **new unique tag** (e.g. `release-20260217-153045`), updates `docker-compose.portainer.yml` in git, and pushes to GitHub.

**Then on the Pi / Portainer**

1. Stacks → Topaz → **Pull and redeploy** (stack from git picks up the new `release-…` tag), **or**
2. SSH to the Pi: `cd` to the repo and run `./scripts/pi-force-update.sh release-YYYYMMDD-HHMMSS`

**How you know it worked**

| Log line | Meaning |
|----------|---------|
| `(hub publishing on)` | **Old** image — still broken |
| `(build 20260217-…)` | **New** image — vault + Next Level Notes |

Browser: `http://PI-IP:3921/api/vault/whatami` → `"hasNewTagline": true`

### “Permission denied” / old UI / vault won’t create

| Symptom | Cause | Fix |
|---------|--------|-----|
| `jt7777/topaz:ae5e318` pull fails | That tag was never pushed — only exists in git, not Docker Hub | Use `jt7777/topaz:latest` |
| Still says “Your connected knowledge base” | Old image on Docker Hub (often wrong CPU type) | Run `publish-jt7777-amd64.sh` if Portainer is Intel |
| `pull access denied` for `ghcr.io/carshyne/...` | Don’t use GitHub registry | Use `docker-compose.portainer.yml` (jt7777 only) |
| Create vault does nothing | Same — old image without vault API | Publish + redeploy |

### Optional: auto-publish on git push

Add GitHub repo secrets `DOCKERHUB_USERNAME` (`jt7777`) and `DOCKERHUB_TOKEN`, then commit `.github/workflows/docker-publish.yml` (needs a token with **workflow** scope to push workflow files).
