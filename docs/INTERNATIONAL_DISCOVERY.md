# International discovery — PT-BR archive, EN/ES showcases

## Decision and reusable components

Continuous full-text AI translation is suspended. Keep both repository variables
`I18N_AUTOMATION_ENABLED=false` and `I18N_AUTOMATIC_DEPLOY_ENABLED=false`.
The previous pipeline, protected financial state and complete published editions remain intact.
No Workers AI, OpenAI, inference credentials or new I18N Secrets are required by these pages.

The existing `/$language` route, `TranslationCatalog`, ArticleCard/EditorialImage,
locale context, header/footer, taxonomy catalog and localized category/tag routes are reused.
The first local prototype and final implementation use the same architecture, not a parallel app.

## Persisted localized copy

`src/data/discovery-1.ts` and `discovery-2.ts` contain English and Spanish titles
and summaries for 33 public Portuguese originals. This copy was prepared locally;
no provider inference was executed. These are discovery summaries, not full translations
or a new scientific review. Original article content, scientific qualifications and media are unchanged.
The rare-earth summary does not add a claim confirming the internal 21 Mt verification issue.

`discovery-catalog.ts` binds each record to the exact original title and excerpt.
Unregistered sources or changed titles/excerpts are excluded until copy is updated,
rather than exposing Portuguese fallback copy as a localized summary.
New Portuguese publications need one catalog entry with both locales. No scheduler is required.
Classification remains the original Portuguese IDs; all labels/slugs come from the closed taxonomy.
No free synonyms or new tags are generated.

The cards display a localized title, summary, original image, localized image alt,
category, tags and an explicit full-text language label. Images may contain Portuguese text.
Cards for summary-only entries link directly to the Portuguese original. Existing complete
published translations keep their EN/ES primary links and also offer the Portuguese original.
No redirect based on language or location is performed. Browser translation is optional reader action.

## Routes and SEO

- `/en` and `/es`: discovery catalogs, search and category/tag filters.
- Existing `/en/category/<slug>`, `/en/tag/<slug>`, `/es/categoria/<slug>` and
  `/es/tema/<slug>` now browse localized discovery entries.
- Portuguese article/category/tag URLs remain unchanged.
- Complete article translations keep their existing canonical, hreflang and RSS entries.
- Discovery collections have self canonicals and localized title/description/Open Graph.
  They do not claim hreflang equivalence with full articles or PT collection pages.
  Portuguese taxonomy heads no longer advertise partial/full-text equivalence to discovery pages.
- Clean catalogs are indexable with at least two entries; filtered searches are noindex/follow
  and canonicalize to the clean catalog. Non-production environments remain noindex/nofollow.
- Categories need one article to be indexable. Tags need two. One-entry tags remain
  noindex/follow, empty tags return 404, empty categories remain noindex/follow.
  Only eligible clean pages enter sitemap. No hypothetical translated article URLs are created.
- EN/ES RSS feeds remain full published translations only, never mislabeled summary feeds.

## Preview and validation

Local development: `bun run dev --host 0.0.0.0 --port 8095 --strictPort`.
Open `http://localhost:8095/en` and `http://localhost:8095/es` from Windows.
Review also `/en/category/energy`, `/es/tema/potencia` and a filtered search.
The integrated browser failed to initialize; Linux Chromium lacked libnspr4.
The existing Windows Chrome plus bundled Playwright successfully rendered both catalogs at
1440x900, 768x1024, 390x844 and 360x800: HTTP 200, 33 cards each, correct document language,
self canonical, no horizontal overflow and no JavaScript page errors. Captures are local only,
not approved reference baselines. No claim of human editorial approval is made.

## Publication preparation

Review only discovery modules/data, the catalog/card/topic integration, collection SEO,
sitemap integration, focused regression changes and this document. Preserve all other work.
Do not stage artifacts, private state, credentials, generated protected production config,
or the four unrelated untracked documents.

