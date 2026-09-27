import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BLOG_TO_ZENN_SLUG,
  toBlogSlug,
  toZennSlug,
} from "../article-manifest.mjs";
import {
  convertBody,
  parseArgs,
  validateZennFrontmatter,
} from "../zenn-sync/sync.mjs";
import {
  parseHugoFrontmatter,
  renderedHeadingJumps,
  pngDimensions,
  renderedOgDimensions,
  validateHugoMeta,
  validatePngFile,
} from "../validate-content.mjs";
import {
  buildPayload,
  canonicalRefreshTargets,
  canonicalMatches,
  canonicalUrlFor,
  findArticle,
  listLocalCandidates,
  findFixupTarget,
  findHiddenTarget,
  requireSingleCanonicalMatch,
  rewriteInternalLinks,
  selectTarget,
  unresolvedTargets,
  validateState,
  zennTranslationUrlFor,
} from "../../.github/scripts/crosspost-devto.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

test("共有manifestは8件の差異を双方向に解決する", () => {
  assert.equal(Object.keys(BLOG_TO_ZENN_SLUG).length, 8);
  assert.equal(toZennSlug("bughub"), "bughub-aggregation");
  assert.equal(toBlogSlug("bughub-aggregation"), "bughub");
  assert.equal(toZennSlug("what-is-ci"), "what-is-continuous-integration");
  assert.equal(toBlogSlug("what-is-continuous-integration"), "what-is-ci");
  assert.equal(toZennSlug("aiterm-converse"), "aiterm-converse");
  assert.equal(canonicalUrlFor("bughub-aggregation"), "https://kitepon.dev/blog/post/bughub/");
  assert.equal(
    canonicalUrlFor("aiterm-converse"),
    "https://kitepon.dev/blog/post/aiterm-converse/",
  );
  assert.equal(
    zennTranslationUrlFor("bughub-aggregation"),
    "https://zenn.dev/kitepon/articles/bughub-aggregation?locale=en",
  );
});

test("Zenn変換は本文だけを変換しコードフェンスを保存する", () => {
  const input = [
    "```md",
    '{{< unknown value="kept" >}}',
    "```",
    "",
    '[内部]({{< relref "bughub#details" >}})',
    '{{< linkcard url="https://example.com" title="Example" >}}',
    '{{< linkcard url="https://blog.kitepon.dev/post/legacy/" title="Legacy" >}}',
    "![説明](figure.png)",
  ].join("\n");
  const output = convertBody(input, "source-post");
  assert.match(output, /\{\{< unknown value="kept" >\}\}/);
  assert.match(output, /https:\/\/kitepon\.dev\/blog\/post\/bughub\/#details/);
  assert.match(output, /@\[card\]\(https:\/\/example\.com\)/);
  assert.match(output, /@\[card\]\(https:\/\/kitepon\.dev\/blog\/post\/legacy\/\)/);
  assert.match(output, /source-post\/figure\.png\)\n\*説明\*/);
});

test("長い未対応shortcodeは停止する", () => {
  const value = "x".repeat(200);
  assert.throws(
    () => convertBody(`{{< unknown value="${value}" >}}`, "sample"),
    /未対応のショートコード/,
  );
});

test("Zenn frontmatterとCLI引数を厳格に検査する", () => {
  const valid = [
    'title: "Title"',
    'emoji: "🧪"',
    'type: "tech"',
    'topics: ["ai"]',
    "published: true",
  ].join("\n");
  assert.doesNotThrow(() => validateZennFrontmatter(valid, "valid-slug-12", "fixture"));
  assert.throws(() => validateZennFrontmatter(valid, "short", "fixture"), /12〜50字/);
  assert.deepEqual(parseArgs(["--slug", "bughub", "--dry"]), {
    dry: true,
    check: false,
    slug: "bughub",
  });
  assert.throws(() => parseArgs(["--slug"]), /ブログslugが必要/);
});

