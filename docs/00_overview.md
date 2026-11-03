# WebAICoding Overview

## Purpose

WebAICoding is the source repository for the Japanese Hugo blog "Claude Code 始めました".
The live site is published at <https://kitepon.dev/blog/>.
The legacy `blog.kitepon.dev` hostname permanently redirects to the live path.

## Canonical Entry Points

- Human entry point: [README.md](../README.md)
- Agent entry point: [AGENTS.md](../AGENTS.md)
- Claude Code import: [CLAUDE.md](../CLAUDE.md)
- Writing voice and author model: [docs/writing-voice.md](writing-voice.md)
- Publishing workflow: [docs/publishing.md](publishing.md)
- Site operations: [docs/site-operations.md](site-operations.md)
- Site config: [hugo.toml](../hugo.toml)
- Architecture decision records: [docs/adr/](adr/)
- Reusable research shelf: [rag/INDEX.md](../rag/INDEX.md)

## Repository Map

- `content/`: Hugo content, including article page bundles under `content/post/`.
- `articles/`: Zenn crosspost Markdown generated from blog posts.
- `layouts/`: Custom Hugo theme templates and shortcodes. `layouts/partials/ad-rail.html` loads the desktop article promotion rails and measures the footer height on load and resize.
- `assets/css/`: Fingerprinted site CSS. The rail position always combines the normal bottom gap with one footer-height offset.
- `static/`: Static assets such as favicons and OG images.
- `tools/cover/`: Playwright-based cover image generator.
- `tools/zenn-sync/`: Blog-to-Zenn synchronization tool.
- `.github/workflows/`: GitHub Actions for content validation and dev.to crossposting.
- `Dockerfile`, `compose.yaml`, `deploy/nginx.conf`: Production image, the `kitepon-blog` container and its nginx routing. Production is updated only through the deploy entry in [docs/site-operations.md](site-operations.md#本番更新), which also covers exit codes, the unknown-result case and rollback. A green validation run never deploys.
- `.agents/skills/`: Shared project skills used by supported agents.

## Verification

Use the same content gates as the validation workflow:

```bash
node tools/validate-content.mjs
node tools/zenn-sync/sync.mjs --check
npm --prefix .github/scripts test
hugo --minify
node tools/validate-content.mjs --rendered
```

For draft/future-date checks while editing posts:

```bash
hugo -D
```

## Operational Notes

- The active custom theme is part of this repository. A legacy `themes/paper` gitlink remains unused and requires separate owner approval before removal.
- `public/`, `resources/_gen/`, and `.hugo_build.lock` are generated locally and ignored.
- Agent-specific local settings are local-only; do not commit them.
