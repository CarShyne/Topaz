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

### Portainer (for you and other users)

Use **`jt7777/topaz:latest` only** — commit tags like `:ae5e318` do **not** exist on Docker Hub until you run a publish script.

1. **Stacks** → **Add stack** (or edit existing)
2. Build method: **Repository**
3. Repository URL: `https://github.com/CarShyne/Topaz`
4. Reference: `refs/heads/main`
5. Compose path: **`docker-compose.portainer.yml`**
6. Image in compose: **`jt7777/topaz:latest`**
7. Deploy

### After you change code (maintainers)

Publish from your Mac (Docker Desktop must be running):

```bash
cd ~/Projects/Topaz
git pull
```

**Portainer on Intel NAS / PC:**
```bash
./scripts/publish-jt7777-amd64.sh
```

**Portainer on Mac (M1/M2/M3):**
```bash
./scripts/publish-jt7777-arm64.sh
```

**Both / unsure:**
```bash
./scripts/publish-jt7777.sh
```

Then **Portainer → Pull and redeploy**. Check `http://YOUR-SERVER:3921/api/vault/whatami` — must show `"hasNewTagline": true`.

### “Permission denied” / old UI / vault won’t create

| Symptom | Cause | Fix |
|---------|--------|-----|
| `jt7777/topaz:ae5e318` pull fails | That tag was never pushed — only exists in git, not Docker Hub | Use `jt7777/topaz:latest` |
| Still says “Your connected knowledge base” | Old image on Docker Hub (often wrong CPU type) | Run `publish-jt7777-amd64.sh` if Portainer is Intel |
| `pull access denied` for `ghcr.io/carshyne/...` | Don’t use GitHub registry | Use `docker-compose.portainer.yml` (jt7777 only) |
| Create vault does nothing | Same — old image without vault API | Publish + redeploy |

### Optional: auto-publish on git push

Add GitHub repo secrets `DOCKERHUB_USERNAME` (`jt7777`) and `DOCKERHUB_TOKEN`, then commit `.github/workflows/docker-publish.yml` (needs a token with **workflow** scope to push workflow files).
