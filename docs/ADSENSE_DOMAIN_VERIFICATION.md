# AdSense domain identification — 2026-10-31

## Scope

Publisher: `ca-pub-2626435516434249` (public publisher identifier, not a credential).
The existing google-adsense-account meta remains exactly once. The root head also
receives the supplied async script through TanStack HeadContent, exactly once in
production SSR, including PT home/articles and EN/ES discovery/complete editions.
Crossorigin is anonymous; no ad units, slot IDs, adsbygoogle.push calls, Auto ads
configuration or replacement translation controls are added. No AdSense account
settings are changed. Script loading is not domain approval or creative delivery.
The same loader can support Auto ads if configured externally; this change does
not turn them on in Google's dashboard or assert their dashboard state.

Preview/test builds never render the script or allow these Google origins in CSP.
Existing Adsterra isolation, public content, SEO, sitemap, RSS, robots, financial
state, D1, Secrets and disabled I18N flags remain unchanged.

## Official guidance and restricted policy

Sources consulted 2026-10-31:

- https://support.google.com/adsense/answer/9274019?hl=en
- https://support.google.com/adsense/answer/16283098?hl=en-GB

Google places the loader in head and documents nonce-based strict CSP for full
ad-serving integration. Google does not provide a stable exhaustive hostname
allowlist and warns that restrictive policies can need later updates. This
verification-only change does not claim permanent compatibility with all ad
formats and does not migrate the portal to a nonce/strict-dynamic policy.

Keep enforcing CSP. No wildcard, blanket https/http source, unsafe-eval, new
unsafe-inline permission or report-only downgrade is introduced. Preserve all
other directives. Only exact HTTPS origins observed in the actual SDK bootstrap
are added in production, scoped to their observed resource type:

| Directive   | Origin                                | Observed SDK resource                        |
| ----------- | ------------------------------------- | -------------------------------------------- |
| script-src  | https://pagead2.googlesyndication.com | supplied loader and managed show_ads_impl.js |
| script-src  | https://ep2.adtrafficquality.google   | sodar/sodar2.js traffic-quality bootstrap    |
| connect-src | https://ep1.adtrafficquality.google   | getconfig/sodar                              |
| frame-src   | https://googleads.g.doubleclick.net   | technical zero-sized bootstrap frames        |
| frame-src   | https://ep2.adtrafficquality.google   | traffic-quality technical frame              |
| frame-src   | https://www.google.com                | recaptcha technical bootstrap frame          |
| img-src     | https://ep1.adtrafficquality.google   | pagead/sodar measurement pixel               |

These runtime observations are primary evidence from the supplied Google loader,
not a purported official static allowlist. Future ad-serving or new Google
resources require separate review; never automatically allow every reported host.
The sandbox and dedicated CSP of the existing Adsterra iframe remain intact.

## Validation method and limitations

Offline tests cover production enablement, preview disablement, the exact URL,
async/CORS fields, strict origin scoping and preserved unrelated restrictions.
The existing compiled SSR smoke checks the actual script tags in head and body,
not URL strings inside hydration data. It rejects duplicate loaders and explicit
ins.adsbygoogle markup and checks both production and non-production behavior.

Controlled local browser loads use public compiled HTML/assets under the portal's
public origin via Playwright routing. Production is not modified by this local
harness. No ad click, repeated-reload loop or revenue simulation is performed.
Request queries and session identifiers are omitted from saved diagnostics.
SDK-generated zero-sized instrumentation is distinguished from ad units authored
by the portal and is not evidence of a visible creative.

Initial script-only CSP loaded the SDK with HTTP 200 and a single head tag but
blocked Google's bootstrap frame/connection. Allowing only these resources exposed
the additional sodar2 script and technical frames. Each observed origin was then
scoped to the applicable script-src/frame-src directive. A separate
baseline on the unchanged live site confirmed an existing script-src/eval violation
from the portal's schemas bundle. Unsafe-eval stays blocked; do not misattribute
that existing event to AdSense or claim the portal has no CSP events at all.

Required release: focused/full tests, typecheck, lint, production build, compiled
SSR smoke, protected-file SHA-256 comparison, normal PR with quality/visual gates,
then the official production config/check/dry-run/deploy --keep-vars workflow.
After deployment verify the real loader, single head tag, public pages, CSP,
distribution endpoints, responsive layout and disabled I18N flags. Do not claim
AdSense approval, ad eligibility or observed revenue from successful SDK loading.

## Observed local result

Full suite: 1,183 passed, zero failures. Typecheck, lint, content validation,
production build and compiled SSR smoke passed. Focused CSP tests passed after
each exact-origin adjustment. Final controlled Chrome observation: one loader in
head and DOM, SDK loaded, HTTP 200/204 bootstrap responses, no Google CSP blocks or
JavaScript page errors. Only the independently reproduced preexisting schemas
eval CSP event remained. The SDK inserted hidden zero-sized instrumentation, not
a visible creative. At 1440, 768, 390 and 360 pixels there was no horizontal overflow.
This verifies technical identification loading, not AdSense approval.
