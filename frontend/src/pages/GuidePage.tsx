/*
 * GuidePage — how to use TripVerse, told through one real, tested run.
 *
 * Every screenshot in /public/guide comes from `frontend/scripts/capture_guide.py`,
 * which drives the live app. When a user-facing flow changes, update the copy
 * here and re-run that script in the same change.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AppBar } from '../components/common/AppBar';
import '../styles/guide.css';

interface GuidePageProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateProfile?: () => void;
  onNavigateTrips?: () => void;
  onStartPlanning?: () => void;
}

const LAST_UPDATED = 'September 29, 2026';

const SECTIONS = [
  { id: 'overview', label: 'Two ways to plan' },
  { id: 'start', label: 'Start a trip' },
  { id: 'one-shot', label: 'One-shot itinerary' },
  { id: 'studio', label: 'The Trip Studio' },
  { id: 'sketch', label: 'The sketchbook' },
  { id: 'map', label: 'Map & 3D view' },
  { id: 'export', label: 'Export & PDF' },
  { id: 'budget', label: 'Budget planner' },
  { id: 'agent', label: 'Build with your guide' },
  { id: 'agent-days', label: 'Working day by day' },
  { id: 'agent-prefs', label: 'Preferences & budget rules' },
  { id: 'connected', label: 'How it all connects' },
  { id: 'phone', label: 'On your phone' },
  { id: 'phrases', label: 'Things you can say' },
  { id: 'faq', label: 'Questions & fixes' },
  { id: 'changes', label: "What's new" },
];

function Shot({ src, alt, children, portrait = false }: { src: string; alt: string; children: ReactNode; portrait?: boolean }) {
  return (
    <figure className={`tv-guide__shot${portrait ? ' tv-guide__shot--portrait' : ''}`}>
      <a href={`/guide/${src}.png`} target="_blank" rel="noreferrer" aria-label={`Open full-size screenshot: ${alt}`}>
        <img src={`/guide/${src}.png`} alt={alt} loading="lazy" width={portrait ? 390 : 1440} height={portrait ? 844 : 900} />
      </a>
      <figcaption>{children}</figcaption>
    </figure>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="tv-guide__steps">{children}</ol>;
}

/** Scroll to a section without a hash navigation: App treats popstate as a route change. */
function goToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', `#${id}`);
}