test("dev.to payloadはcanonical_urlと未解決リンクを保持する", () => {
  const canonicalUrl = canonicalUrlFor("source-article");
  const article = {
    title: "English title",
    bodyHtml:
      '<p>Body</p><p><a href="https://kitepon.dev/blog/post/bughub/#details">BugHub</a></p>',
  };
  const payload = buildPayload(article, ["ai"], {}, canonicalUrl);
  assert.equal(payload.article.canonical_url, canonicalUrl);
  assert.deepEqual(unresolvedTargets(payload.article.body_markdown), ["bughub-aggregation"]);

  const rewritten = rewriteInternalLinks(payload.article.body_markdown, {
    "bughub-aggregation": { id: 1, url: "https://dev.to/example/bughub" },
  });
  assert.match(rewritten, /https:\/\/dev\.to\/example\/bughub#details/);
  assert.equal(buildPayload(article, ["ai"], {}, undefined).article.canonical_url, undefined);
  assert.throws(() => buildPayload(article, ["日本語"], {}, canonicalUrl), /英数字tagが無い/);
});

test("遠隔照合はcanonical_urlの完全一致だけを採用する", () => {
  const canonicalUrl = canonicalUrlFor("source-article");
  const matches = canonicalMatches(
    [
      { id: 1, canonical_url: canonicalUrl },
      { id: 2, canonical_url: canonicalUrlFor("other-article") },
    ],
    canonicalUrl,
  );
  assert.deepEqual(matches.map((item) => item.id), [1]);
  assert.equal(requireSingleCanonicalMatch(matches, "source-article").id, 1);
  assert.throws(() => requireSingleCanonicalMatch([], "source-article"), /自動POSTせず停止/);
  assert.throws(
    () => requireSingleCanonicalMatch([matches[0], matches[0]], "source-article"),
    /遠隔一致が2件/,
  );
});

test("既存dev.to記事のcanonical更新対象をIDとURLで厳格に照合する", () => {
  const state = {
    "bughub-aggregation": { id: 1, url: "https://dev.to/quolu/bughub", pending: [] },
    "aiterm-converse": { id: 2, url: "https://dev.to/quolu/aiterm", pending: [] },
  };
  const targets = canonicalRefreshTargets(state, [
    {
      id: 1,
      url: "https://dev.to/quolu/bughub",
      canonical_url: "https://zenn.dev/kitepon/articles/bughub-aggregation?locale=en",
    },
    {
      id: 2,
      url: "https://dev.to/quolu/aiterm",
      canonical_url: "https://kitepon.dev/blog/post/aiterm-converse/",
    },
  ]);
  assert.deepEqual(
    targets.map(({ zennSlug, expectedCanonicalUrl, needsUpdate }) => ({
      zennSlug,
      expectedCanonicalUrl,
      needsUpdate,
    })),
    [
      {
        zennSlug: "aiterm-converse",
        expectedCanonicalUrl: "https://kitepon.dev/blog/post/aiterm-converse/",
        needsUpdate: false,
      },
      {
        zennSlug: "bughub-aggregation",
        expectedCanonicalUrl: "https://kitepon.dev/blog/post/bughub/",
        needsUpdate: true,
      },
    ],
  );
  assert.throws(
    () => canonicalRefreshTargets(state, [{ id: 1, url: "https://dev.to/quolu/bughub" }]),
    /遠隔記事が見つからない/,
  );
  assert.throws(
    () =>
      canonicalRefreshTargets(state, [
        { id: 1, url: "https://dev.to/quolu/wrong" },
        { id: 2, url: "https://dev.to/quolu/aiterm" },
      ]),
    /遠隔URLが台帳と不一致/,
  );
});

test("Zenn記事探索は要求slugと一致するobjectだけを返す", () => {
  const tree = {
    props: [
      { slug: "wrong", isTranslated: true, bodyHtml: "wrong" },
      { slug: "right", isTranslated: true, bodyHtml: "right" },
    ],
  };
  assert.equal(findArticle(tree, "right").bodyHtml, "right");
  assert.equal(findArticle(tree, "missing"), null);
});

test("現行台帳はローカル公開候補の部分集合として妥当", () => {
  const candidates = listLocalCandidates();
  const state = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "crossposted-devto.json"), "utf8"),
  );
  assert.doesNotThrow(() => validateState(state, candidates));
  assert.ok(candidates.length >= Object.keys(state).length);
});

test("posting予約の欠損と複数予約を拒否する", () => {
  const candidates = [{ zennSlug: "article-one" }, { zennSlug: "article-two" }];
  assert.throws(
    () =>
      validateState(
        {
          "article-one": {
            status: "posting",
            sourceKey: "article-one",
            canonicalUrl: "https://example.com/one",
          },
        },
        candidates,
      ),
    /posting予約が不正/,
  );
  assert.throws(
    () =>
      validateState(
        {
          "article-one": {
            status: "posting",
            sourceKey: "article-one",
            canonicalUrl: "https://example.com/one",
            reservationToken: "run:1",
          },
          "article-two": {
            status: "posting",
            sourceKey: "article-two",
            canonicalUrl: "https://example.com/two",
            reservationToken: "run:1",
          },
        },
        candidates,
      ),
    /posting予約が複数/,
  );
});

