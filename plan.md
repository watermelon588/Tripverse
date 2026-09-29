# TripVerse Plan: Trip Studio, Sketchbook, guide characters and exports

_Written 2026-09-28 from the planning discussion. Seven build sessions, each medium to hard and each leaving the app working. The last section lists future work that is deliberately out of scope._

## The idea in one paragraph

You plan in the **chat**, which stays as it is. As soon as a plan exists, a small **trip preview card** in the chat opens the **Trip Studio**: a dedicated page for the trip. The studio holds the **Sketchbook** (hand-drawn pages, drawn live by an anime guide character), the **Map**, the **3D route view**, plus **weather, holidays, budget** and **one-click exports** (PDF, calendar, maps). Moving between the chat and the studio is one continuous motion: the preview card grows into the studio and shrinks back. So it feels like one app with rooms, not two apps. The guide characters in `frontend/public/pfp/` are the "uncle who's been to Japan five times". They pop in, hold the pen, react while thinking, and sketch your plan on paper.

## Decisions from the discussion

| Topic | Decision |
|---|---|
| Where the 3D view, map and sketch live | A **dedicated Trip Studio page**, not the crowded side panel. The chat keeps a small preview card that leads there. |
| Feel | Seamless and smooth, one app with different parts: shared-element transitions (GSAP Flip), the same design system, and the chat reachable from inside the studio. |
| User drawing on the sketch | **Future version.** The app draws for now. Excalidraw editing is in the Future section. |
| PDF | **One-click file download** (no print dialog). |
| Trip brief | Add **start date**, keep **number of days**, and collect everything else needed to start the trip (see Session 1). |
| Commercial use | Built as a portfolio showpiece first, but kept commercial-ready: use only commercial-safe APIs by default and track anything that would block a launch (see "Commercial readiness"). |
| "Sketched with Uncle Raj" | Dropped. **Anime guide characters** from `frontend/public/pfp/` guide the user and do the drawing, with GSAP motion throughout. |

## Research: what we'll use (all free)

