<p align="center">
  <img src=".github/og.png" alt="WebAICoding — hands-on Japanese tech blog on AI coding" width="100%">
</p>

# WebAICoding

[![CI](https://github.com/kitepon/WebAICoding/actions/workflows/validate.yml/badge.svg)](https://github.com/kitepon/WebAICoding/actions/workflows/validate.yml)
[![license](https://img.shields.io/github/license/kitepon/WebAICoding?color=blue)](LICENSE)
[![Hugo](https://img.shields.io/badge/built%20with-Hugo-ff4088?logo=hugo&logoColor=white)](https://gohugo.io/)
[![Live](https://img.shields.io/badge/live-kitepon.dev%2Fblog-0b5fff)](https://kitepon.dev/blog/)

**English** · [日本語](README.ja.md)

> **A hands-on Japanese tech blog about everyday AI coding with Claude Code.**
> A non-programmer hobbyist writes down what actually worked, what broke, and what they learned while building software with AI — Copilot to Cursor to Claude Code. This repo is the source of the Hugo site served as part of `kitepon.dev`.

**Live site → https://kitepon.dev/blog/**

## What it is

The blog is written by someone who is **not** a programmer and codes purely as a hobby. The development style is "architect mode": the author decides the design and direction, then lets the AI implement and reviews the result rather than writing code by hand. Posts are written in Japanese and cover real, in-production experience:

- The journey from GitHub Copilot to Cursor to settling on **VS Code + Claude Code + the MAX plan**
- Practical write-ups: memory systems, token diets, home-server management, and shipping self-made apps
- Honest accounts of the traps, wins, and failures — the kind of detail you only get from actually using the tools daily

Articles live as Markdown under `content/post/`. Every push to `main` triggers GitHub Actions, which validates the content pipeline and the Hugo production build. Production is served by a dedicated nginx container behind the `kitepon.dev` Caddy edge.

## Tech stack

| Component | Choice |
| --- | --- |
| Static site generator | [Hugo](https://gohugo.io/) (extended) |
| Theme | Custom, hand-built (lives in `layouts/` + `assets/`; no external theme) |
| Desktop promotion | Self-owned Ad Studio rails in article gutters; fixed one footer-height above the viewport bottom from first paint |
| Hosting | Non-root nginx container behind Caddy `/blog*` routing |
| Validation | GitHub Actions (`.github/workflows/validate.yml`) |
| Production image | Multi-stage [Dockerfile](Dockerfile) |
| Content language | Japanese |

## How it deploys

```mermaid
flowchart LR
    A["Write Markdown<br/>content/post/{slug}/index.md"] -->|git push main| B["GitHub Actions<br/>validate.yml"]
    B --> C["Content checks<br/>Hugo production build"]
    C -->|green main commit| D["main-server<br/>deploy-release.sh blog"]
    D --> E["fast-forward main<br/>build kitepon-blog:{SHA}<br/>Hugo → nginx"]
    E -->|build fails| X["Stop before the switch (exit 1)<br/>remove nothing"]
    E --> F["Recreate container<br/>wait for healthy"]
    F -->|never healthy| Y["Stop (exit 1), remove nothing<br/>the switch may have happened<br/>check running image, health and public site<br/>roll back if broken"]
    F --> G["LAN + public smoke<br/>/healthz, /blog/, post URL"]
    G -->|any check fails| Y
    G -->|all pass| H["Clean up older images by the keep rules<br/>keep running / previous / last good"]
    H --> I(["kitepon.dev/blog/<br/>via Caddy /blog*"])
```

A green CI run does not deploy anything; production changes only through the deploy entry above. Exit codes, the unknown-result case and rollback are in [docs/site-operations.md](docs/site-operations.md#本番更新).

Only articles with `draft: false` are published.

## Run locally

You need **Hugo extended** ([installation guide](https://gohugo.io/installation/)).

```bash
# Clone (no theme submodule needed — the theme lives in this repo)
git clone https://github.com/kitepon/WebAICoding.git
cd WebAICoding

# Start the dev server (http://localhost:1313/)
hugo server -D

# Production build (output goes to public/)
hugo --minify
```

## Writing a post

```bash
# Scaffold a new article
hugo new content/post/your-slug/index.md
```

Front matter (match the existing posts):

```yaml
---
title: "Post title"
date: 2026-06-03
draft: true
description: "Summary shown in the list and social cards"
tags: ["Claude Code", "AI Coding"]
cover:
  image: "cover.png"
---
```

Each post needs a `cover.png` (1250×500). Generate it with the in-repo tool — OS-independent, so any clone produces the same image:

```bash
cd tools/cover
npm ci && npx playwright install chromium    # first time only
node generate-cover.js "Title line 1" "Title line 2" "../../content/post/your-slug/cover.png"
```

See [tools/cover/README.md](tools/cover/README.md) for the design spec and details.

Set `draft: false` before publication. Pushing to `main` runs validation but does not by
itself deploy. After validation passes, the production operator fast-forwards the validated
commit and rebuilds the dedicated blog container with that commit SHA as its image tag.

## Layout

```
content/        Articles (Markdown page bundles) and the About page
layouts/        Custom theme — baseof / list / single
                _default/_markup/render-image.html  (wraps body images in <figure> + caption)
                shortcodes/linkcard.html            (OGP-style link preview cards)
assets/css/     Stylesheet (fingerprinted at build → cache-busting)
static/         Static files — favicons, OG image, etc.
hugo.toml       Site configuration
tools/cover/    Cover-image generator (Playwright → 1250×500 PNG)
```

Articles are illustrated with in-text figures, diagrams, app screenshots, tables, and link cards. Body images are sourced from real material (app screenshots, brand-styled HTML→PNG diagrams, generated illustrations) — never hand-drawn by the model — and served at full resolution.

## License

[MIT License](LICENSE) — © 2026 kitepon.dev
