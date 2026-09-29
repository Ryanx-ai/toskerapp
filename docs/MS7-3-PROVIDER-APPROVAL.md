# MS7.3 — Development provider decision and credential gate

## Bounded canonical configuration — founder approval, 2026-09-29

Founder explicitly approved assigning the existing separate credentials to Vercel Production for `pangea6/tosker.app`, canonical `toskerapp.vercel.app`, solely for MS7.3 founder review. Both assignments succeeded through CLI stdin with output suppressed: `GEOAPIFY_SEARCH_KEY` is a Production **Secret**; `NEXT_PUBLIC_GEOAPIFY_MAP_KEY` is Production **Config** (intentionally public Map renderer key). Metadata confirms separate Development assignments remain; no Preview assignment was added. Local Development files were not overwritten. No account, key, paid resource, billing or plan change.

At founder request, added only the browser key's strict HTTPS canonical Referer rule `^https://toskerapp\.vercel\.app(?:/.*)?$`. Existing localhost/127.0.0.1 rules remain. Provider UI exposes Referer/IP/Origin restrictions, not an API-specific allowlist here; no unsupported API restriction is claimed. Origin/IP/CORS settings and server key settings were unchanged. Credential-bearing UI text was redacted before tool output. Post-save style checks: canonical nested path **200**, localhost **200**, unrelated domain **401**, canonical-lookalike suffix domain **401**. No wildcard domain expansion. This header check does not make a browser key a secret; deployed-browser verification remains required.

Pre-release scan passed 460 source/owned files and 39 generated client/worker bundles, including exact and encoded server credentials. Rerun against the final release build after the newly requested Search cleanup. Current provider dashboard showed 20 requests / 16 credits (period includes Sep29; may lag). Free 3,000/day plan, approved bounded evaluation quotas, attribution and replaceable MapLibre/provider boundary remain intact. **This is not permanent production-provider approval or MS15 certification. No deployment is claimed by this configuration step.**

2026-09-29 · **FOUNDER APPROVED: Geoapify Free for bounded Development evaluation. Separate server/browser Development credentials configured. Search smoke and local-origin positive/negative map smoke passed; real MapLibre basemap implemented locally.**

Supersedes the earlier approval request. Founder reports creating Geoapify project **tosker** and an API key. Codex created no account/key/paid resource and changed no billing. Anonymous vendor demos were used for the comparison below; they are **not evidence that the founder-owned credential works**. The LocationIQ comparison is now stopped.

## Decision and boundaries

- Geoapify is selected for MS7.3 Development evaluation; LocationIQ is an evaluated alternative. This is reversible, not a permanent production commitment.
- MapLibre remains the renderer. Search, reverse lookup, style/tile configuration and attribution pass through replaceable provider boundaries. Canonical Tosker place UUIDs must not depend on vendor IDs. MS7.6 may reassess Geoapify, LocationIQ, Mapbox, Google or another provider against usage, coverage, rights and cost.
- **$0 authorized paid spend.** Target normal evaluation comfortably below the internal **500 credits/day** ceiling, not the vendor's 3,000-credit allowance. Review provider usage during acceptance; stop on unexpected consumption, terms or pricing. No paid upgrade, billing change, provider road routing/optimization or Live location.
- Search: query → results → user selection → preview → explicit **Add to trip** → durable shared card/pin. Never save result #1 automatically.
- Direct Pin: enable Pin → map click → temporary candidate → optional reverse lookup → recognized place, otherwise road/path/address context, otherwise coordinates → **Confirm pin / Cancel**. Never fabricate a place identity.

## Official-source comparison, checked 2026-09-29

