# PT / EN / ES — international editorial editions

## Compatibility and publication boundary

The Portuguese collection (`content/articles`), article URLs (`/artigo/<slug>`), authors, taxonomy, search, category/tag counts and Portuguese RSS stay authoritative and unchanged. No redirect, translated category duplication or browser-only translation is introduced. No external newsletter, admin, advertising or database code is changed.

Translations live in `content/translations/en/<translated-slug>.mdx` and `content/translations/es/<translated-slug>.mdx`. Canonicals are `/en/article/<slug>` and `/es/articulo/<slug>`. The generated translation index/loaders are separate from the original index. The same constrained MDX parser, article schema, author/source requirements, components, safety checks and editorial CLI apply.

`translationOf` links an edition to a published Portuguese original. `sourceRevision` is SHA-256 of the original source normalized to LF, making validation reproducible on Linux/Windows. Bibliography is preserved in its original language and order; image binaries, URLs, licenses and scientific sources are reused. Captions/alt, headline, description, body and disclosure are translated. Text inside the original raster infographics remains Portuguese and is explicitly identified in caption/alt.

Publication requires BOTH the existing published state and `translationReview: { status: approved, reviewer, reviewedAt }`, plus approvedAt/publishedAt and the existing article gates. The generator rejects invalid approval metadata; the public repository additionally filters unreviewed, future, demo and unpublished editions. No workflow auto-approves translations. Source changes invalidate the fingerprint and require reconciliation before generation succeeds.

The original scientific research brief is reused by `translationOf`; it is not rewritten or duplicated. Its factual states and scoped residual-risk approval remain unchanged. That decision is never renamed as an approval of a translation. Human language/editorial approval remains independent and must address preservation of the source's limitations.

## Routes, language menu and local search

The shared ArticleDetailView renders the PT and translated editions. Locale context localizes key points, disclosure heading, credits, byline/date and reading time. HTML lang, OG locale and Article JSON-LD language match the edition. Portuguese behavior remains the default.

The header uses a native details/summary language menu with normal anchors, keyboard focus, accessible current language and touch targets. It is available on mobile; below 400px only the brand icon is shown to keep room for the existing controls.

If a reviewed published equivalent exists, the menu links to it. Otherwise it explicitly says translation unavailable and opens `/en` or `/es`, never an unrelated article or a fabricated translation. These catalogs offer server-rendered search of published translations only. Empty/single-article catalogs are noindex, follow and absent from the sitemap. Unpublished article URLs return 404/noindex, without canonical or hreflang pointing at a draft.

The rest of the portal, legal pages, author bios and taxonomy remain in Portuguese. English/Spanish readers can reach these original resources; no claim of whole-site translated content is made. TTS, comments and newsletter interfaces remain as implemented for Portuguese; this change does not create translated copies of those services.

## International SEO and distribution

Each published edition has its own canonical and translated title/description/OG metadata. Reciprocal alternate links include pt-BR, en, es only for published/reviewed available equivalents. x-default points to the Portuguese original because it is the authoritative source and explicit default, without geolocation redirects.

The XML sitemap uses the XHTML alternate namespace; drafts are excluded from both loc and alternates. A language catalog becomes indexable and enters the sitemap at two published articles. Existing tag indexation policy is unchanged.

`/rss.xml` remains Portuguese with unchanged GUIDs. `/en/rss.xml` and `/es/rss.xml` contain only published reviewed editions of that language and use distinct permalink GUIDs. Before approval, these language feeds are empty. Portuguese search continues to search the Portuguese corpus; language catalogs search their own corpus without contaminating recommendation/tag counts.

## ART-033: editorial handoff

Both complete translations are draft / review-ready with `translationReview.status: pending`. No reviewer, approval date or publication date was fabricated. They reuse the original 14 bibliographic entries and four images. The transparency note is translated in full with an additional statement identifying AI-assisted translation and independent editorial review.

The original Portuguese MDX and 14 image files remain untouched. The figure of 21 Mt is retained as an estimate used by the original edition, NOT newly certified by translation. The attribution paragraph explicitly identifies the original edition as the source of that selected estimate. The documentary USGS reservation and ANM/USGS methodology limitations remain in the existing internal audit; they have not been resolved by translating. Human reviewers must assess fidelity and these qualifications without silently replacing numbers or altering the original.