| Need | Pick | License / cost | Why |
|---|---|---|---|
| Hand-drawn shapes | [Rough.js](https://github.com/rough-stuff/rough) | MIT, under 9 kB | Sketchy lines, boxes, circles and fills. Outputs SVG, so pages animate, print and export as vectors. |
| Freehand pen marks | [perfect-freehand](https://github.com/steveruizok/perfect-freehand) | MIT | Pressure-style underlines, circles and ticks, like a real pen. |
| Motion | [GSAP](https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/) (already installed) with **DrawSVG, Flip, MorphSVG, SplitText, MotionPath** | Free including commercial use since April 2025 | DrawSVG inks the strokes, Flip morphs the chat card into the studio, MotionPath moves the character's pen along the route, SplitText writes the handwriting. |
| Handwriting font | [Excalifont](https://plus.excalidraw.com/excalifont) (self-hosted) + Caveat (Google Fonts) | OFL-1.1 | Needs a Japanese fallback (Xiaolai, OFL, or Noto Sans JP subset). |
| Doodle icons | [Doodle Icons](https://khushmeen.com/icons.html) + CC0 fills from [SVG Repo](https://www.svgrepo.com/) | CC0 | Ship about 30 icons as one SVG sprite. |
| One-click PDF | [jsPDF](https://www.npmjs.com/package/jspdf) + [svg2pdf.js](https://github.com/yWorks/svg2pdf.js) | MIT | Every PDF page is an SVG we already lay out, so the output is vector with embedded fonts. No server-side browser needed. |
| Holidays | [Nager.Date](https://nagerholidays.com/Api) | Free, no key | Flags days when places may be closed or packed. |
| Weather | [MET Norway Locationforecast](https://api.met.no/doc/TermsOfService) | Free including commercial use, CC BY 4.0 | Needs a `User-Agent` header, caching and attribution. |
| Currency | [Frankfurter](https://frankfurter.dev/) | Free, no key | Clearly labeled "≈ ₹" conversions next to local prices. |
| Calendar / map files | Hand-written ICS, GPX and KML plus Google Maps URLs | — | About 20 lines each. No dependency. |

Rejected:
- **tldraw:** needs a [production license key](https://tldraw.dev/sdk-features/license-key), and the hobby tier shows a watermark.
- **Open-Meteo:** the free tier is [non-commercial only](https://open-meteo.com/en/terms).

## Architecture decisions

1. **One trip document for everything.** `GET /api/trips/{id}/document` returns a normalized trip:
   - brief: dates, travelers, budget, currency, comfort, pace, preferences, guide character
   - days: base, items with time of day, category, cost, tip and source
   - legs, budget summary, and enrichment (weather, holidays, exchange rate) with attribution

   It's built from the `copilot` state (build with the agent) or from the itinerary graph plus a per-day extraction (one-shot). The studio, sketch, PDF and every export read only this document, so they can't disagree.
2. **Trip Studio is its own route** (`/trips/:id`). It is lazy-loaded so the chat stays fast. The existing 3D and map components move there and keep their owner, the map session.
3. **Lay out once, render many.** A pure `layoutSketch(document)` produces a `SketchScene` (pages of shapes, arrows, labels, icons, notes, with stable ids). It is rendered by:
   - the live Rough.js SVG view
   - the PDF (SVG pages through svg2pdf)
   - PNG/SVG image downloads
   - later, the Excalidraw editor
4. **Live everywhere.** The studio listens to the same `graph` and `copilot` stream events the chat already gets. When the plan changes, only new sketch elements ink in, and the guide character reacts.
5. **Enrichment is server-side and cached,** with a graceful fallback: if an API fails, that feature quietly disappears and nothing breaks. Attribution travels with the data into the studio and the PDF.
6. **Motion has one owner per surface:**
   - route transitions: the existing `RouteCurtain` plus GSAP Flip for the card-to-studio morph
   - sketch drawing: one GSAP timeline per page
   - characters: a small state machine (idle, drawing, thinking, celebrating, confused)

   `prefers-reduced-motion` turns all of it into instant states.

## Build order (both sessions' work, agreed 2026-09-28)

✅ done · ⏭️ next · unmarked = not started. Also done before this plan existed: the build-with-the-agent mode, the budget planner, live streaming, and the `/guide` page (see git history).

1. ✅ **Session 1:** trip brief v2 + trip document. *Done 2026-09-28.*
2. ✅ **Spatial S0:** map session makes the 3D and map views embeddable. *Done 2026-09-28.*
3. ✅ **Session 2:** Trip Studio page + hand-off. *Checkpoint 1*. *Done 2026-09-28: `/trips/:id` studio, chat preview card with photo strip, GSAP Flip card→studio morph, chat drawer inside the studio.*
4. ✅ **Spatial S1:** place photos. *Done 2026-09-28 (photo strip ready for Session 2's preview card).*
5. ✅ **Session 3:** sketchbook engine. *Done 2026-09-29: Sketch tab in the studio (overview + a page per day), Rough.js pages, sticky notes, stamps, receipt, highlights.*
6. ✅ **Session 4:** guide characters + motion. *Done 2026-09-29: the guide draws each sketch page with a pen, redraws only what changed while the agent works, and is the same character in the chat.* Next: the PDF (Session 6). *Checkpoint 2*. **Spatial S2** ("Around here") runs alongside Sessions 3–4.
7. ✅ **Session 5:** weather, holidays, currency. *Done 2026-09-28 (built ahead of Sessions 3–4). `<TripConditions>` is mounted in the studio's Details window (by the map session); the sketch's weather doodles move to Session 3.*
8. **Spatial S3:** season-aware recommendations. *Climate tips done early (2026-09-28); the forecast and agent prompts follow Session 5.*
9. **Session 6:** exports. *Checkpoint 3*.
   - ✅ Calendar, Google Maps, GPX/KML, budget CSV and JSON exporters, plus the Export menu. *Done 2026-09-28; the menu sits next to Budget in the studio's top bar.*
   - PDF: not started. It's built from Session 3's sketch pages and plugs into the menu's `pdf` slot.
10. **Session 7:** polish and the one-time docs pass. The docs pass also covers the Spatial features.

Sessions 1–7 are owned by the build-with-agent session. The Spatial sessions are owned by the map session, and their details are at the end of this file. Where one touches the other's files, message first.

## Sessions

Each session is roughly one long working session: backend + frontend + tests + a browser check.

### Session 1: Trip brief v2 and the trip document
**Status: done (2026-09-28).**
- The brief fields live in the validated `planning_preferences` (no migration).
- Budget and currency go to the ledger.
- The agent reads getting around, party size and comfort; costs scale with the group.
- The one-shot `day_plan` comes from the existing extraction call, including day-trip alternatives flagged as `option`.
- `GET /api/trips/{id}/document`; the client helper is `getTripDocument`.
- Tests are in `backend/tests/test_trip_document.py`, and the flow was checked in the browser.

**Goal:** Collect everything needed to start a trip, and expose one normalized trip shape.

- **Trip brief fields (new):**
  - start date (end date shown automatically from the number of days)
  - travelers: adults and children
  - total budget and currency (moved here from the agent setup)
  - comfort level: budget, mid-range or comfortable, which steers cost estimates
  - getting around: transit, walk, taxi or car (moved here too)
  - **your guide character**, picked from the PFP set
  - Already there: origin, destination, number of days, places, pace, interests, avoid.
- **Simpler agent setup:** with those fields in the brief, "Build with the agent" starts in one click.
- **Backend:** migration via the existing `init_db` pattern, schema validation, and the fields flow into both planners' prompts.
- **Trip document:** `GET /api/trips/{id}/document` for both modes. One-shot trips get a fast-model `day_plan` extraction (per day: base and items with time of day and category), saved next to the graph after every draft or revision. Older trips fall back to graph stops and places.

**Acceptance criteria:**
- A new trip collects all brief fields.
- Old trips without them still load and plan exactly as today.
- Both modes return the same document schema.
- `day_plan` covers each day exactly once.

**Verify:**
- pytest: migration, validation, document for both modes, and a legacy trip.
- Onboarding in the browser, then `curl` the document of a real Kyoto one-shot trip and a Tokyo agent trip.

**Files:** `backend/app/models/trip.py`, `core/database.py`, `schemas/trip.py`, new `schemas/trip_document.py`, new `services/trip_document.py`, `services/conversation.py`, `api/routes/trips.py`, `frontend/.../TripOnboardingForm.tsx`, `TripPlanningChoice.tsx`, tests.

### Session 2: Trip Studio page and the seamless hand-off
**Goal:** Move the 3D view and map out of the cramped side panel into a dedicated studio page. Getting there should feel like zooming into the same app.

- **Route** `/trips/:id` (lazy-loaded), with back and forward and deep links.
- **Layout:** a days rail on the left (Overview, D1, D2…), a center canvas with **Sketch · Map · 3D** tabs, and an info rail on the right: weather, holidays, budget glance, **Export**.
- **Chat side:** the old side panel is replaced by a compact **trip preview card** in the chat column: a mini route thumbnail, day count and budget, plus **Open studio**. It updates live as the plan changes.
- **Transition:** GSAP **Flip** morphs the preview card into the studio canvas, and the reverse on the way back. The existing `RouteCurtain` is aligned so there is no double transition. Chat scroll position, the open day and any stream in progress survive the round trip.
- **Chat inside the studio:** a collapsible chat drawer, the same conversation, so you can keep talking to the agent while looking at the map or sketch.
- **Coordination:** the map session owns `SpatialWorkspace` and friends. Agree first to move the *mount point*, not rewrite their components. The old "Route & map" button becomes "Open studio".

**Acceptance criteria:**
- Chat → studio → chat keeps all state.
- The transition runs at 60 fps on a mid laptop and is instant with reduced motion.
- 3D and map work exactly as before inside the studio.
- The studio works on phone width (tabs stack, rails collapse into sheets).

**Verify:**
- Headless frame capture of the transition.
- Browser back and forward, and a deep link straight to `/trips/:id`.
- The frontend builds and no chunk grows beyond the current lazy chunks.

**Files:** `frontend/src/App.tsx`, new `pages/TripStudio.tsx` + `styles/trip-studio.css`, new `components/create/TripPreviewCard.tsx`, `pages/CreateTrip.tsx`, `components/create/ChatWorkspace.tsx`, `components/common/RouteCurtain.tsx`. The mount of `SpatialWorkspace` is coordinated with the map session.

#### Checkpoint 1 (after Sessions 1–2): review the brief and the studio flow with you before building the sketch.

### Session 3: Sketchbook engine
**Status (2026-09-29): done.**
- `frontend/src/components/sketch/`:
  - `layout.ts`: `layoutSketch(doc)` (pure, deterministic; ids like `d3-i0-name`)
  - `render.tsx`: Rough.js seeded by element id, perfect-freehand highlights, real SVG text with `<title>`/`<desc>` alternatives
  - `SketchbookView.tsx`: follows the studio's selected day; ← → PageUp/PageDown Home End and swipe
  - `doodles.ts`, `fixtures.ts`, `types.ts`
- Mounted as the studio's **Sketch** tab, lazy loaded (52 kB JS).
- Deviations from the plan below:
  - Doodles are 25 hand-drawn 24×24 paths in `doodles.ts` (CC0, ours) rather than an SVG sprite, so Rough.js can wobble them.
  - Fonts: Caveat + Yomogi (Japanese) self-hosted through `@fontsource` (OFL) instead of Excalifont, which isn't on npm. Text widths are calibrated to Caveat (measured in the browser).
- Tests: 13 vitest tests, including Tokyo and Kyoto snapshots, no overlaps for 1–8 items a day, card text staying inside its card, 30-day trips, notes only from tips, and the receipt; 23 in total with the exporters.
- Checked in the browser: a real trip plus the fixtures, light and dark, keyboard, and 375 px (no horizontal scroll).
- **Open:**
  - portrait day pages for phones (Session 7)
  - an untimed dinner can land in the morning slot (the emptiest slot wins ties)
  - the PDF (Session 6) renders these same pages

**Goal:** The plan as hand-drawn pages.

- **Layout** (`layoutSketch`, pure and unit-tested):
  - **Overview page:** city bubbles along a wavy route; flights as dashed arcs with a plane doodle; rail and road as solid lines.
  - **Day pages:** a morning, afternoon and evening timeline with a doodle icon and handwritten name per item, and arrows labeled with a transit doodle. A title with the real date ("Day 2 · Tue 14 Oct").
  - Stable element ids.
  - A "+2 more" note when a day is too busy.
- **Renderer:** Rough.js SVG with paper texture, Excalifont with a Japanese fallback, and the CC0 doodle sprite. Page flipping works with keys and swipe.
- **Personal touch (content only, no motion yet):**
  - **margin sticky notes** with each item's traveler tip (tagged "reddit" or "quora" when sourced)
  - **preference stamps** ("no museums ✗", "loves food")
  - a **budget receipt** with the total circled in red when over
  - **perfect-freehand highlights** on must-see items

**Acceptance criteria:**
- Both demo trips render legibly in light and dark mode.
- Deterministic layout; no overlaps on 1–8 items a day; 1–30 day trips.
- Notes only show data from the trip document, never invented text.
- Text is real SVG text, so it's selectable.

**Verify:**
- Vitest layout tests plus fixture snapshots for Tokyo and Kyoto.
- Browser check in the studio's Sketch tab.

**Files:** new `frontend/src/components/sketch/{types,layout,render,notes}.ts(x)`, `SketchbookView.tsx`, `public/fonts/*`, `src/assets/doodles.svg`, CSS, and tests. Adds `roughjs`, `perfect-freehand` and `vitest`.

### Session 4: Guide characters and motion (the "wow")
**Status (2026-09-29): done.**
- `components/guide/GuideCharacter.tsx`: one portrait, five moods (idle, thinking, drawing, celebrating, confused), made from GSAP transforms plus a mood badge. Aoi keeps her two hand-made thinking frames (`thinkingFrames` in `guides.ts`).
- `components/sketch/motion.ts` (`drawPage`):
  - DrawSVG inks each outline in reading order, and the guide's pen (its portrait on a pencil) rides the first stroke with MotionPath.
  - Labels are written with a clip-path wipe (SplitText can't split SVG text).
  - Doodles pop, sticky notes slap on, stamps thud, highlights sweep.
  - A first draw is capped at 3.2 s.
- `components/sketch/live.ts`:
  - `withCopilot` folds each streamed `copilot` event into the studio document (same mapping as the backend's `_agent_days`), so the sketch updates mid-reply.
  - `diffPages` finds what's new, now that cards have name-based ids.
  - `describeChange` gives the speech bubble text, from names only.
- `SketchbookView` behavior:
  - The guide draws a page the first time you open it.
  - On a change, it flips to that day, draws only the new elements, and says so ("Added Kagurazaka to day 3.").
  - It looks confused and circles the receipt when the plan goes over budget.
  - It thinks out loud with the agent's stage while a turn runs.
  - A Redraw button replays a page.
- Chat: `GuideContext` makes every assistant avatar and name the trip's guide, including the thinking row. The dead `.tv-ava` CSS was removed.
- Receipt: the total is max(ledger projected, planned), so agent trips don't show ¥0.
- Rough.js `toPaths` dropped dashes; dashed cards and flight arcs now render dashed.
- Verified:
  - Headless Chrome captures: Day 1 draws in about 3 s, with the pen mid-word at 1.2 s.
  - A place added to a day you've already seen: the guide is on that page in 63 ms and animates only that card's name, meta and note.
  - The over-budget change: confused, and the total circled.
  - Reduced motion: every page final instantly, and the guide still.
  - 29 vitest tests pass (6 new in `live.test.ts`).
- **Deviations and open items:**
  - A one-shot draft doesn't fill in while it streams: its day plan only exists after extraction, so the pages draw when the draft lands. Streaming `day_plan` from the backend would be needed.
  - An add the agent *blocks* for budget (not added) doesn't trigger the confused state. Only a plan that actually goes over does.
  - The DevTools performance profile is still to do. By construction the tweens only touch transforms, opacity, clip-path and stroke dashes.

**Goal:** An anime guide sketches your trip live and reacts to what's happening.

- **Guide characters:** the PFP set becomes a cast with a name and personality line, picked in the brief (Session 1). The existing two-frame Miku "thinking" loop becomes the template for the states **idle, thinking, drawing, celebrating and confused**. Frames are generated from the source art with simple CSS and GSAP transforms (bob, tilt, squash), so no new art is needed.
- **Drawing the sketch:**
  - One GSAP timeline per page. **DrawSVG** inks Rough.js strokes in the order a person would draw, and **SplitText** writes the labels.
  - A pen cursor follows the strokes (**MotionPath**) with the guide's avatar "holding" it.
  - Doodles pop with a small squash, and sticky notes slap on with a tilt.
- **Live:** when the agent adds or changes a place (the `copilot` or `graph` event):
  - the guide flies to that day page and draws only the new elements
  - a speech bubble echoes the change ("Kagurazaka! great for dinner")
  - on an over-budget block the guide looks confused and circles the total
- **Chat presence:** the chosen guide replaces the generic avatar in chat messages and the thinking row, so it's the same character everywhere.
- **Reduced motion:** final states render instantly, and the characters stay still.

**Acceptance criteria:**
- A chip tap in agent mode visibly draws the new item within about 1s of the panel update, before the reply finishes.
- A one-shot draft fills in page by page while it streams.
- No layout jank: animations use transforms only, and timelines are killed on unmount.
- Reduced motion is respected.

**Verify:**
- Headless frame captures of a live turn (the method used for the map timing run).
- A performance profile in DevTools.
- Toggle reduced motion.

**Files:** new `components/sketch/motion.ts`, new `components/guide/{GuideCharacter,guides}.ts(x)`, `AssistantAvatar.tsx`, `SketchbookView.tsx`, `TripStudio.tsx`, `ChatMessage.tsx`.

#### Checkpoint 2 (after Sessions 3–4): does it feel like someone who knows the place is sketching the trip with you?

### Session 5: Weather, holidays and currency
**Status: done (2026-09-28).**
- `services/enrichment.py`: Nominatim finds each base city (1 request a second, cached forever), then MET Norway, Nager.Date and Frankfurter run in parallel, with TTL caches in the shared runtime SQLite file (forecast 1 h, holidays 30 days, rates 6 h). Failed calls are never cached, and each source hides only its own part.
- Days inside the forecast window get a real forecast. Later days get "Typical for <month>" from the map session's NASA POWER climate plus its `season_tips` rules. Forecast days have their own `forecast_tips` (rain, storms, heat, frost, with an indoor backup named from the day's plan).
- The trip document has a new `enrichment` field (weather, holidays, exchange, sources). Trips without a plan get conditions for the destination on each date.
- Build with the agent: `FACTS.conditions` (the current day in detail plus heads-ups) and a reply rule for using it. Cached, so turns stay fast; 8 s cap on a cold start.
- `ENRICHMENT_ENABLED` setting (off in tests). `tests/test_enrichment.py` has 11 tests; 145 pass in total. Live run: Kyoto/Osaka forecast, "Typical for October", Sports Day, INR→JPY; 4.6 s cold, 0.04 s cached.
- Frontend: `TripEnrichment` type, and `components/studio/TripConditions.tsx` (weather rows, heads-up, money, credits), checked in the browser in light and dark with live data. Also fixed `DocDay.date`, whose type resolved to `None`.
- Mounted in the studio's Details window, synced with the selected day (map session, 2026-09-28).
- One-shot drafts (2026-09-29): `enrichment.draft_conditions` gives the draft prompt a `conditions` block with forecast days (MET Norway, inside the window only) and public holidays, plus a CONDITIONS_TASK for using them. It runs alongside the research and is awaited together with the map session's season block (2 s cap in total). Live: a Tokyo trip over 10–15 Oct gets Sports Day; one starting tomorrow gets 4 forecast days (1.8 s cold).
- Home currency (2026-09-29): `planning_preferences.home_currency` (trip brief: "Your home currency"), used for the "≈" rates instead of the INR default.
- Sketch weather doodles: done in Session 3 (day pages read `enrichment.weather`). Nothing open.

**Goal:** The studio knows the world around your dates.

- **Backend** `services/enrichment.py` with a TTL cache:
  - **Nager.Date** holidays for the destination country and trip dates
  - **MET Norway** forecast per base city for days inside the forecast window, with the required User-Agent and caching; a "typical weather" note otherwise
  - **Frankfurter** exchange rate between the trip currency and your home currency
- **Studio info rail:** a daily weather strip, holiday warnings ("Sports Day: some museums closed, crowds likely") and budget amounts with labeled "≈ ₹" equivalents.
- **Sketch:** sun, cloud or rain doodles and a flag on holiday days, and the guide mentions them.
- **Agent:** holidays and weather go into the build-with-the-agent facts, so it can suggest indoor plans on rainy days or warn about closures.
- **Attribution** (MET Norway, Nager.Date, Frankfurter) is shown in the studio and carried into the PDF.

**Acceptance criteria:**
- An API outage or missing dates never breaks a view; the feature just hides.
- Each API is called at most once per trip per cache window.
- Attribution is visible wherever the data is shown.

**Verify:** pytest with mocked HTTP; one live call per API; a studio check on a dated Tokyo trip.

**Files:** new `backend/app/services/enrichment.py`, `services/trip_document.py`, `copilot/graph.py` (facts), studio info rail, sketch render, tests.

### Session 6: Exports (one-click PDF, calendar, maps and data)
Session 6 (non-PDF exporters): Plan dot cleanup session; PDF: build-with-agent session.

**Status (2026-09-28): everything except the PDF is done.**
- `frontend/src/lib/exporters/`:
  - `ics.ts`: an event per item, timed from its block (09:00, 13:00 and 18:00, back to back using `duration_hours`); untimed items and holidays are all-day; escaping and 75-octet folding
  - `maps.ts`: a Google Maps link per day, up to 9 stops, options left out, and no travel mode for multi-stop transit because Google ignores waypoints there
  - `gpx.ts` and `kml.ts`, with shared helpers in `points.ts`
  - `csv.ts`: the budget ledger, with formula-injection guard, a BOM, and totals
  - `download.ts`: the file names and the no-dialog download
- `components/studio/ExportMenu.tsx` + `styles/export-menu.css`: the PDF entry only shows when the `pdf` prop is passed; the calendar is disabled with a reason when there's no start date; per-day Google Maps links; status messages are announced to screen readers; Escape and clicking outside close it.
- Backend `POST /api/exports/points` (`api/routes/exports.py`, `enrichment.locate_places`) finds each place near its base with Nominatim. Places more than 60 km from their base are dropped as namesakes. Lookups are cached; a 40 s budget returns partial results, and the next call finishes from cache.
- Tests: vitest (`npm test`, 10 tests) and `tests/test_exports.py` (3); 152 backend tests pass. Live: 5 of 6 Kyoto/Osaka places located with correct coordinates ("Springfield" rejected); 9.7 s the first time, 0.1 s cached. Checked in the browser: every download, the error path, the state with no start date, and Escape.
- Mounted next to Budget in the studio's top bar. Checked in the studio at 1024 px and 390 px: the menu stays above the floating windows and doesn't overflow.
- **Open:** the PDF (`pdf` prop); importing the files into real Calendar and Organic Maps apps once (per Verify).
**Goal:** Take the trip anywhere.

**Export** menu in the studio:
- **PDF, one click.** jsPDF + svg2pdf.js assemble every page from SVG we already lay out:
  - cover: guide character, destination, dates, travelers
  - route overview sketch
  - one page per day: the sketch plus a clean text plan with times, tips and sources
  - weather and holidays, budget table, and credits and attributions

  Excalifont and a Japanese font subset are embedded (loaded only when needed) so text stays vector and selectable. Two sizes: A4 and Letter.
- **Calendar (.ics):** events per planned item using the start date and time-of-day blocks. Opens in Google or Apple Calendar.
- **Google Maps:** a directions link per day (up to 9 stops).
- **GPX / KML:** for Organic Maps, Maps.me and Google My Maps.
- **Sketch pages** as PNG or SVG. **Budget** as CSV. **Everything** as JSON (the trip document).

**Acceptance criteria:**
- The PDF downloads with no dialog, and pages are vector with selectable text and Japanese names.
- Every file opens in its target app.
- Special characters are escaped.
- Exports reflect the latest plan.

**Verify:**
- Unit tests for ICS, GPX and KML text (escaping and line folding).
- Generate each file from both demo trips, open every PDF page, and import the calendar and GPX files once.

**Files:** new `frontend/src/lib/exporters/{pdf,ics,gpx,kml,csv}.ts`, the export menu component, font assets, tests. Adds `jspdf` and `svg2pdf.js`.

#### Checkpoint 3 (after Sessions 5–6): end-to-end demo: plan → studio → live sketch → export.

### Session 7: Polish, launch readiness and the docs pass
**Goal:** Resume-ready quality, and the one-time documentation pass.

- **Performance:** lazy chunks for the studio, 3D, sketch and PDF code; initial chat bundle no bigger than today; font subsetting.
- **Accessibility:** keyboard paths through the studio tabs, day rail and export menu; sketch pages get text alternatives from the trip document; contrast in both themes.
- **Mobile:** the studio as tabs with bottom sheets, and a swipe-to-flip sketchbook.
- **Credits page:** every API, font, icon set and character credit in one place.
- **Commercial-readiness checklist** filled in (see below).
- **Docs:** per your instruction, the `/guide` page is only updated now:
  - rewrite every flow
  - extend `frontend/scripts/capture_guide.py` with studio, sketch, character and export shots
  - re-shoot, and re-read each screenshot so its caption matches

**Acceptance criteria:**
- Lighthouse performance and accessibility of at least 90 on chat and studio.
- The guide covers every current feature with fresh screenshots.

**Verify:** Lighthouse runs, a full guide re-shoot, and a mobile check at 390 px.

## Commercial readiness (keep in mind, act before any launch)

| Item | Status now | Before selling it |
|---|---|---|
| **Guide character art**: the PFP images are recognisable anime characters (e.g. Hatsune Miku, Frieren, Oshi no Ko, Chainsaw Man, Bocchi) and at least one is third-party fan art signed "@lulalang" | Fine for a personal portfolio demo | **Replace with original or commissioned art** (or properly licensed characters). The code keeps characters in one config file (`guides.ts`), so swapping them is an asset change. |
| Weather | MET Norway (commercial OK, attribution) | Keep the attribution. |
| Groq and Gemini LLM usage | Free tiers hit rate limits in testing | A paid tier or quota monitoring. |
| Fonts and icons | OFL / CC0 | Credits page (Session 7). |
| Traveler-tip sources (Reddit, Quora, TripAdvisor via web search) | Paraphrased tips plus links | Review each site's terms for commercial reuse; keep paraphrasing, never bulk-copy. |
| LangSmith | Tracing on, but the free quota is exhausted | Turn it off or move to a paid plan. |

## Future (not in these sessions)

- **Draw on the sketch yourself:** open any page in [Excalidraw](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton) (MIT, lazy-loaded). The `SketchScene` maps to element skeletons; save the user's annotations per trip and redraw them over the generated sketch; export with `exportToSvg` / `exportToBlob`.
- **Share links:** a read-only public studio link for a trip ("send the plan to your uncle").
- **Real co-planning:** two people in one trip chat, with each person's preferences merged by the agent.
- _Moved into the plan:_ Wikivoyage, Wikimedia photos and place details are now **Spatial S1–S2** (see the map session's section below).

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Moving 3D and map to a new page collides with the map session's work | High | Agree on the mount-point move before Session 2; don't touch their component internals. |
| Card-to-page transition stutters with 3D or map loading | Medium | Morph into a placeholder snapshot, then mount the heavy view after the animation. |
| One-shot `day_plan` extraction is wrong | Medium | Validate day coverage and fall back to graph stops; show approximate time-of-day labels only. |
| Japanese fonts make the PDF heavy | Medium | Load and embed the font only when the trip contains Japanese text; subset it. |
| Too much motion feels gimmicky or slows the app | Medium | Short timelines (≤ 1.5s per page), transforms only, reduced-motion path, and a review at Checkpoint 2. |
| Free API limits or downtime | Low | Server cache plus quietly hiding the feature. |
| Anime character licensing | High only if commercial | See the commercial-readiness table: swap the assets before launch. |

## Spatial sessions: places, photos and seasons (map session)

_Added 2026-09-28 by the map session, which owns the 3D view, the map and their detail panels. These sessions **promote** the "Wikivoyage and Wikimedia Commons" and "Place details" entries from the Future section above. They plug into **Session 2** (the studio hosts the views) and **Session 5** (the weather source). No new LLM calls, no paid APIs, and no booking of any kind: we only recommend places, with as many real photos as we can credit._

### Progress checklist (map session, updated 2026-09-28)

Building resumed on 2026-09-28 with Spatial S2. `[x]` = done and verified; `[ ]` = not started or waiting.

**Before the plan (route & map redesign):**
- [x] Three layouts (Atlas, Outline, Journal), each with a 3D graph and a Google map; all three kept as a user-facing switcher
- [x] Expandable stops (nearby places) and legs (waypoint segments with time, distance, cost, tolls and preference checks)
- [x] Docked, drag-resizable panel beside the chat
- [x] Streaming fix: no leftover form, no remount flash, per-frame token batching, bottom-only auto-scroll
- [x] Live pins for planned places, with a pulse on new ones; long unlabelled legs treated as flights; cached road metrics; zoom cap
- [x] Guide page text for Route & map, plus "What's new"

**Spatial S0: Studio-ready views**
- [x] `embedded` mode (no scrim, grip or close button; fills its host at every width)
- [x] Controlled `mode` + `onModeChange`
- [x] `selectedDay` + `onSelectDay`, with no feedback loop and no reset from streamed graphs
- [x] Layout decision: keep all three
- [ ] Delete the preview harness once Session 2 mounts the views

**Spatial S1: Place photos**
- [x] Backend `POST /api/places/media`: free licences only, 20 km check, SQLite cache, guests allowed, anonymous refused, 6 tests
- [x] `usePlaceMedia` hook and `creditLine`
- [x] Photos in the detail panels, Nearby, route strip, Journal timeline and map photo pins
- [x] `<TripPhotoStrip>` for the chat preview card, plus the shared `useStopCoordinates` hook
- [x] Mount the strip in `TripPreviewCard` (build-with-the-agent session, in Session 2)
- [ ] Day covers in the studio's day rail (after Session 2)
- [x] Photos on trip library cards: a thumbnail per row and a credited cover in the detail panel, looked up by destination name (done 2026-09-28)

**Spatial S2: "Around here"**
- [x] Backend `GET /api/places/around?lat&lon`: Wikivoyage listings + Wikipedia landmarks and stations, merged by Wikidata id, credited photos only, 30-day cache per ~1 km cell, guests allowed, anonymous refused, 4 tests (128 pass in total)
- [x] `<AroundHere lat lon day onAddPlace/>` in the stop detail panel: four tabs, photo or tinted monogram, distance from the stop, hours, listed price marked "may be outdated", credits
- [x] `SpatialWorkspace` `onAddPlace` prop; "Add to day N" shows only when the host passes it
- [x] Wire `onAddPlace` in the studio (Session 5/6 session, 2026-09-29):
  - Agent trips send `COPILOT_OPS {op: 'add', name, day}`.
  - One-shot trips send a chat request ("Please add X to day N."), which revises the draft.
  - The button hides while a reply is streaming.
- [x] Mount `<AroundHere>` in the studio's Details window for the selected day, centred on that day's base city from `enrichment.places` (same session; checked live on Shibuya)

**Spatial S3: Season- and weather-aware tips** (climate part pulled forward: it needs only NASA POWER and the start date)
- [x] Backend `POST /api/places/season`: NASA POWER monthly climate per ~10 km cell (cached forever), deterministic rules for rainy season, showers, cold, freezing and snow, heat and pleasant months, crossed with each stop's planned places; 6 tests (134 pass in total)
- [x] Season figure and tips in the stop panel, a season tag on every stop in the outline, journal and route strip, and a **Heads-up** list in the overview
- [x] Forecast inside the window from Session 5's MET Norway service (Session 5/6 session, 2026-09-29, after the map session ended): the studio passes `document.enrichment.weather` to `SpatialWorkspace`. A stop's first forecast day replaces its climate figure: "Rain · 18 °C · 20 mm rain", "Forecast for Thu, Oct 1 · MET Norway", with the forecast notes. The Heads-up label says "forecast" when it applies, and other stops keep "Typical for <month>".
- [x] Feed the tips to the agent: Session 5's `enrichment.py` calls `season_tips` for typical days and adds them to FACTS.conditions.
- [x] Feed the tips to the one-shot planner (map session, 2026-09-28):
  - `seasonality.trip_season` finds the destination on Wikipedia (cached forever), reads NASA POWER for every month the trip touches, and hands the draft prompt a `season` block with guidance: flexible day and indoor backups in a rainy season, off-season gardens, beaches and hikes swapped for indoor highlights in the cold, outdoor sights early or late in the heat, and one packing tip.
  - It adds no LLM call. It runs in parallel with the research and waits at most 2 s once the research is done.
  - It runs on fresh drafts only. Without a start date, the prompt is unchanged.
  - Checked live: Tokyo in June came out as rainy season, Kyoto in late January as cold through January and February, Rajasthan in May as hot, and Goa in June and July as rainy season. 4 new tests (149 pass in total).
  - Also sets the Wikimedia User-Agent to the project's repository URL (a live test hit an HTTP 429).
- [x] Heads-up in the studio: Session 5's `<TripConditions>` is mounted in the studio's Details window (map session, 2026-09-28)

**Clean-up:**
- [x] Removed the dead `.tv-spatial__*` and `.tv-routegraph*` rules from `tripverse-v2-planner.css` (113 lines to 22). Kept `.tv-spatial__loading`, `.tv-spatial__empty` and the fallback map's `.tv-routemap*`. _(✅ done 2026-09-28 by the map session)_

**Studio panels, scrollbars and spacing** (user request, 2026-09-28, map session, with Session 2's owner's go-ahead)
- [x] **App-wide scrollbars:** thin, with a token-tinted thumb in both themes (`tripverse-v2.css`, zero specificity so `scrollbar-width: none` strips still win)
- [x] **`FloatingWindow`** (`components/common/FloatingWindow.tsx` + `floating-window.css`):
  - drag the title bar to move, drag the corner grip to resize, × to close, double-click the bar to reset
  - arrow keys move, Shift + arrow keys resize
  - windows snap to edges and are clamped to the board
- [x] **Studio (Days, Details, Chat):**
  - The three windows have toggles in a toolbar beside Plan · Map · 3D, plus Reset, and the layout is remembered.
  - A window docked to a side reserves that strip, so the plan and map reflow beside it instead of hiding under it.
  - Screens up to 900 px use one bottom sheet at a time.
  - The phone header is one row.
  - Folded in Session 2's four pending fixes: the canvas is isolated so map panels can't cover windows; the phone bar no longer wraps; the traveler count comes from the brief; `data-flip-id` stays on the stage.
- [x] **The workspace's own panels:**
  - Atlas summary, details and route; Outline outline and details; Journal summary.
  - Each has a toggle in the bar and a × on the panel.
  - Atlas's floating summary and details can also be dragged (`useSpatialPanels.ts`), and the map re-centres when they're hidden.
- [x] **Checked:** 1440, 1024, 768 and 390 px, both themes, no horizontal overflow; tsc and vite build pass
- [x] Check the chat card → studio Flip morph in the real app (verified by rect sampling: card rect → full screen in ~0.7 s)

### Done so far (map session, 2026-09-28)

- **Route & map redesign:** three layouts, **Atlas**, **Outline** and **Journal**. Each has a 3D graph (geographic, helix or line layout) and a Google map with map, minimal and night styles, plus Map / Terrain / Satellite.
- **Expandable detail:** a stop opens into its nearby places. A leg opens into waypoint segments with duration, distance, cost and tolls, each showing its source (quoted, measured or estimated). Legs are checked against pace and "avoid" preferences. The logic lives in `spatialModel.ts`, and the UI in `SpatialDetail.tsx`.
- **Docked, drag-resizable panel:** the chat stays visible. Width is remembered, and double-clicking the edge toggles size.
- **Streaming fix:** forms hide while a response streams, the finished message no longer remounts (so its entrance animation doesn't replay), tokens are batched per animation frame, and auto-scroll only follows when you're at the bottom.
- **Live map pins:** every stop's planned places are pinned, and a newly added place pulses and is panned into view.
- **Fixes:** long legs with no stated mode are treated as flights; road metrics are cached across streamed preview graphs; single-stop framing is capped at zoom 14.
- **Clean-up still owed:** delete the preview harness (`frontend/spatial-preview.html`, `frontend/src/dev/`, `.claude/launch.json`) once the layout is chosen, plus the dead `.tv-spatial__*` rules in `tripverse-v2-planner.css`.

### Research: free data for places and seasons (tested live on 2026-09-28)

| Need | Pick | Cost / license | Tested result |
|---|---|---|---|
| Place photo, short description, coordinates | Wikipedia REST `page/summary/{title}` | Free, no key, browser-safe (CORS `*`). Text is CC BY-SA; the photo follows its own Commons file license | Shibuya: thumbnail, extract and coordinates in one call |
| Landmarks, stations and streets near a point | Wikipedia `generator=geosearch` + `prop=pageimages` | Same as above | **15 places within 1.5 km of Shibuya, all with photos**, in one call: Shibuya Station, Shibuya Crossing, Center Gai, Hikarie… |
| Photo credits | Wikimedia Commons `imageinfo` + `extmetadata` | Per-file license and author | Feeds the Session 7 credits page |
| Where to eat, drink, stay, see, do and shop | Wikivoyage listings (`action=parse` on the district page), with the [baturin/wikivoyage-listings](https://github.com/baturin/wikivoyage-listings) CSV dump as a fallback | CC BY-SA 4.0: paraphrase and credit, never paste | Shibuya: 10 see, 7 eat, 13 drink, 4 sleep and 8 buy, each with coordinates, hours, price, image and wikidata id |
| Seasonal climate, for trips beyond the forecast window | [NASA POWER](https://power.larc.nasa.gov/) climatology API | Free, no key. US-government data; **confirm the terms before launch** | Monthly averages per location (Tokyo: June rain 6.2 mm/day, January 2.6 mm/day) |
| Forecast inside the window | **MET Norway**, via Session 5's `services/enrichment.py` | Commercial OK, attribution | Not duplicated here |
| Everyday map | MapLibre + OpenFreeMap (already in the repo) | Free | Keeps the Google key for satellite and on-demand views |

Rejected or fallback only:
- **Open-Meteo archive:** works well (Tokyo June 2025 had 13 rain days in 30), but the free tier is non-commercial, so it's not used.
- **Openverse:** anonymous use is capped at 20 requests a minute and 200 a day. Server-side, cached fallback only.
- **Overpass (OSM parks and cafés):** timed out from this machine on three public instances. Optional later, backend-only and cached.
- **Google Places:** already capped at 12 calls a day in the backend. Replaced by the sources above.
- **OpenTripMap:** needs a key and its limits are unconfirmed. Re-check before use.

### Spatial S0: Studio-ready views (do before Session 2)
**Goal:** Let Session 2 mount the 3D view, the map and the detail panels in the studio by changing only the mount point.

> **Status (2026-09-28): done.**
> - **Layout decision:** keep all three (Atlas, Outline, Journal) as a switcher users can see. The choice is remembered per browser.
> - **Harness:** `spatial-preview.html?studio` stays as the reference mount until Session 2 ships, then gets deleted along with `src/dev/` and `.claude/launch.json`.
> - Props: `embedded`, `mode` + `onModeChange`, `selectedDay` + `onSelectDay`; `onClose` is now optional.
> - Checked in a mock studio (`spatial-preview.html?studio`) at 1280 px and 390 px:
>   - the embedded panel fills its host, with no chrome and no page overflow
>   - day rail → stop, and stop → day
>   - Day 2 then clicking the D1–3 stop keeps Day 2
>   - clicking a leg keeps the day; Esc or Overview gives `null`
>   - the host's tabs switch between 3D and Map
>   - the docked chat panel is unchanged
> - Streamed preview graphs don't reset a selection inside the chosen day.

- Add `embedded` mode to `SpatialWorkspace`: no scrim, no resize grip, no close button, and it fills its parent. The panel mode stays for the chat until Session 2 retires it.
- Controlled props: `selectedDay` and `onSelectDay`, so the studio's day rail and the map stay in sync, and `mode` (`graph` | `map`) so the studio's tabs drive it.
- Pick the final layout (Atlas, Outline or Journal) with you, then delete the other two and the preview harness.

**Acceptance criteria:**
- The studio can mount the views with no internal changes.
- The chat panel keeps working until Session 2 switches over.

**Verify:** mount in a test page at desktop and 390 px; `tsc -b`.

**Files:** `SpatialWorkspace.tsx`, `SpatialDetail.tsx`, `spatial-workspace.css`.

### Spatial S1: Place photos everywhere
**Goal:** Every stop and planned place shows a real, credited photo, including while the itinerary is streaming.

> **Status (2026-09-28): backend and map-session views done; chat surfaces waiting on Session 2.**
> - **Backend:** `POST /api/places/media` (`routes/places.py`, `services/place_media.py`, `schemas/places.py`), with `test_place_media.py` (6 tests; 124 pass in total).
>   - Free-licensed images only (`pilicense=free`). Non-free files are dropped at the credit lookup, and a match must be within 20 km of the stop.
>   - SQLite cache: hits kept forever, misses for 7 days, and failed calls never cached.
>   - Serves guests and signed-in users; refuses anonymous callers.
> - **Live check:** Shibuya Crossing, Central Kyoto (→ Kyoto), Kansai Airport (→ Kansai International Airport), Arashiyama, Hamarikyu Garden and Jaipur all matched. Springfield placed at Kyoto was rejected. First lookup about 2.4 s, cached lookup 4 ms.
> - **Frontend:** `services/placeMedia.ts` provides `usePlaceMedia` (batched, cached per session, stable between renders) and `creditLine`. Photos show in:
>   - the stop, nearby-place and leg detail panels, with a credit linking to the Commons file and a Wikipedia line
>   - the thumbnails in "Nearby", the route strip and the Journal timeline
>   - the Google map stop pins, which become photo pins
> - **Chat:** built `<TripPhotoStrip graph destination tripId onSelectStop/>` (`TripPhotoStrip.tsx`, map session's file). It shows a filmstrip of the stops with a credit under every photo, and locates stops itself through the shared `useStopCoordinates` hook (`stopLocations.ts`). Session 2 mounts it inside `TripPreviewCard`. Tested live: Rajasthan got a photo for all 4 stops.
> - **Still open:** day covers move to the studio's day rail (agreed; not in `ChatMessage.tsx`). Trip library cards come afterwards.

- **Backend** `services/place_media.py` + `POST /api/places/media` (name, coordinates) → photo URL, size, short description, Wikipedia link and credit:
  - Match by title, then accept the article **only if its coordinates are within about 5 km** of the stop, so "Central Kyoto" can't match the wrong page.
  - Cache in SQLite with no expiry (places rarely change), send a proper `User-Agent`, and look up names in batches.
- **Frontend:**
  - a cover photo for each day in the chat itinerary; the graph arrives before the text, so photos load while it streams
  - thumbnails on map pins and in the detail panels
  - stop photos in the studio's day rail (Session 2) and on trip library cards
- **Fallbacks and credits:** a tasteful gradient when no photo is found, and a small "Photo: Wikimedia Commons · author · license" credit wherever a photo is shown.

**Acceptance criteria:**
- The Kyoto and Tokyo demo trips show a photo for most stops.
- No wrong-city photos.
- Nothing blocks or jumps while streaming; photos fade in.
- At most one external lookup per place, ever.

**Verify:** pytest with mocked HTTP for the coordinate check and the cache; one live run; a browser check on a streaming one-shot trip.

**Files:** new `backend/app/services/place_media.py`, `api/routes/places.py`, `ChatMessage.tsx` (coordinate with the chat owner), `SpatialDetail.tsx`, `GoogleTripMap.tsx`, trip library card, tests.

### Spatial S2: "Around here" (see, eat, stay, landmarks and transit)
**Goal:** For any stop, a photo-rich list of what's nearby to pick from.

> **Status (2026-09-28): built by the map session; "Add to day" wiring waits on the studio host.**
> - **Backend:** `services/around_here.py`, `GET /api/places/around`, `tests/test_around_here.py` (4 tests; 128 pass in total).
>   - A new area costs at most 6 requests: two geosearches, then one batch each of Wikivoyage wikitext, Wikidata sitelinks, article lead photos and Commons credits.
>   - Listings farther than 3 km are dropped, and so are events and electoral areas.
>   - Listings with no image borrow the free lead photo of their Wikipedia article. That is the article they name, or the one their Wikidata item links to. An article with the same name counts only if it sits within 1 km.
>   - Excerpts are the listing's first sentence (at most 180 characters), credited and linked. Nothing is paraphrased, because that would need an LLM.
> - **Live check:**
>   - Shibuya: every tab filled, 5 of 12 sights with photos.
>   - Kyoto Higashiyama: 9 of 12 sights with photos.
>   - Jaipur, Hallstatt (small town) and Pushkar (small town, in the browser): all tabs filled.
>   - Food and stay rarely have free photos, so they show a tinted monogram.
> - **Frontend:** `services/aroundHere.ts` (`useAroundHere`, cached per ~1 km cell per session) and `AroundHere.tsx`, mounted under "Nearby" in the stop panel. Checked at 1400 px and 390 px with no overflow. In the harness, "Add to day 3" calls `onAddPlace('A Blue Star', 3)`.

- **Backend** `services/around_here.py` + `GET /api/places/around?lat&lon`:
  - Wikivoyage listings for the district (see, eat, drink, sleep, buy), merged with Wikipedia geosearch landmarks and stations
  - de-duplicated by wikidata id or name, with the distance from the stop
  - cached per district for 30 days
- **UI** (the studio's info rail and the stop detail panel):
  - tabs: **Things to see · Food · Stay · Landmarks & transit**
  - each card shows photo, name, a one-line paraphrased description, price range, hours and distance
  - **Add to day** uses the existing copilot operations (coordinate with the build-with-the-agent session)
- **Honesty:** no ratings or review counts (there's no free, legitimate source). Prices are shown only when Wikivoyage lists them, with a "may be outdated" note.

**Acceptance criteria:**
- Shibuya, Kyoto (Higashiyama) and one small town each return useful tabs.
- A town without a Wikivoyage page falls back to landmarks only.
- Every item is credited.

**Verify:** pytest with a Wikivoyage wikitext fixture; a browser check of **Add to day** in agent mode.

**Files:** new `backend/app/services/around_here.py`, `api/routes/places.py`, `SpatialDetail.tsx`, studio info-rail component, tests.

### Spatial S3: Season- and weather-aware recommendations
**Goal:** The plan fits the time of year. The user is warned about the rainy season, told when to pack an umbrella, and steered away from places with no fun in that season (bare gardens or closed trails in winter, beaches in the cold) toward better ones.

> **Status (2026-09-28): climate tips built by the map session; forecast and agent prompts wait for Session 5.**
> - **Backend:** `services/seasonality.py`, `POST /api/places/season` (stops with coordinates, month and planned places), `tests/test_seasonality.py` (6 tests; 134 pass in total).
>   - One NASA POWER climatology call per ~10 km cell, cached forever. It uses the monthly mean temperature and rain; POWER's max and min figures are monthly extremes, so they aren't used.
>   - **Rules:** rain of at least 5 mm/day means rainy season (umbrella, a flexible day, indoor backups); at least 3.5 means showers; under 5 °C is cold (outdoor places flagged as low season, indoor ones suggested); under 0 °C with alpine places means snow; 26 °C or more is hot (go early or late); 12–24 °C and dry is pleasant.
>   - Place keywords match at word starts only, so "Sparks" isn't read as a park.
> - **Live check:**
>   - June Tokyo: "Rainy season", pack an umbrella.
>   - January Kyoto: the bamboo grove and Kinkaku-ji flagged, Nishiki Market suggested.
>   - May Jaipur: "Do Amber Fort early or late".
>   - July Mumbai: rainy season.
>   - January Zermatt: freezing, snow note.
>   - Every figure is labelled "Typical for <month> · NASA POWER climate"; there are no forecast claims.
> - **Frontend:** `services/seasonality.ts` (`useSeason`), and `stopMonth` in `spatialModel.ts` (start date + stop day).
>   - The Season figure and tips are in the stop panel. `SeasonTag` is on every stop row, and a Heads-up list in the overview opens the stop.
>   - Without a start date, the panel asks for one in the trip brief.
>   - Checked in the harness (Rajasthan, May), at desktop and 390 px.

- **Climate facts:** NASA POWER monthly averages per base city (temperature, rainfall), cached per location forever. Inside the forecast window, use Session 5's MET Norway forecast instead. Always label which one it is: "typical for June" or "forecast".
- **Deterministic rules, no LLM call** (`spatialModel`-style, unit-tested):
  - **Rain:** a wet month means "pack an umbrella" and an indoor alternative on outdoor-heavy days; a very wet month means "rainy season, keep a flexible day".
  - **Cold:** below about 5 °C, gardens, hikes and beaches get a "low season" flag, and onsen, markets and museums a boost.
  - **Snow or heat:** a snow note for alpine places; above about 32 °C, a "go early or late" note.
  - **Place categories × season:** using the categories from S2 and the itinerary's own `category` field.
- **Agent:** the facts join Session 5's agent facts, so both planners avoid off-season places and suggest swaps inside the prompt they already make. No extra calls.
- **UI:**
  - a season badge on each day
  - a **Heads-up** list in the studio's info rail
  - notes in the stop and leg detail panels, reusing the existing preference notes (good, warn and info)
  - weather doodles in the sketch come from Session 5

**Acceptance criteria:**
- A January Japan trip flags outdoor gardens and hikes.
- A June Tokyo trip says "rainy season, pack an umbrella".
- No forecast claims beyond the forecast window.
- Every rule is covered by a unit test.

**Verify:** pytest or vitest for the rules with the Tokyo January and June fixtures; a live NASA POWER call; a studio check on a dated trip.

**Files:** new `backend/app/services/seasonality.py` (rules + NASA POWER client), `services/enrichment.py` hook (Session 5), `spatialModel.ts` notes, studio info rail, tests.

#### Checkpoint Spatial (after Spatial S1–S3): do the photos, "Around here" and season notes make the plan feel personal, and is every item credited?

### Suggested order

See **Build order** at the top: that single list is the one to follow. In short: S0 before Session 2, photos (S1) right after the studio because they're the biggest visual win, S2 alongside Sessions 3–4 because it only touches the places files, and S3 after Session 5 because it needs that session's weather service.

**Agreed interfaces with the build-with-the-agent session:**
- **Studio mount:** `<SpatialWorkspace embedded mode selectedDay onSelectDay/>`; no changes to its internals.
- **Add to day (S2):** `{op: 'add', name, day}` sent through `COPILOT_OPS` with `copilot_day`.
- **Before editing:** message that session before S1 edits `ChatMessage.tsx` and before S2 wires up **Add to day**.

### Commercial readiness and risks for the Spatial sessions

| Item | Status now | Before selling it |
|---|---|---|
| Wikipedia and Wikivoyage text | CC BY-SA 4.0 | Keep short paraphrases with a link and credit; never bulk-copy. |
| Commons photos | Each file has its own license | Show per-photo credit and feed the credits page; skip files marked non-free. |
| NASA POWER | Free US-government data | Confirm the terms and the attribution wording. |
| Google Maps key | Kept for satellite and on-demand views | Add quota monitoring, or default to MapLibre. |

| Risk | Impact | Mitigation |
|---|---|---|
| Wrong article or photo matched to a place | Medium | Coordinate-distance check, otherwise the gradient fallback. |
| Wikivoyage has no page for small towns | Medium | Fall back to geosearch landmarks only. |
| NASA POWER's grid is coarse (about 50 km) | Low | Word it as "typical" only; never give per-street claims. |
| Wikimedia rate limits | Low | Batch lookups, cache forever, send a `User-Agent`. |