| Concern | LocationIQ Free | Geoapify Free |
| --- | --- | --- |
| Durable output | March 2026 terms permit response-data storage forever. The 48-hour limit concerns request–response caching, **not saved Location Card fields**. No server-side tile caching. | Geocoding/reverse/Places documentation permits durable output; preserve source attribution and applicable licenses. No unrestricted rights to every returned field are implied. |
| Allowance | 5,000 requests/day, 2/sec, 60/min; one token. No Free soft-limit allowance. | 3,000 credits/day, 5 requests/sec, no credit card required. Soft quotas; terms reserve suspension/overage rights. Not a guaranteed account-wide hard cost cap. |
| Map accounting | One credit buys four vector tiles or sixteen raster tiles; static map costs one request. | Four tile requests cost one credit. Search/reverse/autocomplete each cost one. Vector tile accounting is comparable; headline quotas are not literal map sessions. |
| Renderer | Official MapLibre samples/style URLs; raster/vector street, dark and light maps. | Official MapLibre/style.json integration and raster/vector maps. Neither requires replacing MapLibre. |
| Commercial use | Free commercial apps allowed with linked provider credit. Terms prohibit data mining and competing-service development. | Commercial Development explicitly allowed. Current pricing FAQ also allows production within limits/attribution; older governing terms qualify production and invite contact. Reassess before production commitment. |
| Attribution | Linked “Search by LocationIQ.com”, underlying source credits and relevant style credits. | Linked Geoapify credit on Free, OpenStreetMap and additional source/style credits. Preserve credits on card reuse, not just the map. |
| Routing | Directions/Optimize/Matrix/Matching/Nearest; driving/walking, up to 25 coordinate pairs for relevant services. Included in Free; one successful call counts as one request. | Free routing for driving/walking/cycling and other modes. Base credits = waypoints minus one, with extra long-route charges. Availability does not authorize integration in MS7.3. |
| Privacy/retention | Policy lists usage, timestamps and IPs; no fixed API retention window located. Terms allow provider/partners/licensees to use response data to improve location services. US/EU endpoints. | Logs request body, headers, IP and timestamp; successful records generally retained no longer than 24 hours, not an absolute guarantee for every request. EU hosting and CDN subprocessors. |
| Key protection | **Conflict:** pricing marks IP/HTTP restrictions unavailable on Free; May 2022 help says Free referrer restrictions are supported. Unconfirmed, not definitively absent. One token confirmed. | Multiple project keys; documented origin/referrer/IP restrictions. Keys share project quota. CORS is not access control. Actual founder-project controls remain unverified. |