export function GuidePage(props: GuidePageProps) {
  const [active, setActive] = useState(SECTIONS[0].id);

  // Deep links such as /guide#budget land on their section once the page has rendered.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    // The route transition resets scroll after mount, so jump once it has settled.
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 400);
    return () => window.clearTimeout(timer);
  }, []);

  // Highlight the section being read in the contents list.
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-15% 0px -70% 0px' });
    SECTIONS.forEach(({ id }) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="tv2 tv2-app tv-guide">
      <AppBar current="guide" {...props} />
      <main className="tv-container tv-guide__main">
        <header className="tv-guide__intro">
          <span className="tv-eyebrow">Guide</span>
          <h1 className="tv-display tv-page__title">How to use <em>TripVerse.</em></h1>
          <p className="tv-lead">
            A walkthrough of the whole planner using two real trips we planned while writing this guide: a 3-day
            Kyoto trip made in one shot, and a 3-day Tokyo trip built day by day with a guide. Every screenshot is
            the live app.
          </p>
          <p className="tv-meta">Last updated {LAST_UPDATED}</p>
        </header>

        <div className="tv-guide__layout">
          <nav className="tv-guide__toc" aria-label="Guide contents">
            <span className="tv-label">CONTENTS</span>
            <ol>
              {SECTIONS.map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={(event) => { event.preventDefault(); goToSection(id); }}
                    aria-current={active === id ? 'location' : undefined}
                    className={active === id ? 'is-active' : ''}>{label}</a>
                </li>
              ))}
            </ol>
            {props.onStartPlanning && (
              <button type="button" className="tv-btn tv-btn--primary tv-btn--sm" onClick={props.onStartPlanning}>
                Open the planner
              </button>
            )}
          </nav>

          <article className="tv-guide__body">
            <section id="overview">
              <h2>Two ways to plan</h2>
              <p>
                Every trip starts the same way: tell TripVerse where you're going, then confirm a short trip brief and
                pick the guide who plans with you. After that you choose how the itinerary gets built. Both paths end in
                the same place: the <strong>Trip Studio</strong>, with the plan, a hand-drawn sketchbook, the map, a 3D
                view and one-click exports.
              </p>
              <div className="tv-guide__table" role="region" aria-label="Planning modes compared" tabIndex={0}>
                <table>
                  <thead>
                    <tr><th scope="col" /><th scope="col">One-shot itinerary</th><th scope="col">Build with your guide</th></tr>
                  </thead>
                  <tbody>
                    <tr><th scope="row">Best for</th><td>A complete first draft in about a minute</td><td>Shaping each day yourself, on a budget</td></tr>
                    <tr><th scope="row">How it works</th><td>Researches the destination, then writes every day at once</td><td>Suggests places for one day at a time; you add, remove or move them</td></tr>
                    <tr><th scope="row">Budget</th><td>Fill in the Budget planner, or let it suggest amounts</td><td>Tracked live. Additions that don't fit are blocked, with alternatives</td></tr>
                    <tr><th scope="row">Suggestions come from</th><td>Web research on your destination</td><td>Traveler posts on Reddit, Quora and TripAdvisor forums</td></tr>
                    <tr><th scope="row">Studio &amp; sketchbook</th><td>Drawn from the draft</td><td>Redrawn live as each change lands</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="start">
              <h2>Start a trip</h2>
              <Steps>
                <li>Open the <strong>Planner</strong> (<em>Plan a trip</em> in the top bar). A new trip opens with a greeting.
                  Your past trips are listed on the left; <strong>New trip</strong> starts another.</li>
                <li>Say where you want to go in the message box, as loosely or precisely as you like. For example,
                  <q>Plan 3 days in Kyoto from Delhi. I love food and old temples.</q></li>
                <li>A <strong>trip brief</strong> appears with everything it understood filled in. Check it, add the rest,
                  and pick your guide.</li>
              </Steps>
              <Shot src="01-planner-start" alt="Empty planner with the greeting and message box">
                The planner: past trips on the left, the conversation in the middle. Your guide says hello, and
                <strong> Budget</strong> sits in the top-right corner.
              </Shot>
              <Shot src="02-trip-brief" alt="Trip brief for Kyoto from Delhi: route, days, start date and travelers">
                The trip brief, pre-filled from the message: Delhi to Kyoto, 3 days. Add a <strong>Start date</strong>
                and TripVerse can plan around the weather and public holidays, and export a calendar; the line underneath
                shows the day you're back. Then who's coming and your comfort level.
              </Shot>
              <Shot src="02b-guide-picker" alt="The trip brief's travel style and guide picker">
                Further down: an optional <strong>Total budget</strong> and its currency, how you like to travel (pace,
                getting around, interests and things to avoid), and <strong>Pick your guide</strong>. Each guide has a
                one-line personality. Here it's Aoi, who then chats, sketches the trip and signs the PDF cover.
                <strong> Anything to avoid</strong> becomes a hard rule when you build with your guide.
              </Shot>
              <p>
                Press <strong>Continue to planning options</strong>. The brief is saved, and you can still change it with
                <strong> Edit details</strong> on the next screen.
              </p>
              <Shot src="03-planning-choice" alt="Planning choice card with the brief and two options">
                Choose a path. The brief card sums up your answers. <strong>Generate full itinerary</strong> writes the
                whole draft now; <strong>Build with Aoi</strong> plans it day by day with your guide.
              </Shot>
            </section>

            <section id="one-shot">
              <h2>One-shot itinerary</h2>
              <p>
                <strong>Generate full itinerary</strong> researches the destination, picks the bases worth your time,
                and streams a day-by-day plan into the chat. It takes about a minute. You'll see the stages
                (<em>Researching possible stops</em>, <em>Writing your day-by-day draft</em>) while it works. With a start
                date, the draft also takes the season, the weather forecast and public holidays into account.
              </p>
              <Shot src="04-one-shot-itinerary" alt="The generated Kyoto itinerary in the chat">
                The draft: a trip overview, then each day from morning to evening. Because the brief has dates, it opens
                with <strong>Season notes</strong> (typical October weather and what to pack) and mentions the public
                holiday during the trip.
              </Shot>
              <Shot src="05-one-shot-itinerary-end" alt="End of the itinerary and the trip card that opens the studio">
                Every draft ends with the checks worth doing and <strong>What to decide next</strong>. Below it, the trip
                card: your dates, a photo of each stop, and <strong>Open studio</strong>.
              </Shot>
              <p>
                <strong>Change it by just saying so.</strong> Ask for any edit in plain words and TripVerse revises the
                plan you already have: it says what it changed, then streams the updated itinerary. Everything you didn't
                ask about stays as it was, and the studio redraws to match.
              </p>
              <Shot src="05b-one-shot-revision" alt="The revised itinerary opening with a sentence about what changed">
                We asked <q>Can you add the Arashiyama bamboo grove on the morning of day 2?</q> The reply opens by
                saying exactly what moved (the grove early, Otagi Nenbutsu-ji to mid-morning), and the rest of the plan
                is kept.
              </Shot>
              <p>
                Questions get answers, not a rewrite. <q>Is Fushimi Inari crowded early in the morning?</q> gets a short
                reply based on your plan, with an offer to change it if you'd like. Changing the basics (<q>make it 5
                days</q>, <q>start from Mumbai instead</q>) researches the trip again and writes a fresh draft.
              </p>
            </section>

            <section id="studio">
              <h2>The Trip Studio</h2>
              <p>
                <strong>Open studio</strong> (on the trip card, or top right in the chat) turns the conversation into one
                page for the whole trip. The card grows into the studio, and <strong>← Chat</strong> takes you back. Each
                trip has its own address (<code>/trips/…</code>), so you can bookmark it.
              </p>
              <Shot src="06-studio-plan" alt="The Trip Studio on the Plan tab with the Days and Trip details windows">
                The studio on the <strong>Plan</strong> tab: a card per day with its places. <strong>Days</strong> on
                the left, <strong>Trip details</strong> on the right; the header shows the dates and travelers, with
                <strong> Budget</strong> and <strong>Export</strong> beside them.
              </Shot>
              <ul className="tv-guide__list">
                <li><strong>Tabs</strong>: <strong>Plan</strong> (the days as cards), <strong>Sketch</strong> (the
                  sketchbook), <strong>Map</strong> and <strong>3D</strong>. The arrow keys move between them.</li>
                <li><strong>Days</strong>: every day with a photo of where you sleep. Pick one and every tab follows it.
                  Hover a photo for its author and licence.</li>
                <li><strong>Trip details</strong>: the budget, your brief, the weather (a real forecast within about 10
                  days of travel, otherwise typical weather for the month), public holidays, exchange rates and
                  <strong> Around here</strong>: places near the stop you've picked.</li>
                <li><strong>Chat</strong>: the same conversation in a window, so you can keep planning while you watch
                  the plan change.</li>
              </ul>
              <p>
                The windows move, resize and close. Drag one against a side and the page makes room for it;
                <strong> Reset</strong> puts them all back.
              </p>
            </section>

            <section id="sketch">
              <h2>The sketchbook</h2>
              <p>
                <strong>Sketch</strong> draws your trip as hand-drawn pages, and your guide draws them in front of you: the
                first time you open a page, their pen inks the outlines, writes the labels and slaps the sticky notes on.
                There's an overview, then one page per day.
              </p>
              <Shot src="07-studio-sketch" alt="The sketchbook overview: the route, preference stamps and the budget receipt">
                The overview: every overnight stop along the route, your interests and things to avoid as stamps
                (<q>loves food</q>, <q>no crowded attractions</q>), and a budget receipt. When the plan goes over budget
                the total is circled in red.
              </Shot>
              <Shot src="07b-sketch-drawing" alt="A day page being drawn, with the guide's pen mid-stroke">
                Aoi drawing day 1: the boxes are inked, and the pen is writing the <em>Evening</em> label. The small
                pencil badge on Aoi's portrait means they're drawing.
              </Shot>
              <Shot src="07c-sketch-day" alt="A finished day page">
                The finished page: morning, afternoon and evening, each place with a doodle for its kind (a gate for
                temples, a bowl for food), arrows in visiting order, and the day's weather in the corner. This trip is
                months away, so it says <q>Typical for October</q>.
              </Shot>
              <ul className="tv-guide__list">
                <li><strong>Only what's in your plan</strong>: every name, tip and number comes from the trip. Tips from
                  traveler posts are tagged with where they came from (<q>via reddit</q>). Must-see places get a
                  highlighter stroke.</li>
                <li><strong>Turn pages</strong> with the arrows, the arrow keys, Page Up/Down, Home/End, or a swipe. The
                  page follows the day you pick in <strong>Days</strong>.</li>
                <li><strong>Redraw</strong> watches your guide draw the page again.</li>
                <li><strong>Your guide reacts</strong>: thinking while the agent works (with what it's doing), drawing,
                  pleased when something is added, and puzzled when the plan goes over budget. They then circle the
                  total on the receipt.</li>
                <li>With <em>reduce motion</em> turned on in your system settings, pages appear finished and the guide
                  stays still.</li>
              </ul>
            </section>

            <section id="map">
              <h2>Map &amp; 3D view</h2>
              <p>
                <strong>Map</strong> and <strong>3D</strong> show the same trip as a route: your origin, each base, and the
                legs between them. They follow the day you pick in <strong>Days</strong>, and in agent mode they redraw after
                every change.
              </p>
              <Shot src="08-studio-map" alt="The Map tab: the route from Delhi to Kyoto">
                <strong>Map</strong>: the route on a real map. Switch <strong>Map / Terrain / Satellite</strong>, and
                <strong> Stops</strong> or the <strong>Full route</strong> line. Pick a stop or a leg to open its details.
              </Shot>
              <Shot src="09-studio-3d" alt="The 3D tab: the trip as a graph">
                <strong>3D</strong>: the trip as a graph, with travel time and distance on each leg (here Delhi to
                Kyoto, about 7 h 20 m). <strong>Atlas / Outline / Journal</strong> switch the layout.
              </Shot>
            </section>

            <section id="export">
              <h2>Export &amp; PDF</h2>
              <p><strong>Export</strong> (top right in the studio) takes the trip anywhere, with no dialogs: each file downloads straight away.</p>
              <Shot src="10-export-menu" alt="The Export menu open in the studio">
                The Export menu, with a Google Maps directions link for each day at the bottom. Behind it, the Plan tab
                with day 1 open: pick a day in <strong>Days</strong> and the plan shows it slot by slot.
              </Shot>
              <ul className="tv-guide__list">
                <li><strong>PDF</strong>: a cover with your guide, every sketch page (sharp at any zoom), the day-by-day
                  plan with tips and linked sources, the weather and holidays, the budget, and credits. The text is real
                  text you can select, Japanese included.</li>
                <li><strong>Calendar (.ics)</strong>: an event for each planned place, timed by morning, afternoon or
                  evening, plus holidays. It needs a start date in your brief.</li>
                <li><strong>Google Maps</strong>: directions for each day, up to 9 stops.</li>
                <li><strong>GPX</strong> and <strong>KML</strong>: pins for Organic Maps, Maps.me, Google My Maps and GPS
                  apps. The first time, TripVerse looks up where each place is, which takes a few seconds.</li>
                <li><strong>Budget (.csv)</strong> and <strong>Everything (.json)</strong>: the budget ledger for a
                  spreadsheet, and the whole trip as data.</li>
              </ul>
            </section>

            <section id="budget">
              <h2>Budget planner</h2>
              <p>
                <strong>Budget</strong> (in the chat or the studio) opens the trip's cost ledger. Rows are created from the
                itinerary: for each base you get stay, food, activities and local travel, plus one row per journey between
                places. Stay counts <em>nights</em>; food and local travel count <em>days</em>. A budget from your trip
                brief becomes the target.
              </p>
              <Shot src="11-budget-empty" alt="Budget planner before any amounts are entered">
                The budget planner for the Kyoto trip. The ₹120,000 target came from the trip brief.
              </Shot>
              <Shot src="12-budget-suggestions" alt="Budget with suggested amounts and a projected trip cost">
                After <strong>Suggest amounts</strong>: each row gets a suggestion and where it came from (for example
                <q>Reddit travelers: $40/day food</q>). <strong>Projected trip cost</strong> adds them up, and TripVerse
                warns you that this plan lands above your target before you use them.
              </Shot>
              <Shot src="13-budget-rows" alt="Budget rows with Use and Edit actions">
                <strong>Use</strong> accepts one suggestion and <strong>Edit</strong> sets your own amount or quantity.
                Journeys between places get their own rows (here the flight from Delhi). <strong>Add a cost</strong>
                covers anything else: insurance, visas, tickets.
              </Shot>
            </section>

            <section id="agent">
              <h2>Build with your guide</h2>
              <p>
                Choose <strong>Build with …</strong> (your guide's name) on the planning card. There's no extra setup: the
                budget, pace, travel mode and interests come from your trip brief, and you can change any of them later
                just by saying so.
              </p>
              <Steps>
                <li>The agent reads traveler posts for your destination, estimates typical hotel, food and transit costs,
                  and ranks places for each day. The first run takes a little longer than later ones.</li>
                <li>Its reply opens day 1, and the <strong>day panel</strong> appears above the message box.</li>
              </Steps>
              <p>
                Talk to it the way you'd talk to a friend who's planning with you. While it works, a status line says what
                it's doing. Your change lands in the day panel, the studio and the sketchbook first, and the reply follows
                word by word.
              </p>
              <Shot src="14-build-day-1" alt="Agent reply for day 1 with suggestions and the day panel below">
                Day 1 of our Tokyo trip with Beni. The day panel under the trip card holds everything you act on:
                <strong>day tabs</strong> (D1 · marks the day the agent is on), the day's hours and cost, the
                <strong> trip budget</strong> bar (stay and food are counted in; flights live in the Budget planner), and
                tap-to-add <strong>suggestion chips</strong> with their typical cost.
              </Shot>
              <Shot src="15-build-added" alt="Day 1 after adding a suggestion">
                Tapping <strong>+ Yanaka Ginza</strong> added it to day 1: 1.5 of 8 hours used, and the trip total
                went from ~¥33,000 to ~¥34,500. Tapped actions skip the language step, so they're quick and exact.
              </Shot>
            </section>

            <section id="agent-days">
              <h2>Working day by day</h2>
              <p>
                Each day keeps its own plan, its own suggestions and the agent's last notes for it. You don't have to
                finish day 1 before planning day 2, and switching days is instant: it doesn't ask the agent anything.
              </p>
              <Shot src="16-build-day-2-switch" alt="Day 2 selected in the day panel with its own suggestions">
                Tapping <strong>D2</strong> (or <strong>Next day</strong>) shows day 2's own suggestions straight away.
                Day 1's plan is kept exactly as you left it.
              </Shot>
              <Shot src="17-build-preferences" alt="Day 2 after a typed request">
                Typing works too, and it applies to the day on screen. On day 2 we tapped Kyu-Yasuda Garden, then typed
                <q>I never want museums on this trip. Also add a great local lunch spot today.</q> The agent saved
                <strong>no museums</strong> as a hard rule and added Omoide Yokocho. Each planned place has
                <strong> Remove</strong>.
              </Shot>
              <Shot src="18-build-day-1-held" alt="Back on day 1 with the agent's saved notes expanded">
                Back on <strong>D1</strong>: its plan is intact, and <strong>Agent's notes for day 1</strong> replays
                the last advice for that day, with no new request. Here it mentions the forecast showers and a dry
                backup.
              </Shot>
            </section>

            <section id="agent-prefs">
              <h2>Preferences &amp; budget rules</h2>
              <p>The agent keeps two kinds of preferences, and it treats them differently.</p>
              <ul className="tv-guide__list">
                <li><strong>Hard rules</strong>: must-see places and things to avoid (<q>never</q>, <q>can't</q>, allergies,
                  mobility). Places matching an avoid rule are never suggested. If you add one yourself, the agent
                  warns you first and adds it only if you insist.</li>
                <li><strong>Soft leanings</strong>: likes and dislikes (<q>I prefer quiet places</q>, <q>not a big fan of
                  shopping</q>). They move places up or down the list without ruling anything out.</li>
                <li><strong>Rejected places</strong>: say <q>remove it, and don't suggest it again</q> and it's gone for the whole trip.</li>
              </ul>
              <p>Before anything is added, the agent checks three limits:</p>
              <ul className="tv-guide__list">
                <li><strong>Budget</strong>: would it push the trip over your budget? If so it's not added. You get the
                  amount it would overshoot by and cheaper alternatives of the same kind. Free places always fit.</li>
                <li><strong>Day length</strong>: would it overfill the day for your pace? You're offered other days
                  where it fits.</li>
                <li><strong>Your hard rules.</strong></li>
              </ul>
              <p>
                The agent also looks for <strong>money-saving moves</strong>. If a place sits in a neighbourhood you're
                already visiting on another day, moving it there saves a cross-town trip. The agent tells you what the
                move saves in money and minutes.
              </p>
              <p className="tv-guide__note">
                If your hotel and food alone already use up the budget, nothing paid can be added. The agent says so
                and offers the fixes: raise the budget, or tell it your real costs, for example
                <q>my hotel is 6000 yen a night</q>.
              </p>
            </section>

            <section id="connected">
              <h2>How it all connects</h2>
              <p>The chat, the Budget planner, the studio and the sketchbook are one trip seen four ways, and they stay in sync.</p>
              <ul className="tv-guide__list">
                <li><strong>Agent → Budget planner.</strong> Every stay, food, activity and local-travel number the agent plans
                  with appears in the Budget planner as a suggestion marked <q>From your build-with-agent plan</q>.</li>
                <li><strong>Budget planner → agent.</strong> Amounts you type for stay or food replace the agent's estimates
                  on your next message, so its checks use your real prices.</li>
                <li><strong>Flights and other journeys</strong> between cities are only in the Budget planner. Use
                  <strong> Suggest amounts</strong> there to estimate them.</li>
                <li><strong>Chat → studio.</strong> Keep the chat open in the studio and every change is drawn as it
                  happens: your guide turns to the day that changed, draws only what's new, and says what changed.</li>
              </ul>
              <Shot src="19-build-budget-sync" alt="Budget planner for the Tokyo trip showing the agent's numbers as suggestions">
                The Tokyo budget planner: the ¥60,000 target came from the brief, and stay (2 nights), food (3 days),
                activities and local travel carry the agent's own numbers, marked <q>From your build-with-agent
                plan</q>. The projected ~¥36,250 matches the agent's trip total.
              </Shot>
              <Shot src="20-build-live-sketch" alt="The studio with the chat open while the guide draws a new place">
                The studio with the chat open. We typed <q>Add a quiet garden to day 1 if it fits.</q> While the agent
                works, the header says <q>Beni: Updating your day</q>; the new place is drawn onto day 1 and Beni's
                speech bubble says what changed (<q>Added Gyoen Park …</q>).
              </Shot>
              <Shot src="21-build-live-sketch-done" alt="The same page after the change is drawn">
                A moment later: Gyoen Park and its traveler tip (via TripAdvisor) are on the page, and the reply explains
                the pick, including the forecast showers.
              </Shot>
              <Shot src="22-build-complete" alt="Completed itinerary summary">
                <strong>Finish itinerary</strong> wraps up with a summary and the trip total. You can keep chatting to
                change anything afterwards.
              </Shot>
            </section>

            <section id="phone">
              <h2>On your phone</h2>
              <p>
                On a phone, the trip list becomes a drawer (open it with the menu button) so the chat gets the whole
                screen. In the studio, the windows become bottom sheets, one at a time, and the sketchbook switches to
                upright pages that fill the screen. Swipe to turn them.
              </p>
              <Shot src="23-phone-sketch" alt="A portrait sketch page on a phone" portrait>
                The same day on a phone: the page stands upright, the time slots stack, and the sticky notes run along
                the bottom. Swipe to turn pages.
              </Shot>
            </section>

            <section id="phrases">
              <h2>Things you can say to the agent</h2>
              <div className="tv-guide__table" role="region" aria-label="Example phrases" tabIndex={0}>
                <table>
                  <thead><tr><th scope="col">You say</th><th scope="col">What happens</th></tr></thead>
                  <tbody>
                    <tr><td><q>Add the 2nd one</q> · <q>Add teamLab Planets to day 3</q></td><td>Adds it, after checking budget, hours and your rules</td></tr>
                    <tr><td><q>Add it anyway</q></td><td>Overrides the last warning</td></tr>
                    <tr><td><q>Move Nezu Museum to day 2</q></td><td>Moves it, and reports any saving</td></tr>
                    <tr><td><q>Remove Golden Gai and don't suggest it again</q></td><td>Removes it for good</td></tr>
                    <tr><td><q>I can't do long hikes</q> · <q>Tokyo Tower is a must</q></td><td>Saves a hard rule (avoid / must-see)</td></tr>
                    <tr><td><q>I'm more into cafés than bars</q></td><td>Saves soft leanings (like / dislike)</td></tr>
                    <tr><td><q>My budget is 12,000 yen</q> · <q>Raise the budget to 45000</q></td><td>Updates the budget and the Budget planner's target</td></tr>
                    <tr><td><q>My hotel is 6000 yen a night</q> · <q>Food is about 3000 a day</q></td><td>Replaces those estimates</td></tr>
                    <tr><td><q>We'll take taxis</q> · <q>Let's make it relaxed</q></td><td>Changes travel mode or pace</td></tr>
                    <tr><td><q>Days 3 and 4 in Kyoto</q></td><td>Sets the overnight base for those days</td></tr>
                    <tr><td><q>Find late-night ramen near Shinjuku</q></td><td>Searches traveler posts for new ideas</td></tr>
                    <tr><td><q>Let's wrap it up</q></td><td>Finishes the itinerary</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="faq">
              <h2>Questions &amp; fixes</h2>
              <dl className="tv-guide__faq">
                <dt>Are the prices real quotes?</dt>
                <dd>No. They're typical amounts from traveler reports and the agent's estimates, always marked with ~ or
                  <q>Suggested</q>. Nothing is booked. Enter what you actually pay in the Budget planner.</dd>
                <dt>Is the weather a forecast?</dt>
                <dd>Only within about 10 days of your trip, and it says <q>forecast</q>. Further out it's typical weather
                  for that month, labelled <q>Typical for …</q>.</dd>
                <dt>Why is Calendar greyed out in Export?</dt>
                <dd>A calendar needs dates. Add a start date to your trip brief (<strong>Edit details</strong>), or tell the
                  agent when you're going.</dd>
                <dt>Why does the agent say I'm over budget before I've added anything?</dt>
                <dd>Its total includes hotel nights and daily food for the whole trip. Raise the budget, or tell it your
                  real hotel and food costs.</dd>
                <dt>Does switching days lose my plan?</dt>
                <dd>No. Every day keeps its plan and notes. Switching is instant and doesn't message the agent.</dd>
                <dt>The agent suggested nothing for a day.</dt>
                <dd>Tell it what you're in the mood for (<q>street food and a quiet garden</q>). It records that as a
                  preference and searches traveler posts for that day's base.</dd>
                <dt>Can I change my guide?</dt>
                <dd>Yes, with <strong>Edit details</strong> on the planning card, before you pick a path. The guide only
                  changes who's drawing and chatting; the planning is the same.</dd>
                <dt>Where do the photos come from?</dt>
                <dd>Wikimedia Commons. Hover a photo for its author and licence; every source is listed on the
                  Credits page.</dd>
              </dl>
            </section>

            <section id="changes">
              <h2>What's new</h2>
              <ul className="tv-guide__list tv-guide__changes">
                <li><strong>{LAST_UPDATED}.</strong> The <strong>Trip Studio</strong>: plan, sketchbook, map and 3D on one
                  page, with movable Days, Trip details and Chat windows. Pick a <strong>guide</strong> in your brief, and
                  they draw your trip as a <strong>hand-drawn sketchbook</strong>, live as the plan changes. One-click
                  <strong> exports</strong>: PDF, calendar, Google Maps, GPX, KML, CSV and JSON. Weather, public holidays
                  and exchange rates for your dates. The brief now takes a start date, travelers, comfort and a budget.
                  Upright sketch pages on phones, and accessibility fixes across the app.</li>
                <li><strong>September 28, 2026.</strong> Conversations feel live: short, natural replies that stream in,
                  and each change appears before the reply finishes. One-shot itineraries can be edited just by asking.
                  In agent mode each day keeps its own plan, and the chat and Budget planner share one set of numbers.</li>
                <li><strong>September 28, 2026.</strong> The route map and 3D view were redesigned, with three layouts
                  (Atlas, Outline, Journal), stops that open into nearby places, and legs with time, distance and cost.</li>
              </ul>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