Use a normal PR from `codex/international-discovery`, requiring `quality` and `visual`
before merge. No force-push or history rewrite. Run the existing manual production procedure
from the integrated clean commit: content validation, production build, official production
configuration/comparison/dry-run, deploy with `--keep-vars`, and production read-only smoke.
Use the existing protected configuration and legitimate deployment authentication;
these showcases do not need the new automatic-I18N Environment secrets.
Keep both automation flags false before and after publication. No production deploy was
performed while preparing these pages. Validate catalog/category/tag/filter HTML, sitemap,
RSS, original PT links and existing full EN/ES article pages after any authorized deployment.

## Final local evidence

- Focused discovery/taxonomy/i18n regressions: 23 passed.
- Related isolated checkout/legacy simulation regressions: 16 passed.
- Final full suite: 1,179 passed, zero failures (132 files); unchanged timeouts.
- Typecheck, lint of all public tracked TypeScript plus new files, content validation,
  production build and git diff --check passed. Private directories are outside lint inputs.
- Eight rendered viewport/locale combinations passed; desktop and narrow mobile captures
  were inspected. Twelve SSR HTTP checks passed in the Vite preview, including filters,
  collections, existing PT/EN/ES article pages and unknown-tag 404. Preview stays noindex.
- Production sitemap/robots/canonical/RSS semantics were tested offline with indexing enabled.
- SHA-256 preservation: all 58 protected files identical, including ledger/head, originals,
  translated MDX and the four unrelated local documents.
- Both remote activation flags remained false. No inference, commit, push or deploy executed.

The first full run had one integration fixture missing new untracked modules and a legacy
5-second mocked-test timeout. The fixture inventory was completed; the affected tests and
full suite then passed without increasing the timeout or changing translation behavior.

### Compiled Worker preview limitation

The production build succeeded. Starting its generated Worker locally failed because the
installed workerd supports compatibility dates only through 2026-07-15, while the generated
preview config requires 2026-10-26. No dependency was installed and no compatibility date
was reduced. Vite SSR preview was restored on port 8095. A smoke against the compiled Worker
remains pending a compatible local runtime or the official deployment-validation environment.
Do not describe the Vite check as a successful compiled-Worker smoke. CI has not yet been
requested for this local branch; required quality/visual checks must pass before integration.

## Selective publication inventory

- `docs/INTERNATIONAL_DISCOVERY.md`
- `scripts/i18n-operations/policy-cycle.test.ts`
- `src/components/article/DiscoveryCard.tsx`
- `src/components/article/TaxonomyPage.tsx`
- `src/components/article/TranslationCatalog.tsx`
- `src/content/discovery-catalog.ts`
- `src/content/discovery.test.ts`
- `src/content/discovery.ts`
- `src/content/i18n.ts`
- `src/content/taxonomy-localization.test.tsx`
- `src/content/taxonomy-topics.ts`
- `src/data/discovery-1.ts`
- `src/data/discovery-2.ts`
- `src/lib/discovery-seo.ts`
- `src/lib/distribution.ts`
- `src/lib/taxonomy-route.ts`
- `src/lib/taxonomy-seo.ts`
- `src/routes/$language.tsx`

## Authorized release validation decision

The owner authorized publication on 2026-10-29. The local workerd date mismatch is
a preview-runtime limitation, not a successful compiled-Worker smoke. Do not reduce
compatibility_date, add dependencies solely to bypass it, or label Vite as workerd.
For this release, use the existing official production configuration comparison and
Wrangler deployment dry-run as the pre-deploy artifact/configuration verification,
plus the mandatory read-only production smoke and discovery-specific HTTP checks
on Cloudflare’s actual runtime after deployment. Local visual/SSR tests and the
full suite remain complementary evidence. Required quality/visual CI must pass
before normal merge; deployment and smoke failures stop the release.
Both continuous-translation flags remain false throughout. No inference is needed.