const SELECT_CANDIDATES = [
  { zennSlug: "posted-article", date: "2026-06-01" },
  { zennSlug: "untranslated-article", date: "2026-06-02" },
  { zennSlug: "missing-article", date: "2026-06-03" },
  { zennSlug: "translated-article", date: "2026-06-04" },
];

function fakeFetch(articles, calls) {
  return async (zennSlug) => {
    calls.push(zennSlug);
    const article = articles[zennSlug];
    if (!article) throw new Error(`fixture未定義: ${zennSlug}`);
    if (article.zennStatus) {
      const error = new Error(`Zenn HTTP ${article.zennStatus}`);
      error.zennStatus = article.zennStatus;
      throw error;
    }
    return article;
  };
}

const SELECT_FIXTURE = {
  "untranslated-article": { isTranslated: false, bodyHtml: "ja" },
  "missing-article": { zennStatus: 404 },
  "translated-article": { isTranslated: true, title: "Title", bodyHtml: "en" },
};

test("英訳未完とZenn未公開を飛ばして次の英訳済み記事を選ぶ", async () => {
  const calls = [];
  const result = await selectTarget(
    SELECT_CANDIDATES,
    { "posted-article": { status: "published", id: 1, url: "https://dev.to/x/posted" } },
    fakeFetch(SELECT_FIXTURE, calls),
    { gapMs: 0 },
  );
  assert.equal(result.target.zennSlug, "translated-article");
  assert.equal(result.article.bodyHtml, "en");
  assert.deepEqual(result.skipped, [
    { zennSlug: "untranslated-article", reason: "英訳未完" },
    { zennSlug: "missing-article", reason: "Zenn未公開(404)" },
  ]);
  assert.deepEqual(calls, ["untranslated-article", "missing-article", "translated-article"]);
});

test("404以外のZennエラーは飛ばさずthrowする", async () => {
  const calls = [];
  await assert.rejects(
    () =>
      selectTarget(
        SELECT_CANDIDATES.slice(2),
        {},
        fakeFetch({ ...SELECT_FIXTURE, "missing-article": { zennStatus: 500 } }, calls),
        { gapMs: 0 },
      ),
    /Zenn HTTP 500/,
  );
  assert.deepEqual(calls, ["missing-article"]);
});

test("英訳済み候補が無ければtargetはnullで全件をskippedへ残す", async () => {
  const calls = [];
  const result = await selectTarget(
    SELECT_CANDIDATES.slice(1, 3),
    {},
    fakeFetch(SELECT_FIXTURE, calls),
    { gapMs: 0 },
  );
  assert.equal(result.target, null);
  assert.equal(result.article, null);
  assert.deepEqual(result.skipped.map((item) => item.zennSlug), [
    "untranslated-article",
    "missing-article",
  ]);
  assert.deepEqual(calls, ["untranslated-article", "missing-article"]);
});

test("下書きへ戻した記事は公開日順に1件だけ再公開対象になる", () => {
  const state = {
    "posted-article": { id: 1, url: "https://dev.to/x/a" },
    "untranslated-article": { id: 2, url: "https://dev.to/x/b", hidden: true },
    "translated-article": { id: 3, url: "https://dev.to/x/d", hidden: true },
  };
  assert.equal(findHiddenTarget(SELECT_CANDIDATES, state).zennSlug, "untranslated-article");
  delete state["untranslated-article"].hidden;
  assert.equal(findHiddenTarget(SELECT_CANDIDATES, state).zennSlug, "translated-article");
  delete state["translated-article"].hidden;
  assert.equal(findHiddenTarget(SELECT_CANDIDATES, state), null);
});

test("hiddenは非booleanを拒否し、下書き記事へのリンクはpendingへ残す", () => {
  assert.throws(
    () =>
      validateState(
        { "article-one": { id: 1, url: "https://dev.to/x/a", hidden: "yes" } },
        [{ zennSlug: "article-one" }],
      ),
    /hiddenがboolean/,
  );
  const markdown = "[内部](https://blog.kitepon.dev/post/bughub/)";
  const hiddenState = {
    "bughub-aggregation": { id: 1, url: "https://dev.to/x/bughub", hidden: true },
  };
  assert.equal(rewriteInternalLinks(markdown, hiddenState), markdown);
  assert.deepEqual(unresolvedTargets(markdown), ["bughub-aggregation"]);
  delete hiddenState["bughub-aggregation"].hidden;
  assert.match(rewriteInternalLinks(markdown, hiddenState), /dev\.to\/x\/bughub/);
});