LocationIQ sources: [terms](https://locationiq.com/tos), [pricing](https://locationiq.com/pricing), [Free limits](https://help.locationiq.com/support/solutions/articles/36000369943-what-happens-when-i-go-over-my-plan-limits-), [key-help conflict](https://help.locationiq.com/support/solutions/articles/36000216109-how-to-generate-more-public-access-tokens-api-keys-), [privacy](https://locationiq.com/privacy), [attribution](https://locationiq.com/attribution), [MapLibre](https://docs.locationiq.com/docs/maps), [routing](https://docs.locationiq.com/docs/routing-api), [routing accounting](https://help.locationiq.com/support/solutions/articles/36000216101-how-are-requests-counted-under-routing-api-).

Geoapify sources: [terms, version 5, 2 February 2024](https://www.geoapify.com/terms-and-conditions/), [pricing](https://www.geoapify.com/pricing/), [credits](https://www.geoapify.com/pricing-details/), [geocoding storage](https://www.geoapify.com/geocoding-api/), [reverse storage](https://www.geoapify.com/reverse-geocoding-api/), [Places storage](https://www.geoapify.com/places-api/), [privacy](https://www.geoapify.com/privacy-policy/), [key controls](https://myprojects.geoapify.com/help/api-keys/), [MapLibre](https://apidocs.geoapify.com/docs/maps/map-tiles/), [routing](https://apidocs.geoapify.com/docs/routing/).

Storage contract: selected allowed subset only—provider/reference, name, short address, coordinates, source/license/attribution—separate from user title/note and Tosker UUID. No raw search-response archive, photos or reviews. Underlying source licenses still apply; storage permission is not a waiver of database-license obligations. The observed Geoapify HDB result used OpenAddresses attribution, so do not assume every result is exclusively OpenStreetMap. Keep private notes, Room/member IDs and chat out of provider requests; avoid query/coordinate logging.

## Public-demo observations — not configured-key smoke

Used supported anonymous [LocationIQ demo](https://locationiq.com/demo) and [Geoapify playground](https://apidocs.geoapify.com/playground/geocoding/). No vendor account/key created or extracted. Exact forward queries below used default options and no explicit country filter. This small sample does not establish overall Singapore accuracy, entrance accuracy or production latency.

Coordinates are latitude, longitude. “First” means first displayed result, not a verified best match.

| Query | LocationIQ observation | Geoapify observation |
| --- | --- | --- |
| Marina Bay Sands, Singapore | First: MBS, 10 Bayfront Avenue, 018956; **1.2836965, 103.8607226**. Also parking result. | Same first result/coordinate, accommodation.hotel; also parking result. |
| Maxwell Food Centre, Singapore | First: unrelated Clementi Ave 2 entrance, **1.315029, 103.770057**. Maxwell second: 1 Kadayanallur Street, 069184, **1.280479, 103.844660**. | First: Maxwell Food Center, 1 Kadayanallur Street, 069184, **1.280497, 103.844643**. Later low-confidence fallbacks included India/US despite “Singapore” in query. |
| Jewel Changi Airport, Singapore | First: Jewel, 78 T1 Boulevard, 819666, **1.3602243, 103.9896749**. | Same first result/coordinate. Venue match, but street differs from official Airport Boulevard address. |
| 18 Marina Gardens Drive, Singapore 018953 | First: IMBA, **1.2832826, 103.8618754**; multiple venues at address. | First: IMBA Theatre, **1.2832438, 103.8619344**; multiple venues. Not a unique Gardens entrance/identity. |
| 018953, Singapore | Museum/Bras Basah, **1.2969149, 103.8492675**. | Museum, **1.2969093143, 103.8492759143**, suburb result despite parsed postcode; confidence 1. Neither is a reliable Gardens-by-the-Bay destination. |
| Blk 1 Tanjong Pagar Plaza, Singapore 082001 | First: unrelated Blk 1 in Delta Estate, **1.292049, 103.828583**. Displayed list did not resolve requested address. | First: 1 Tanjong Pagar Plaza, 082001, **1.275689, 103.842433**, OpenAddresses, confidence 0.5. Later fallback included Pinnacle@Duxton. |
| Reverse 1.2836965, 103.8607226 | Not verified; exact-coordinate sandbox requires token. Anonymous location-emulation attempt did not produce a Singapore result; retained London default is not evidence. | MBS, 10 Bayfront Avenue, 018956, same point, distance 0. |
| Reverse 1.280497, 103.844643 | Not verified for same reason; no quality conclusion. | Maxwell Food Center, 1 Kadayanallur Street, 069184, same point, distance 0. |

Reverse points came from forward results: round-trip evidence only, **not independent manual-pin tests**. Actual-key smoke must add manually chosen road/path coordinates.

Address cross-checks: [MBS](https://www.marinabaysands.com/company-information/directions-to-marina-bay-sands.html), [Maxwell/NEA](https://www.nea.gov.sg/media/news/news/index/revision-to-service-and-conservancy-charges-for-mse-owned-markets-and-hawker-centres), [Gardens by the Bay](https://www.gardensbythebay.com.sg/en/plan-your-visit.html), [Jewel](https://www.jewelchangiairport.com/en/getting-to-jewel.html).

Observed Geoapify references (opaque vendor IDs, not Tosker IDs):

- MBS: `51667b3e1416f7594059aad55757058af43ff00103f9018322790001000000c002019203104d6172696e61204261792053616e6473` (OpenStreetMap / ODbL).
- Maxwell: `51e77283a10ef65940598e041a6cea7cf43ff00102f9014fb8d10200000000c002019203134d617877656c6c20466f6f642043656e746572e203206f70656e7374726565746d61703a76656e75653a7761792f3437323938363339` (OpenStreetMap / ODbL).
- Tanjong Pagar: `518e041a6ceaf559405901df6dde3869f43fc00203e203476f70656e6164647265737365733a616464726573733a73672f636f756e747279776964652d6164647265737365732d636f756e7472793a31616464623432323464646232363063` (returned OpenAddresses / BSD-3-Clause metadata).

Reversible selection rationale: Geoapify ranked the tested Maxwell/HDB cases better, publishes more specific retention information, documents separate restricted keys and permits durable output. LocationIQ has more daily allowance and also permits durable cards. Both have imperfect Singapore results; neither justifies auto-saving. Use **filter=countrycode:sg** for Singapore-scoped search plus appropriate Singapore/viewport bias. Bias is not a country restriction or accuracy guarantee. Country filtering cannot repair an incorrect local postcode point. Preserve ambiguity and manual confirmation.

## Secure credential handoff — completed for server search/reverse

Founder reported “Development variable saved.” Pulled linked Vercel **Development only** into ignored `.env.development.local`, permissions **0600**. `GEOAPIFY_SEARCH_KEY` exists; no public Geoapify variable. Existing `.env.local` was preserved byte-for-byte, including local-only secrets. Compared overlapping variables without printing values; no differing existing application configuration. No key printed, committed, screenshotted or placed in client code. No account/key creation, billing change, Preview/Production credential copy or deployment.

The instructions below describe the initial handoff and remain useful for recovery; **do not repeat the completed server-key creation/save/pull as if it were missing**. Current blockers are the restriction/usage confirmation and separate restricted browser map credential below.

### Historical handoff steps

At the initial handoff, source checkpoint was **a2f5b20** and no local/linked Development Geoapify variable existed. This absence is now resolved. No secure Geoapify dashboard credential-transfer connector is available; do not read/screenshot an unmasked key from the founder's browser.

One-time founder steps:

1. Geoapify MyProjects → **tosker** → **API Keys**: designate existing key for **server-side Development search/reverse**. Keep Free/billing unchanged. Do not paste the key in Chat/Codex.
2. Inspect restrictions. Do not apply browser Origin/Referrer allowlists to this server key: normal server requests do not carry those headers. IP-allowlist only a verified stable **public egress IP**, not localhost/127.0.0.1; stable egress is not established. If service allowlisting is actually offered, limit to search/geocoding/reverse. Public docs do not establish that such a control exists; do not claim configured. Report only restriction names/status.
3. Vercel → team **pangea6** → project **tosker.app** → **Settings → Environment Variables → Add**. Name **GEOAPIFY_SEARCH_KEY**; paste value directly from Geoapify into Vercel. Select **Development only**, deselect Preview/Production, save. No NEXT_PUBLIC_ prefix. Ordinary values are [encrypted at rest](https://vercel.com/docs/environment-variables/managing-environment-variables); the [non-readable Sensitive option is unavailable for Development](https://vercel.com/docs/environment-variables/sensitive-environment-variables)—do not select Production to work around that.
4. Tell Codex only **“Development variable saved”** plus restriction caveats. Codex can then safely pull via existing Vercel workflow without printing values, preserve current local secrets, and run bounded smoke. No deployment is needed for local Development.

### Key and environment policy

- Server credential never enters a client bundle. Real MapLibre tiles require a **separate browser tile/style key**, not repurposing the server secret. Browser keys are inherently visible; verify origin/referrer restrictions before use.
- Permit only actual local review origins: normally http://localhost:3000; http://127.0.0.1:3000 only if used, plus corresponding referrer paths. Verify exact provider pattern syntax; do not invent regexes or break local acceptance.
- Preview is not enabled by this handoff. Specific controlled Preview origins/keys only; never wildcard *.vercel.app.
- Canonical https://toskerapp.vercel.app is founder review, but Vercel's **Production environment scope** differs from a provider **Development plan**. Do not silently copy the credential into Production. Exact canonical origin/environment configuration belongs to the authorized release step; no permanent production-provider commitment.
- Actual project restrictions, service controls and usage are **unverified**, not “applied.” Keys share quota. Do not fabricate Origin headers or fixed IPs.

## Configured-provider smoke — actual founder Development key, 2026-09-29

Ran `scripts/smoke-ms73-geoapify.mjs --run-approved-development-smoke` once: **8 forward + 2 reverse requests, all HTTP 200**, at least 1.1 seconds between completed requests; limit 3 forward / 1 reverse; 10-second timeout, no retry. All returned points were finite and identified Singapore. Forward requests used `filter=countrycode:sg`, `bias=proximity:103.8198,1.3521`, English labels. **Estimated consumption: 10 credits** under published accounting, not a verified dashboard delta. No tile, routing, polling or application provider requests. Account-wide daily usage and actual project restrictions have not been independently verified; founder asked for non-secret usage/restriction settings.

Sanitized evidence: `/Users/ryanc/.codex/artifacts/tosker-ms73-20260929/geoapify-smoke-1790665235754.json`. Retains only selected public test fields, each provider place ID and source/license; no request URL, headers, secret, private Room/member data or raw response. Future manual script runs use a unique temporary output directory; no automatic repeat.

Coordinates below are latitude, longitude, and are **returned** points, not verified entrances.

| Query | First result / coordinates | Observed relevance and caveats |
| --- | --- | --- |
| Marina Bay Sands, Singapore | 10 Bayfront Avenue, 018956; 1.2836965, 103.8607226 | Useful hotel match; another parking result at a different point. |
| Jewel Changi Airport, Singapore | 78 T1 Boulevard, 819666; 1.3602243, 103.9896749 | Venue match; street naming still differs from official Airport Boulevard. Secondary result was a cafe. |
| Singapore Zoo, Singapore | 80 Mandai Lake Road, 729826; 1.4037076, 103.7940374 | Useful venue match; separate Entrance Plaza and bus results. Do not treat centroid as entrance. |
| Ngee Ann Polytechnic, Singapore | 535 Clementi Road, 599489; 1.3331884, 103.7746123 | Useful campus match; separate bus result. |
| Maxwell Food Centre, Singapore | Maxwell Food Center, 1 Kadayanallur Street, 069184; 1.280497, 103.844643 | Useful first match. Later Newton/Bendemeer results are unrelated fallback alternatives, confidence 0. Country filter prevented overseas results in this sample, not irrelevant local results. |
| Bukit Timah Nature Reserve, Singapore | Singapore, West Region; 1.3540779, 103.7794401 | Named protected-area result, no street address; not a verified trailhead. |
| 1 Tanjong Pagar Plaza, Singapore 082001 | Requested address; 1.275689, 103.842433 | Useful building match, OpenAddresses/BSD-3-Clause provenance, no named POI. |
| 018953, Singapore | Singapore 018953, Museum; 1.296909314, 103.849275914 | **Quality failure:** wrong Museum-area point for Gardens by the Bay despite postcode/full_match/confidence 1. Never infer accuracy from confidence alone. |
| Reverse clicked 1.2845, 103.8580 | 2 Bayfront Avenue, 018972; 1.284946, 103.858517 | Address context only, provider distance ~75.9 m. Retain clicked coordinates; no silent snap to returned building point. |
| Reverse clicked 1.3440, 103.8140 | Singapore Island Country Club (Bukit & Sime courses), 240 Sime Road, 288303; 1.3428124, 103.809206 | Area/amenity context, not verified exact identity. Returned point differs by roughly 550 m despite provider distance 0 (potential polygon containment semantics; unverified). Never use distance 0 to claim exact match or move the pin. |

All except the Tanjong Pagar result used OpenStreetMap/ODbL metadata. Provider identity is `geoapify`; exact opaque references are in sanitized evidence, not Tosker canonical IDs. Existing official-address cross-checks above apply; this is bounded Development evidence, not a benchmark or an entrance-accuracy certification.

**Outcome:** connectivity and allowed-field/provenance smoke PASS; quality is suitable only for the explicitly approved preview/confirmation evaluation, with known postcode and reverse-context failures. Do not mark all quality cases passed. Preserve exact direct-pin coordinates separately from reverse context; display useful nearby/area context as tentative, allow user title correction, and fall back to coordinates. Search results retain category/address context and require selection. No result is automatically saved.

### Historical browser credential setup — founder completed

Founder subsequently saved the exact `NEXT_PUBLIC_GEOAPIFY_MAP_KEY` name to Vercel Development; the backtick typo in the chat message was not present in the environment. Secure repull preserved `.env.local`, retained the same server credential and introduced a **different** browser credential. No other application variable changed; ignored download remains0600. Never repeat creation or copy the server key.

Bounded origin smoke (three style requests): `http://localhost:3000` →200 valid style, `http://127.0.0.1:3000` →200 valid style, `https://tosker-unapproved.example` →401. Origin and Referer were supplied together, so this proves the tested allow/deny behavior, **not which particular dashboard control enforced it**. CORS returned `*` even for the denial; CORS is not the access restriction. Real Chromium MapLibre style/source/sprite/tile/label loading subsequently passed at localhost. Preview/Production keys were not populated, and no billing/account/plan changes were made.

Founder-supplied Statistics screenshot shows **11 requests / 11 credits used across Aug29–Sep29**, all API keys, and **3,000 daily credits limit**. It is not an isolated “today” counter or a post-browser-QA usage reading. Internal ceiling stays **500/day**, target comfortably below it. The server smoke had10 estimated credits; the extra1 in the screenshot cannot be attributed with certainty. Browser tests are bounded manual checks, not polling; a later instrumented page lifecycle recorded22 provider resource requests, not an account-wide total. Do not report a precise final dashboard balance without fresh provider statistics.

Server-key dashboard restrictions/stable egress remain unverified. Server credential stays server-only and has made no additional calls since the ten-request smoke. Do not fabricate an IP allowlist or copy browser headers into server requests; reassess egress restrictions before hosted search/canonical environment setup. The tested local browser boundary is now ready; no renewed provider approval is required for the authorized local slices.

The historical setup instructions below explain the configuration; **do not create duplicate keys or pause as if the browser key were still missing**:

1. Geoapify MyProjects → **tosker → Statistics**: report today's total credits and any unexpected activity (numbers only). Expected additional consumption from this smoke is about 10 credits; dashboard usage was not read.
2. **tosker → API keys → existing server key restrictions**: report configured Allowed IPs / Allowed HTTP referrers / Allowed origins and whether service restriction controls exist, without the key. Do not add browser headers to server requests. Stable server egress is not established, so an IP restriction cannot honestly be claimed/applied yet. Free must remain selected.
3. Real browser MapLibre needs a **different browser key**. In **API keys → Create a new API key (+)**, label it `Tosker local Development maps`, restrict **Allowed origins** to `http://localhost:3000` and `http://127.0.0.1:3000` (only these local acceptance origins; no wildcard domains). If the UI only supports referrer patterns, report that before applying unverified patterns. CORS alone is not authorization. Leave existing server key unchanged.
4. Vercel → **pangea6 / tosker.app → Settings → Environment Variables → Add**: `NEXT_PUBLIC_GEOAPIFY_MAP_KEY`, value copied directly from the **new restricted browser key**, **Development only**. This browser credential is intentionally visible to browsers, unlike `GEOAPIFY_SEARCH_KEY`. Never copy the server secret into it. No Preview/Production selection or billing change. Tell Codex only that it is saved and which restrictions were applied. Local positive/negative origin tests must precede real map acceptance.

Official [key controls](https://myprojects.geoapify.com/help/api-keys/) support separate keys and origin/referrer/IP restrictions; all keys share project quota. Actual project UI/settings have not been inspected because doing so may expose the unmasked secret. No new provider decision approval is requested—these are secure configuration prerequisites under the already-approved architecture.

## Continuation

Do not repeat the completed smoke automatically. Local browser configuration and allow/deny smoke are complete. Resume the approved local slices; secure hosted-environment changes still require their exact credential/origin review, never repurposing the server key into the client.

Only after connectivity, restrictions, provenance, budget and useful/fallback behavior pass: provider boundary/real Map → schema/services → search/direct Pin → shared cards/pin synchronization → route sets/order/ghosts → planning line/local Quick order → multiplayer reconciliation → responsive Map/Places → desktop existing-Chat companion → integrated/canonical acceptance.

Each slice: implement → render → screenshot → UX review → test → checkpoint. Debounce/cancel stale search; bound results/retries; no polling; no reverse-geocoding existing pins on render; no provider calls on ordinary Chat/Board. Live remains gated. No automatic MS7.3 lock.