Expected URLs after review and express publication approval:

- `/en/article/rare-earths-17-elements-technology-brazil-part-1`
- `/es/articulo/tierras-raras-17-elementos-tecnologia-brasil-parte-1`

## Next editions and official commands

1. Create a complete MDX under the locale directory, with a unique translated slug, original `translationOf`, LF-normalized source fingerprint and pending review.
2. Preserve author, category, sources, references and imagery; translate every body block, metadata, caption/alt and disclosure. Do not infer scientific confirmation or licenses.
3. Run `bun run content:generate`, `bun run content:validate` and the official `content:review en:<translated-slug>` (or `es:<translated-slug>`) command.
4. `content:status en:<translated-slug> review` simulates the normal transition with the source research brief. No --apply is implied.
5. A human reviewer records a genuine reviewer/date and approved translationReview, then the existing CLI performs review → approved → published only after authorization and publish-check. These commands do not themselves deploy.
6. Regenerate, run the gates and inspect public routes, reciprocal alternates, sitemap/feed and language menu. Never publish a pending edition to make tests pass.

For local development use the normal Vite server. Public routes intentionally do not preview drafts. Tests render draft MDX directly and use approved in-memory fixtures only; those fixtures are never persisted or exposed by the application. Route tree generation remains the existing TanStack/Vite pipeline; commit the generated route tree including its Start registration footer.

## Validation

Focused tests cover legacy PT, translation draft exclusion, editorial review gate, canonical/OG/JSON-LD languages, reciprocal alternates and x-default, multilingual sitemap, separate feeds, keyboard/touch menu markup and fallback, body structure/paragraph counts, citations, quantities, bibliography and image references. Full suite, typecheck, lint and production build must pass before the draft PR is submitted. No merge/deploy is authorized in this task.

### Local runtime limitation and SSR verification

The installed workerd binary supports compatibility dates only through 2026-07-15, while Nitro generates 2026-10-21. A normal local wrangler dev invocation fails before serving; dependencies and production compatibility settings were not modified. The existing CI smoke imports the generated Worker entry directly under Bun. `bun run smoke:i18n` uses the same local SSR method, without remote bindings or external requests, and is included in CI after the existing smoke. It checks real PT/EN/ES routes, HTML lang/canonical, empty catalogs, 404 drafts and feeds/sitemap in both preview and production builds. It does not claim browser hydration or workerd compatibility was independently proven.

The interactive browser tool also failed initialization (`failed to write kernel assets`), so no live desktop/mobile screenshot or visual pass is claimed. Native details/summary behavior, focus/touch targets and narrow-screen layout classes have automated coverage; manual visual review remains appropriate alongside human translation review.

## SEO references

Consulted on 2026-10-25: [Google Search Central: localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions) and [multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites). The design uses separate URLs, fully qualified reciprocal alternate links including self, and an explicit user-operated language switch. The Portuguese authoritative original is the x-default fallback. Language annotations are not a guarantee of indexing or a substitute for complete translated content.

## Validation results (2026-10-25)

Linux Node 24.22.1 / Bun 1.3.14: 878 tests passed, zero failures (99 files, 4,701 assertions, 27.65 seconds). Typecheck, content validation, diff check and ESLint passed without warnings. Local ESLint excluded only the ignored `.wrangler/**` deployment outputs retained from the previous release; no source/test directory was excluded. CI uses its normal clean-checkout lint command.

Production and preview builds passed. The existing preview smoke and the new 11-response multilingual SSR smoke passed against the preview build; the multilingual smoke also passed against the production build. Both official translation reviews reported zero errors and one expected pending-human-review warning. Production-context publish-check correctly returned exit 1 for each translation, with exactly two blockers: draft status and absent identified human approval. No actual editorial transition, merge or deploy was performed.

The Portuguese source/index/loaders, image files, dependencies/lockfile and unrelated services have no diff. English and Spanish require human editorial review and a desktop/mobile visual review before publication authorization.
