# TripVerse Plan: Trip Studio, Sketchbook, guide characters and exports

_Written 2026-09-28 from the planning discussion. Seven build sessions, each medium to hard and each leaving the app working. The last section lists future work that is deliberately out of scope._

## Next up (agreed 2026-09-30): free with a daily cap, more free providers, then deploy

_From the discussion after F1. Dropped for now: **long-term memory** (an LLM-written memory would bring back made-up facts), **bring your own key** (keeping someone else's key safely is security work we don't want yet), and **payments** (no demand signal yet; see "Later" below)._

| # | Task | Status |
|---|---|---|
| N1 | Measure tokens per call and per trip | To do (next session) |
| N2 | Chain free providers: Groq → Cerebras → Gemini → OpenRouter | To do |
| N3 | Daily allowance per traveler | To do |
| N4 | "Come back tomorrow" message + "I'd pay for more" interest button | To do |
| N5 | Short Privacy and Terms pages | To do |
| D1 | Production config (CORS, API URL, no reload, tracing off) | ✅ Ready 2026-10-02 (`render.yaml`, `vercel.json`, pinned requirements) |
| D2 | Frontend on **Vercel** (changed from Cloudflare Pages) | Ready; deploy per `DEPLOY.md` |
| D3 | Backend on **Render** (free plan sleeps; Starter doesn't) | Ready; deploy per `DEPLOY.md` |
| D4 | Domain | To do |
| D5 | Secrets on the host | To do |
| D6 | Smoke test on the live URL | To do |
| Later | Paid credits via Dodo Payments (only if N4 shows demand) | Parked |

### The problem

Every request runs on the owner's free Groq key, with Gemini as the fallback. Groq's limits are per organization, not per key: five keys on one account share one daily cap. Rough estimates from the code, **not measured yet**:

| Flow | Tokens (rough) |
|---|---|
| Full itinerary, 10 days (write + extract) | ~30–50K |
| One revision of a full itinerary | ~20–35K |
| Build with your guide, per message | ~8–12K |
| Build with your guide, a whole 10-day trip | ~300–400K |

### Tasks

- **N1. Measure.** Log prompt and completion tokens per LLM call, per node and per trip. Run one real 10-day trip each way and replace the estimates above.
- **N2. Chain free providers.** Turn the single Groq→Gemini fallback into an ordered chain, each link on its own account and free quota:
  - Groq → Cerebras (same gpt-oss models) → Gemini → OpenRouter free models.
  - Each provider maps our "main" and "fast" roles to a model known to handle the JSON steps.
  - On a rate-limit or quota error, try the next link. Remember an exhausted provider until its reset, so we don't retry it on every call.
  - Check each provider's current free limits and terms when adding it. Don't use several accounts on one provider.
- **N3. Daily allowance per traveler.** Count tokens (or turns) per `user_id` (guests: `guest_id`) per day, sized from N1 so one person can finish one trip a day. Past it, the API returns a clear "allowance used up" error instead of calling a model.
- **N4. The message at the cap:** "You've used today's free planning. Your trip is saved; come back tomorrow to continue." Plus an **"I'd pay for more"** button that only records interest (user or guest, date). That tells us whether payments are worth building.
- **N5. Short Privacy and Terms pages** (what's stored, that trip text goes to the AI providers, prices are estimates, how to delete your data), linked from the footer.

### Then: deployment

- **D1. Production config:** CORS origins from an environment variable, `VITE_API_URL` for the frontend, uvicorn without `--reload`, LangSmith tracing off.
- **D2. Frontend on Cloudflare Pages,** with a single-page-app fallback to `index.html` for `/trips/…`, `/guide` and `/explore`.
- **D3. Backend on a host that doesn't sleep** (not Render/Railway). Options:
  - Your PC + Cloudflare Tunnel (free, no card).
  - Oracle Cloud Always Free + tunnel.
  - Google Cloud Run, if the Google AI plan includes Cloud credits (check its benefits page).
- **D4. Domain:** a cheap TLD (`.xyz` / `.click`; check the renewal price), with `api.` for the backend.
- **D5. Secrets** on the host (database, LLM, Supabase, Google Maps restricted to the domain).
- **D6. Smoke test on the live URL.**

### Later, only if N4 shows demand

- **Paid credits via Dodo Payments** (UPI; verify current India terms and fees):
  - checkout
  - a verified webhook that adds credits to a ledger
  - better paid models for credit holders
  - refund, Terms and Privacy pages
- Before building it, find an LLM provider you can prepay without a card (e.g. check whether Google Cloud accepts UPI or prepaid top-ups on your account).

## Fix list: hands-on review (added 2026-09-29) — done

_Six problems found by using the app end to end. Order agreed: **F4 first** (the core agent fix), then F6 (chat layout, which shows F4's results), then F3, F5, F2 and F1 (the guide last, so its screenshots show the fixed app). Each fix ends with a real-browser check against the running app._

| # | Problem | Status |
|---|---|---|
| F4 | Changing a finished trip ("move X from day 5 to day 3") doesn't update the studio; the agent suggests instead of doing, can't be told to finalize, and makes things up. The budget is vague. | ✅ Done 2026-09-30 |
| F6 | The chat is hard to use: the transcript, your message and the suggestions don't fit on screen together; it's unclear how to change, finalize, or get to the studio and budget. | ✅ Done 2026-09-30 |
| F3 | Exports: only the JSON export works. | ✅ Done 2026-09-30 |
| F5 | The welcome is vague ("where do you want to go?", no name or greeting), and the trip brief arrives as one long form that scares people off. | ✅ Done 2026-09-30 |
| F2 | The home page still has setup-era placeholder text and screenshots. | ✅ Done 2026-09-30 |
| F1 | The `/guide` page is broken and out of date. | ✅ Done 2026-09-30 |

### F4: trip updates that actually happen (the core fix)

**What goes wrong today** (traced in the code with graphify's call graph, and confirmed in the saved conversations of the 2026-09-29 Goa trip):

*Build-with-the-agent trips:*
1. **The engine refuses your own edits.** `engine.apply_ops` blocks a move or add when the day passes its hour cap (8 h at a balanced pace) or the budget. "Move Tito's Lane to day 2" came back "day 2 is already packed", three times in a row, so the studio never changed. A cap should warn, not veto something you asked for.
2. **The interpreter has no memory of the conversation.** `interpret` sees the plan but not the last reply, so "move **it** to day 5" (meaning Club Cubana, which the agent had just offered) moved Tito's Lane instead, and "yes, do that" can't work at all.
3. **The reply claims changes that didn't happen.** The reply prompt's example opens with "Done, …", and the model wrote "Done – …" above a message saying the swap couldn't be made.

*One-shot trips:*
4. **A change request can be answered instead of made.** `_is_question` lets the intent label win: a message tagged `trip_question` or `casual_conversation` gets the answer prompt even when it says "move" or "swap". The answer prompt then offers "Want me to swap it in?", your "yes" is tagged casual, and it offers again: an endless loop where nothing is applied.
5. **The day number can be misread as the trip length.** The understanding step extracts `duration_days`; if it reads "day 3" as a 3-day trip, the trip is cut and redrafted from scratch.
6. **The budget can't be set from the chat.** Nothing extracts "my budget is ₹50,000"; the draft is rewritten around it, but the studio and budget panel never get the target.

*Both:*
7. **Nothing shows what actually changed.** The only record of a change is the model's own prose, so a wrong claim can't be caught, and there's no sign the studio was updated.
8. **Your message sometimes appears after the reply.** Both rows are written in one flush and can get the same timestamp (Windows clock), so reloading the chat can order them randomly.

**Fix:**
- *Engine:* an explicit add or move always applies; going over the day's hours or the budget becomes a warning in the change itself ("Moved Tito's Lane to day 2 · day 2 is now 11 h, over your 8 h pace"). Only your own hard rules (a "never" preference, a place you turned down) still ask first, with an **Add anyway** button.
- *Interpreter:* gets your previous message and the agent's last reply, resolves "it", "that one" and "yes" against them, and runs on the main model (this is the one decision in the turn that must be right).
- *Reply:* may only say something changed if the engine's change list says so; otherwise it says plainly that nothing changed and why.
- *One-shot routing:* an edit verb always means edit; "yes / do it / go ahead / finalize / update the studio" after an offer applies that offer (the revision prompt sees the agent's last message); a question is answered only when nothing is being changed. "It's final / save it" when nothing is pending confirms that the studio already has this version.
- *Understanding:* a day reference is never a trip length; the budget ("₹50,000", "50k INR") is extracted and saved to the budget ledger in both modes.
- *Change receipt:* every turn that edits the trip saves a `changes` list in the message payload (the engine's events in agent mode; a before/after diff of the day plan in one-shot mode). The chat shows it under the reply as a small **"Studio updated"** card, one line per change (done, warning, or not changed), with an **Open studio** button. The receipt is the source of truth, not the prose.
- *Message order:* each message gets its timestamp when it's created; older tied rows sort user-first.
- *Budget clarity:* the budget panel opens with three plain steps (set a target → suggest or enter amounts → watch "left to spend"), and budget changes from the chat appear in the receipt.

**Acceptance criteria:**
- In an agent trip, "move X to day N" moves X, even onto a full day, and the studio's Days and Plan show it after the reply.
- "Move it to day 5" right after the agent offered a place moves that place.
- In a one-shot trip, "move X from day 5 to day 3", then "yes" to any offer, both change the day plan the studio shows.
- The receipt under each reply lists exactly the changes in the saved plan.
- "My budget is 60,000 INR" sets the budget target in both modes.
- Reloaded chats show every message in the order it was sent.

**Verify:** engine and routing unit tests (moves over the cap, reference resolution input, the answer loop, day-vs-duration, budget extraction, the day-plan diff); then a real run in the browser: move a place in an agent trip and in a one-shot trip, confirm the studio updates, and reload the chat.

**Files:** `copilot/engine.py`, `copilot/graph.py`, `services/conversation.py`, `nodes/understand_user_msg_node.py`, `nodes/planning_trip_node.py`, `repositories/message.py`; frontend `ChatMessage.tsx`, `CreateTrip.tsx`, `CopilotPanel.tsx`, `BudgetWorkspace.tsx`, `tripService.ts`.

**Not in F4:** the non-streaming `POST /messages` path (the app only uses the streaming one; it keeps its old behaviour for tests), and turning one-shot edits into structured operations (only if the receipts show the rewrite path still misses changes).

**Progress (2026-09-29):** built test-first; the backend suite went from 159 to 172 tests, all passing, and the frontend type-checks with its 44 tests passing. Verified live in the browser against the running app:
- *Agent trip (Goa, 4 days):* "move the street food tour to day 2" onto a 7.6 h day now applies, with the heads-up in the receipt; "do the second one" moved the second option the agent had offered; the studio's Plan showed exactly the engine's days.
- *One-shot trip (Kyoto, 3 days):* "Can you move Nishiki Market from day 3 to day 1?" is now applied (it used to be answered as a question). "Day 3 looks packed. Is there anything you'd shift?" gets one concrete yes/no offer instead of a rewrite.
- *Found while testing, and fixed:*
  - Receipts showed the same place twice under different spellings (`Kiyomizu‑dera` with U+2011 vs `Kiyomizu-dera`, `Café` vs `Cafe`, `Kinkaku-ji (Golden Pavilion)` vs `Kinkaku-ji`). The diff now keys places by a normalized name, and a revision's extraction gets the previous plan's names to reuse.
  - The extraction model sometimes returned an empty reply, which left the studio on the old days. It now retries once and reads the JSON even with prose around it.
  - Advice questions that contain an edit verb ("should I add Nara?", "anything you'd shift?") get an answer with an offer. Requests phrased as questions ("can you…", "could you…", "what if we…", "how about…", "is it possible to…") are still edits.
- *Cost:* an agent turn now takes about 10–18 s, because the interpreter runs on the main model. That's the price of resolving "it" correctly.
- *Offer → "yes" (2026-09-30):* in a fresh Kyoto one-shot trip, "Day 1 looks packed. Is there anything you'd shift?" got "Want me to shift Kodai‑ji to Day 2?", and "yes" applied it: the receipt read "Moved Kodai-ji Temple from day 1 to day 2".

### F6: a chat you can actually use (after F4)

- The build-with-agent panel is pinned above the composer and takes most of the screen, pushing the transcript out of view. Make it collapsible (collapsed by default to a one-line day strip with the budget), so the conversation, your message and the suggestions fit together.
- A clear top bar: trip name, a budget chip ("₹12,400 of ₹60,000"), and **Open studio**, always visible once there's a plan.
- Suggestions and "Add anyway" as quick-reply chips under the latest reply, not in a separate panel.
- An empty-state hint that explains the three verbs: *ask*, *change* ("move X to day 3"), *finish*.
- Scope: the chat column only. **The studio stays as it is.** Load `impeccable`, `frontend-ui-engineering` and `emil-design-eng` first.

**Done (2026-09-30).** Measured first, at 1280×800 on an agent trip with an empty day: the transcript had 381 px (48% of the screen), the build panel 235 px (up to about 450 px on a full day), and the 340 px trip card was pinned under the latest reply, so the visible area showed the card instead of the conversation.
- **Build panel → dock.** Closed by default: one line (day stepper, places and hours, "~₹12,200 planned of ₹30,000" with its meter) plus the day's suggestions. "Day plan" opens the rest (every day, this day's places with Remove, Finish). 87 px closed instead of 235 px; the transcript went from 381 px to 529 px.
- **Trip card** sits where the plan was made (after the first plan message) instead of under every reply. Its line now says how to change things. The morph into the studio runs only when the card is on screen.
- **Header:** Open studio is the one primary button; Budget uses the wallet icon the studio uses; "Changes save to your studio" sits beside the title on wide screens.
- **Composer:** "Change the plan, or ask a question…", a Send button (Plan before there's a trip), and a hint with real examples ("move it to day 2", "my budget is 60,000").
- **A finished agent trip stays editable:** suggestions and Remove no longer disappear after Finish.
- **Found and fixed:** the header's staggered entrance tween left the theme and Budget buttons stranded 10 px high on every load. The tween is removed; a header seen on every chat switch shouldn't animate.
- **Receipt:** the 3 px coloured side border is gone (one hairline, per the design system).
- **Checked:** at 1280×800 the user's message, the whole reply with its receipt, and the suggestions are on screen together; at 375 px there is no horizontal scroll and every dock target is at least 24 px; one-shot trips, the studio's chat drawer and Open studio work; no console errors; `tsc` clean, 44 frontend tests pass, impeccable's layout scan is clean.
- **Not done:** a budget figure in the header for one-shot trips (it would need a budget fetch in the chat; the dock shows it for agent trips).

### F3: exports

Only JSON downloads today. Reproduce each entry of the studio's Export menu in the browser (calendar, Google Maps links, GPX, KML, budget CSV, PDF), read the console and network errors, and fix the root cause (likely shared, e.g. the download helper or the points request). Add a test per format where one is missing.

**Done (2026-09-30).** Every exporter already built a correct file (checked in the browser: CSV, JSON, GPX, KML and a 9-page PDF). The files were being lost on the way out:
- **Root cause: the download fired too late to count as yours.** JSON is the only export that saves inside the click. The others wait first: a first place lookup took 13 s here (the menu itself says "up to a minute"), a cold budget fetch 5.5 s, and the PDF loads its fonts. A browser only treats a download as the user's for about 5 s after the click (measured: `navigator.userActivation.isActive` was true at 1 s and false at 6 s). After that it is an "automatic download", which Chrome blocks silently once its multiple-downloads prompt has been dismissed, while the menu still said "downloaded". I couldn't see your browser block one, so this is the explanation that fits the evidence rather than something I watched happen.
- **Fix:** every export goes through one path. The menu holds the finished file; while the click is fresh it saves at once, and otherwise it says "… is ready" and shows a **Save file** button (a fresh click, which always works). A "Save it again" link stays after a normal download. The PDF returns its file to the menu instead of saving itself.
- **Calendar was a dead end:** it needs a start date, and the brief can't be edited after planning. The menu now has a "Trip starts on" date field for undated trips (`datedFrom`, with a test).
- **Found on the way: the first request after a pause failed.** The hosted database drops idle connections, and the next request died with "connection is closed" (a 500, shown by the browser as a CORS error). That can break the budget and place lookups behind an export too. The engine now checks a pooled connection before using it (`pool_pre_ping`, about 200 ms per request).
- **Checked with real clicks:** calendar from a picked date (events start on that day), PDF through the new path, and a budget fetch slowed to 6 s ends in "Budget is ready" with the Save button focused and no blocked download. 45 frontend and 172 backend tests pass.
- **Not done:** the picked start date is used for the calendar file only; it isn't saved to the trip (so weather and holidays stay undated). Saving it needs a trip-update endpoint.

### F5: a warmer start and a shorter brief

- The first message greets you by name with the time of day ("Good evening, Rohit"), says in one line what TripVerse does, and offers two or three starting points.
- The brief comes in small steps (where and when → who's going and budget → pace and interests → review) instead of one long form; the agent asks only for what's missing. Keep the existing form component for "edit details".

**Done (2026-09-30).**
- **The opening screen was never shown.** The planner has a composed welcome (portrait, headline, starter trips), but a new trip always arrives with one server greeting, and "has a message" hid the welcome. It now stays until you send something. It greets by local time and first name ("Good evening, Rohit. *Where are we going?*"; a guest gets the greeting without a name), and its paragraph says what really happens next (the old one promised to "price every segment").
- **The server's first message** uses your first name when you're signed in, and says up front that a draft needs three quick things and the rest is optional.
- **The brief is four small steps** instead of one page of 17 fields: where and how long (the only required step) → who and budget → how you travel → your guide. A progress line shows "Step 2 of 4"; each step is a question; **Skip the rest** works from step 1 and sends the brief with sensible defaults. Enter means Next, never Skip. A problem found while skipping takes you back to the step it's on. Same fields and the same submitted data, so nothing changed on the server.
- **The agent's line above the form** asks only for what it doesn't know yet ("I can start a draft for Japan for 5 days. I just need where you're travelling from.").
- **"Edit details"** keeps the one-page form, since everything is already filled in.
- **Checked in the browser:** "I want to go to Japan for 5 days" → the form opens on step 1 with Japan and 5 filled in; Skip with no origin shows the error; typing the origin and pressing Enter moves to step 2 with focus on the new question; Skip the rest saves the brief and shows the planning choice; Edit details shows all four sections. 174 backend and 45 frontend tests pass.
- **Not done:** the agent sending each step as its own chat message. The steps live in one form; doing it as separate agent turns would add a server round trip (about 5–10 s here) between every step.

### F2: home page content

Keep the design and layout. Replace placeholder copy and screenshots with what the app really does now (chat planning, build with the agent, the Trip Studio, the sketchbook, map & 3D, weather and holidays, budget, exports). New sections are allowed; nothing existing is removed. Screenshots come from real trips. Load `design-taste-frontend` and `emil-design-eng` for copy and imagery.

**Done (2026-09-30).** Same sections, same layout and components; only the words, numbers and pictures changed (`components/home/v2/content.ts` and the copy in `HeroBento`, `SectionsV2`, `SidebarV2`, `FooterV2`).
- **Copy says what the app does now:** the hero, the four steps, the capability panels, the "while it plans" agent section and the FAQ describe the chat, the two ways to plan, receipts, the studio, the sketchbook, map & 3D, budget and exports. Claims the app can't back up (pricing every segment, re-checking trains and bookings, handing over booking links) are gone.
- **Real numbers:** the hero's budget card, the agent transcript and the itinerary table come from the Kyoto trip planned for the guide (₹98,520 suggested against a ₹150,000 budget, 14 places over 3 days).
- **Real pictures:** the capability panels and the step thumbnails are crops of the guide's screenshots, cut by `frontend/scripts/home_crops.py` into `public/home/`. Re-run it after a re-shoot.
- **Footer:** dead Privacy and Terms links removed; the columns link to real pages (Explore, My trips, Sign in, the guide, Credits).
- **Planner labels made consistent with the home page:** "Open studio" (shown only once a plan exists) and "Explore destinations" in the sidebar.

### F1: the `/guide` page

Rebuild it end to end so a first-time user can learn the whole app from it: every page, how to move between them, every feature, with a fresh screenshot for each (extend `frontend/scripts/capture_guide.py`). Done last so the screenshots show F2–F6.

**Done (2026-09-30).**
- **Why it was broken:** the page's classes were `tv-guide*`, and the guide character's portrait (`guide-character.css`, added with the PFP guides) also uses `.tv-guide` / `.tv-guide__body` with `border-radius: 50%; overflow: hidden`. The whole page was clipped into an ellipse. The page is now `tv-howto*`.
- **Rewritten from one tested run:** 18 sections (how it works, finding your way around with a table of every page, starting a trip, the full itinerary, changing the plan with receipts, the studio, sketchbook, map & 3D, exports, budget, building with your guide, the day dock, rules and "Add anyway", how it all connects, phone, phrases, FAQ, what's new) and 38 screenshots, each caption checked against its picture.
- **The capture script** (`capture_guide.py`) follows the new app: the 4-step brief, receipts, offers and "yes", budget from chat, the day dock, Add anyway, the studio with the chat open, the phone, and a `pages` mode for Home, Explore, Credits and My trips. It waits for real map tiles, waits for the send button before sending (a click while a trip loads was dropped silently), and no longer dies on a websocket keepalive.
- **Bugs the run found, fixed:**
  - Building with a guide, the interpreter sometimes dropped a request that broke the traveler's own rule instead of passing it on, so there was no receipt and no Add anyway. It now always emits what was asked; the engine decides. If a change was asked for and nothing happened, the receipt says "Nothing in the plan changed".
  - Replies said "hard-avoid… blocked" and did their own (wrong) sums; they now say "you said no museums" and take totals from the planner only.
  - Preference receipts read "Rule saved: no museum" / "Noted: you like …".
  - Research on the fast model sometimes returned nothing twice, leaving the first build turn with no suggestions; the retry now uses the main model (test added).
- **Checked:** the page renders at 1440 px and 390 px with no console errors. 177 backend and 45 frontend tests pass.
- **Found by the run, fixed after:** a build-with-your-guide reply could claim a change that didn't happen (shot 17: Ootoya was added, the reply also said "I've added Omide Yokocho"). The reply now streams through `ClaimGuard` (`copilot/graph.py`): a sentence that says a place was added, moved or removed when the turn's events don't show it is dropped before it's sent; offers, questions and "I couldn't add…" are kept. The instruction also says a place you mention but didn't add is an option, never something you did. Test added. Shot 17 still shows the old reply, and its caption says so; the next re-shoot replaces it.

### After F1: the home menu and Explore (2026-09-30)

- **The home page's menu** listed the page's own sections (How it works, Destinations, Questions), which the top bar already has, plus Plan a trip, which is the button under it. It now lists pages: My trips, Explore destinations, and How to use TripVerse (the guide was unreachable from the home page except the footer).
- **Explore** said its places were "routes people have built in TripVerse" that the agent would "rebuild around your dates". The list is curated and a card only opens the planner; the copy now says that, and the hotel card no longer says the agent "puts you" in a room.

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
   - ✅ PDF, one click. *Done 2026-09-29: cover, the sketch pages as vectors, the day-by-day plan, the budget and the credits.*
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
- **PDF (2026-09-29, build-with-agent session):** `lib/exporters/pdf.ts`, `pdfPlan.ts` and `pdfFonts.ts`, lazy loaded from the Export menu (a 486 kB chunk plus the font files).
  - A4 landscape pages:
    - a cover: the guide's portrait, destination, dates, travelers
    - the sketch pages, rendered by the app's own `SketchPageSvg` and converted by svg2pdf, so they stay vectors with the theme colours baked in
    - "Day by day": time-of-day groups, tips and linked sources, weather and holidays
    - Budget: totals, costs by day, exchange rates
    - Credits: the trip's enrichment sources, the community sites, the fonts and libraries
  - Fonts:
    - Helvetica for WinAnsi text
    - Caveat for other Latin text, and for the sketches
    - Yomogi for Japanese, embedded only when the trip has Japanese text
    - The TTFs come from `@expo-google-fonts` (OFL); jsPDF subsets them.
  - Checked:
    - 7 vitest tests (`pdfPlan.test.ts`)
    - Headless Chrome through the real Export menu: a 403 KB, 10-page PDF in 1.4 s, then "PDF downloaded."
    - The Tokyo fixture PDF: text extraction finds selectable text on every page, including 嵐山 竹林の小径 and スポーツの日, and the pages render correctly.
  - The avoid stamps use × instead of ✗, which Caveat lacks. Receipts show "not costed yet" instead of ¥0.
- **Open:**
  - Letter size (A4 only for now)
  - the paper-grain filter is left out of print
  - importing the files into real Calendar and Organic Maps apps once (per Verify)
  - opening the PDF in Acrobat/Preview by hand
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

- **Performance:** lazy chunks for the studio, 3D, sketch and PDF code; initial chat bundle no bigger than today; font subsetting. *Route splitting done 2026-09-29:* every page except Home loads on demand from one `LOADERS` map in `App.tsx`, and `transitionTo` starts the download as the curtain rises. The main chunk went from 908 kB to 560 kB; the chat path is that plus a 279 kB `CreateTrip` chunk. Checked cold on every route, with the `/profile` guard and back/forward. **Open:** Supabase (about 800 kB of source, all of it in main because `AuthContext` needs it at boot), GSAP's full plugin set, and font subsetting; Lighthouse still to run.
- **Accessibility:** keyboard paths through the studio tabs, day rail and export menu; sketch pages get text alternatives from the trip document; contrast in both themes. ✅ *Done 2026-09-29 (Session 5/6 session), audited with axe-core (WCAG 2.1 A/AA) on every route of the production build, plus the build session's Lighthouse findings:*
  - Contrast: `--tv-muted` #787774 → #666562 and `--tv-faint` #9b9a97 → #72716e (light), `--tv-faint` #6f6d69 → #86847f (dark). All at least 4.5:1 on every canvas and tint; the route curtain label uses the token. The 35–44 contrast failures per page are now 0.
  - Keyboard: the Export menu focuses its first entry when opened, moves with ↑ ↓ Home End, and returns focus to its trigger on Esc; Tab away closes it. The studio tabs (roving tabindex), the day rail and the sketch pages were already reachable.
  - Chat: `role="main"` on the chat page (not in the studio drawer), a name on the icon-only "Open studio" button, markdown headings exposed as levels 2 and 3 under the page's h1, history rows as a real button with Delete beside it rather than nested, and a 24 px photo-credit target.
  - Home: the closed mobile drawer is `inert`, and the destinations rail is focusable so it scrolls from the keyboard.
  - Also: day covers and library thumbnails request 120 px Wikimedia thumbs instead of 960 px (about 5 KB instead of 214 KB each), per the build session's Lighthouse run.
  - Open: a Lighthouse re-run on the new build (owned by the Lighthouse/perf sessions); `.tv-invert` text over photos isn't auditable automatically.
- **Mobile:** the studio as tabs with bottom sheets, and a swipe-to-flip sketchbook. ✅ *Done 2026-09-29 (build-with-agent session):*
  - Portrait sketch pages for phones held upright (`layoutSketch(doc, 'portrait')`, 794×1123): time slots stack as rows, notes run along the bottom, the holiday gets its own line, and the overview's route uses 3 stops per row.
  - Every element keeps the same id in both orientations, so live drawing and the page cache don't care. The PDF stays landscape.
  - Tests cover the no-overlap, on-page and card-text checks for both orientations, plus id parity. The landscape snapshots were unchanged apart from the new `w`/`h` fields.
  - Checked at 390 px: portrait pages, no horizontal scroll, swipe and keys.
  - The chat sidebar now starts closed below 1024 px, where it's a drawer that used to cover the chat on every phone visit. A closed drawer is `inert`.
- **Lighthouse (build-with-agent session, 2026-09-29):** Lighthouse 13 on the production build, cold HTTP cache, with the demo guest seeded in localStorage (a returning visitor).
  - Before (warm cache, first pass): chat mobile 91 / desktop 98, studio mobile 86 / desktop 90 (CLS 0.184).
  - Fixes:
    - `useBoardSize` measures before first paint (studio CLS 0.184 → 0)
    - the last studio document is cached (the studio paints without waiting 1–3 s for `/document`)
    - the chat drawer starts closed on phones (chat mobile CLS 0.08 → 0.003)
    - the welcome paragraph, which is the chat's LCP element, fades in with the eyebrow instead of after the headline
    - 120 px day-cover thumbnails (Session 5/6 session)
  - Cold-cache now: accessibility 100 on chat and studio, mobile and desktop. Performance on desktop: chat 96, studio 94. On mobile, chat 62 and studio 65, held back by first paint (3.1–3.7 s: render-blocking third-party font stylesheets and the main chunk). The credits session is moving the fonts to self-hosted and measured perf 85 with them out of the critical path.
  - Best Practices is 77 wherever Wikimedia photos load (their third-party cookies).
  - **Open:** the credits session measured self-hosted fonts at mobile perf ~81 (89 with Supabase off the main chunk) but ended before landing either change. Both are still to do; then re-run Lighthouse (the cold-cache script is described above).
- **Credits page:** every API, font, icon set and character credit in one place. ✅ *Done 2026-09-29:* `/credits` (lazy, 9 kB), linked from the home footer. The list lives in `frontend/src/lib/credits.ts`; photographer names and links are derived from the Unsplash and Pexels file names, and `credits.test.ts` fails when a photo used in `src/` isn't credited. Guide portraits are labelled as unlicensed placeholder fan art. **Open:** credit `media/1st.jpg`, `3rd.jpg`, `4th.jpg`, `hero-bg.jpg` and `hero-bg-transparent.png` once their sources are known; the Fontshare Satoshi font is loaded in `index.html` but unused.
- **Commercial-readiness checklist** filled in (see below). ✅ *Done 2026-09-29:* every external host the code calls, split into "must change before selling" (character art, the DuckDuckGo HTML fallback, Open-Meteo's non-commercial geocoder, public Nominatim at scale, the openrouteservice and Google quotas, LLM tiers, LangSmith, uncredited photos) and "fine, keep the attribution".
- **Docs:** per your instruction, the `/guide` page is only updated now:
  - rewrite every flow
  - extend `frontend/scripts/capture_guide.py` with studio, sketch, character and export shots
  - re-shoot, and re-read each screenshot so its caption matches
  ✅ *Done 2026-09-29 (build-with-agent session):*
  - `/guide` has 16 sections, adding the Trip Studio, the sketchbook, Map & 3D, Export & PDF, building with your guide, "How it all connects" and "On your phone". The FAQ and What's new are updated.
  - Screenshots: 27 of them, all fresh from two real trips (Kyoto one-shot, Tokyo with Beni). Every caption was written after looking at its screenshot.
  - `capture_guide.py` now drives:
    - the brief v2 and the guide picker
    - the studio tabs, a mid-draw sketch frame, Export and the studio Budget
    - a live change drawn with the chat open
    - a 390 px phone page
  - The script waits for buttons to be enabled (disabled ones drop clicks) and gives map tiles longer to load. The old shots are deleted.
  - **Found and fixed during the shoot:** when the extraction LLM call failed (a Gemini 503), a one-shot revision saved empty days over a good day plan, emptying the studio, the sketch and the exports. `extract_itinerary` now returns `day_plan=None` when the model gave no days, and a revision keeps the previous plan (2 tests).
  - Capture lessons (also in memory):
    - any file change under `frontend/` reloads the page mid-run
    - so does Vite's first-time dependency optimisation (e.g. Excalidraw)
    - ask other sessions for a quiet window
  - **Open:** re-shoot after the mascot session's changes land (it's putting the guide characters across the app: hero, map views and avatars). One command, about 20 min.

**Acceptance criteria:**
- Lighthouse performance and accessibility of at least 90 on chat and studio.
- The guide covers every current feature with fresh screenshots.

**Verify:** Lighthouse runs, a full guide re-shoot, and a mobile check at 390 px.

## Commercial readiness (keep in mind, act before any launch)

_Filled in during Session 7 (2026-09-29) from every external host the code calls. This is a checklist, not legal advice: confirm each service's current terms before charging money._

**Must change before selling it**

| Item | Where | Status now | Before selling it |
|---|---|---|---|
| **Guide character art**: recognisable anime characters (e.g. Hatsune Miku, Frieren, Oshi no Ko, Chainsaw Man, Bocchi); at least one is fan art signed "@lulalang" | `frontend/public/pfp/`, `components/guide/guides.ts` | Labelled as placeholder art on `/credits` and in the PDF credits | **Replace with original or commissioned art** (or licensed characters). Swapping is an asset change in `guides.ts`; keep a two-frame "thinking" pair if you want Aoi's flip-book. |
| **DuckDuckGo HTML scraping**: the search fallback when Tavily fails, sent with a browser User-Agent | `planning/tools/web_search.py` | Works, but scraping the HTML endpoint is outside DuckDuckGo's terms | **Remove it**, or replace it with a licensed search API (Tavily paid tier, Brave Search API, Bing). |
| **Open-Meteo geocoding**: the browser locates stops for the map | `components/create/stopLocations.ts` | The free API is for non-commercial use | Buy the commercial Open-Meteo plan, or route lookups through the backend's Nominatim/ORS path. |
| **Nominatim (OpenStreetMap)**: place lookups for exports and enrichment | `services/enrichment.py`, `api/routes/exports.py` | Cached, rate-limited and identified with a User-Agent, which the public usage policy allows for light use | At real traffic, use a hosted geocoder (paid) or your own Nominatim. Keep "© OpenStreetMap contributors". |
| **openrouteservice**: route geometry and geocoding fallback | `services/route_metrics.py`, `services/place_geocoding.py` | Free key (daily quota) | A paid plan, or self-host ORS. |
| **Google Maps JS, Routes and Places APIs** | `GoogleTripMap.tsx`, `route_metrics.py`, `google_places.py` | Personal API key; pay-as-you-go | Billing alerts and quotas, restricted keys, and Google's terms: Places content may only be cached briefly and must be shown with Google attribution or on a Google map. |
| **LLM usage (Groq primary, Gemini fallback)** | `services/llm/` | Free tiers; 429s seen in testing | Paid tiers, per-user rate limits and spend monitoring. |
| **LangSmith tracing** | backend env | Free quota exhausted | Turn it off, or move to a paid plan. |
| **Unknown photo sources**: `media/1st.jpg`, `3rd.jpg`, `4th.jpg`, `hero-bg.jpg`, `hero-bg-transparent.png` | home page | Not credited (source unknown) | Find the source and licence, or replace them. |

**Fine for commercial use, keep the attribution**

| Item | Licence / terms | Where it's credited |
|---|---|---|
| MET Norway forecasts | CC BY 4.0 / NLOD; identify with a User-Agent | Trip details, sketch weather, PDF credits (`enrichment.sources`) |
| NASA POWER climatology | Free; attribution requested | Same |
| Nager.Date public holidays | Free API, MIT code | Same |
| Frankfurter (ECB reference rates) | Free, ECB data | Same |
| Wikipedia, Wikivoyage, Wikidata text | CC BY-SA 4.0 (share-alike if text is reproduced) | Place panels link back; keep excerpts short |
| Wikimedia Commons photos (day covers, place photos) | Per-image licence (CC BY / BY-SA / PD) | Author and licence per photo; also sets third-party cookies (Lighthouse Best Practices 77) |
| OpenFreeMap tiles | Free, OSM data (ODbL) | "© OpenStreetMap contributors" on the map |
| Unsplash / Pexels home photos | Their free licences (commercial OK) | `/credits` |
| Fonts: Caveat, Yomogi, Lato, Geist, Instrument Serif, Jockey One (OFL); Satoshi (Fontshare, unused) | OFL-1.1 / Fontshare licence | `/credits`, PDF credits |
| Code: React, GSAP (free standard licence), Three.js, MapLibre, Rough.js, perfect-freehand, jsPDF, svg2pdf.js | MIT or equivalent | `/credits` |
| Doodle icons | Drawn for TripVerse (CC0) | `/credits` |
| Traveler tips (Reddit, Quora, TripAdvisor via web search) | Paraphrased, linked to the source post | Linked beside each tip; review each site's terms, never bulk-copy |
| Supabase (auth and Postgres) | Free tier | Move to a paid plan before real traffic (the free tier pauses idle projects) |

## Future (not in these sessions)

- ✅ *Built 2026-09-29 by the Session 5/6 session: a **Draw** button on landscape sketch pages opens a lazy Excalidraw editor over the page; your strokes are saved per trip and page (`/api/trips/{id}/sketch-notes`, owner only) and drawn over the live page. Not yet in the PDF, and not on portrait (phone) pages.* Original idea:
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
- [x] Delete the preview harness once Session 2 mounts the views (Session 5/6 session, 2026-09-29): `frontend/spatial-preview.html` and `frontend/src/dev/` removed; nothing referenced them. `.claude/launch.json` is kept, because it now holds the dev, production-preview, backend and audit server configs.

**Spatial S1: Place photos**
- [x] Backend `POST /api/places/media`: free licences only, 20 km check, SQLite cache, guests allowed, anonymous refused, 6 tests
- [x] `usePlaceMedia` hook and `creditLine`
- [x] Photos in the detail panels, Nearby, route strip, Journal timeline and map photo pins
- [x] `<TripPhotoStrip>` for the chat preview card, plus the shared `useStopCoordinates` hook
- [x] Mount the strip in `TripPreviewCard` (build-with-the-agent session, in Session 2)
- [x] Day covers in the studio's day rail (Session 5/6 session, 2026-09-29, after the map session ended): `studio/dayCovers.ts` finds each day's first planned place (options skipped) near its base from `enrichment.places`, falling back to the city's photo. Each thumbnail's credit is in its hover title, with a "Photos: Wikimedia Commons" line under the list. Live: Fushimi Inari-taisha, Kinkaku-ji, and Osaka for a day with no places; an unlocated base gets no photo.
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
- **Clean-up:** done 2026-09-29. The preview harness is deleted (`.claude/launch.json` is kept for the dev servers), and the remaining `.tv-spatial__*` rules (`__loading`, `__empty`) are all used by `SpatialWorkspace`.

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