test("リンク更新は参照先が下書きの記事を対象にしない", () => {
  const state = {
    "waiting-article": { id: 1, url: "https://dev.to/x/a", pending: ["hidden-target"] },
    "hidden-target": { id: 2, url: "https://dev.to/x/b", hidden: true },
  };
  assert.equal(findFixupTarget(state), null);
  delete state["hidden-target"].hidden;
  assert.equal(findFixupTarget(state), "waiting-article");
  state["waiting-article"].hidden = true;
  assert.equal(findFixupTarget(state), null);
});

test("workflowは再公開した日に新規転載を行わない", () => {
  const crosspost = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/crosspost-devto.yml"),
    "utf8",
  );
  assert.match(crosspost, /--republish/);
  assert.match(
    crosspost,
    /if: inputs\.refresh_canonical != true && github\.event\.inputs\.hide_slugs == '' && steps\.republish\.outputs\.republished != 'true'/,
  );
  assert.ok(crosspost.indexOf("--republish") < crosspost.indexOf("--prepare"));
});

test("Hugo frontmatterは未来の公開日を拒否する", () => {
  const text = [
    "---",
    'title: "Title"',
    "date: 2099-01-01T00:00:00+09:00",
    "draft: false",
    'description: "Description"',
    'tags: ["AI"]',
    "cover:",
    '  image: "cover.png"',
    "---",
    "Body",
  ].join("\n");
  const meta = parseHugoFrontmatter(text, "fixture");
  assert.throws(
    () => validateHugoMeta(meta, "fixture", new Date("2026-07-17T00:00:00Z")),
    /未来日付/,
  );
});

test("カバー画像の寸法と欠損を検査する", () => {
  assert.deepEqual(
    pngDimensions(path.join(repoRoot, "content/post/bughub/cover.png")),
    { width: 1250, height: 500 },
  );
  assert.throws(
    () => validatePngFile(path.join(repoRoot, "content/post/bughub/cover.png"), 1080, 1080),
    /画像寸法が不正/,
  );
  assert.throws(
    () => validatePngFile(path.join(repoRoot, "content/post/bughub/missing.png"), 1, 1),
    /画像が無い/,
  );
});

test("Aboutのプロフィール画像は配信base pathに依存しない", () => {
  const about = fs.readFileSync(path.join(repoRoot, "content/about.md"), "utf8");
  assert.match(about, /<img src="\.\.\/avatar\.svg" alt="クオ"/);
  assert.doesNotMatch(about, /\/WebAICoding\//);
  assert.ok(fs.existsSync(path.join(repoRoot, "static/avatar.svg")));
  assert.match(about, /kitepon\.devを運営するクオ/);
  assert.match(about, /Claude CodeやCodex/);
  assert.match(
    about,
    /description: "kitepon\.devを運営するクオと、AIコーディング・個人開発の実践を記録するこのブログについて。"/,
  );
  assert.match(about, /https:\/\/kitepon\.dev\/#systems/);
  assert.match(about, /https:\/\/kitepon\.dev\/#products/);
  assert.doesNotMatch(about, /VS Code \+ Claude Code \+ MAXプラン/);
});

test("workflowは予約push後にPOSTし、Hugo build前に検査する", () => {
  const crosspost = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/crosspost-devto.yml"),
    "utf8",
  );
  assert.match(crosspost, /group: crosspost-devto/);
  assert.ok(
    crosspost.indexOf("Persist reservation before external POST") <
      crosspost.indexOf("Send newly reserved article"),
  );
  assert.ok(
    crosspost.indexOf("Check canonical refresh targets") <
      crosspost.indexOf("Refresh existing canonical URLs"),
  );
  assert.match(crosspost, /inputs\.refresh_canonical != true/);
  const validate = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/validate.yml"),
    "utf8",
  );
  assert.ok(validate.indexOf("Validate content") < validate.indexOf("name: Build"));
  assert.ok(validate.indexOf("Check Zenn synchronization") < validate.indexOf("name: Build"));
});

test("生成HTMLからOGP寸法を検査する", () => {
  const html = '<meta property="og:image:width" content="1250"><meta property="og:image:height" content="500">';
  assert.deepEqual(renderedOgDimensions(html, "fixture"), { width: 1250, height: 500 });
  assert.throws(() => renderedOgDimensions("<html></html>", "fixture"), /OGP画像寸法が無い/);
});

test("生成HTMLの見出し階層の飛びを検出する", () => {
  assert.deepEqual(renderedHeadingJumps("<h1>A</h1><h2>B</h2><h3>C</h3>"), []);
  assert.deepEqual(renderedHeadingJumps("<h1>A</h1><h3>C</h3><h2>B</h2><h4>D</h4>"), [
    { from: 1, to: 3 },
    { from: 2, to: 4 },
  ]);
});
