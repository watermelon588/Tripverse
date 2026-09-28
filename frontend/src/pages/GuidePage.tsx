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

const LAST_UPDATED = 'September 28, 2026';

const SECTIONS = [
  { id: 'overview', label: 'Two ways to plan' },
  { id: 'start', label: 'Start a trip' },
  { id: 'one-shot', label: 'One-shot itinerary' },
  { id: 'map', label: 'Route, map & 3D view' },
  { id: 'budget', label: 'Budget planner' },
  { id: 'agent', label: 'Build with the agent' },
  { id: 'agent-days', label: 'Working day by day' },
  { id: 'agent-prefs', label: 'Preferences & budget rules' },
  { id: 'connected', label: 'How chat & budget connect' },
  { id: 'phrases', label: 'Things you can say' },
  { id: 'faq', label: 'Questions & fixes' },
  { id: 'changes', label: "What's new" },
];

function Shot({ src, alt, children }: { src: string; alt: string; children: ReactNode }) {
  return (
    <figure className="tv-guide__shot">
      <a href={`/guide/${src}.png`} target="_blank" rel="noreferrer" aria-label={`Open full-size screenshot: ${alt}`}>
        <img src={`/guide/${src}.png`} alt={alt} loading="lazy" width={1440} height={900} />
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
            Kyoto trip made in one shot, and a 3-day Tokyo trip built day by day with the agent. Every screenshot is
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
                Every trip starts the same way: tell TripVerse where you're going, then confirm a short trip brief.
                After that you choose how the itinerary gets built.
              </p>
              <div className="tv-guide__table" role="region" aria-label="Planning modes compared" tabIndex={0}>
                <table>
                  <thead>
                    <tr><th scope="col" /><th scope="col">One-shot itinerary</th><th scope="col">Build with the agent</th></tr>
                  </thead>
                  <tbody>
                    <tr><th scope="row">Best for</th><td>A complete first draft in about a minute</td><td>Shaping each day yourself, on a budget</td></tr>
                    <tr><th scope="row">How it works</th><td>Researches the destination, then writes every day at once</td><td>Suggests places for one day at a time; you add, remove or move them</td></tr>
                    <tr><th scope="row">Budget</th><td>Fill in the Budget planner, or let it suggest amounts</td><td>Tracked live. Additions that don't fit are blocked, with alternatives</td></tr>
                    <tr><th scope="row">Suggestions come from</th><td>Web research on your destination</td><td>Traveler posts on Reddit, Quora and TripAdvisor forums</td></tr>
                    <tr><th scope="row">Map & 3D view</th><td>Built from the draft</td><td>Updates after every change</td></tr>
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
                <li>A <strong>trip brief</strong> appears with everything it understood filled in. Check it and add the rest.</li>
              </Steps>
              <Shot src="01-planner-start" alt="Empty planner with the greeting and message box">
                The planner: past trips on the left, the conversation in the middle. <strong>Budget</strong> and
                <strong> Route &amp; map</strong> sit in the top-right corner.
              </Shot>
              <Shot src="02-trip-details-form" alt="Trip brief form filled in for Kyoto from Delhi, 3 days">
                The trip brief, pre-filled from the message. <strong>Daily pace</strong> sets how full each day
                gets (in agent mode: relaxed ≈ 6 h, balanced ≈ 8 h, packed ≈ 11 h). <strong>What interests you</strong> steers
                suggestions. <strong>Anything to avoid</strong> becomes a hard rule in agent mode: those places are
                never suggested. <strong>Places you want to visit</strong> are treated as must-sees.
              </Shot>
              <p>
                Press <strong>Continue to planning options</strong>. The brief is saved, and you can still change it with
                <strong> Edit details</strong> on the next screen.
              </p>
              <Shot src="03-planning-choice" alt="Planning choice card with the brief and two options">
                Choose a path. <strong>01 / One shot</strong> writes the full itinerary now.
                <strong> 02 / Day by day</strong> starts the agent.
              </Shot>
            </section>

            <section id="one-shot">
              <h2>One-shot itinerary</h2>
              <p>
                <strong>Generate full itinerary</strong> researches the destination, picks the bases worth your time,
                and streams a day-by-day plan into the chat. It takes about a minute. You'll see the stages
                (<em>Researching possible stops</em>, <em>Writing your day-by-day draft</em>) while it works.
              </p>
              <Shot src="04-one-shot-itinerary" alt="The generated Kyoto itinerary in the chat">
                The draft: each day's base, morning to evening, lunch ideas and transfer times. Unverified details
                such as schedules and fares are flagged to check, never presented as booked.
              </Shot>
              <Shot src="05-one-shot-itinerary-end" alt="End of the itinerary with decisions to make">
                Every draft ends with the checks worth doing and <strong>What to decide next</strong>. Here that's
                where to base your stay, and whether to add a half-day side trip to Uji.
              </Shot>
              <p>
                <strong>Change it by just saying so.</strong> Ask for any edit in plain words and TripVerse revises the
                plan you already have: it says what it changed, then streams the updated itinerary. The route map
                redraws as it goes. Everything you didn't ask about stays as it was.
              </p>
              <Shot src="05b-one-shot-revision" alt="The revised itinerary opening with a sentence about what changed">
                We asked <q>Can you add the Arashiyama bamboo grove on the morning of day 2?</q> The reply opens by
                saying exactly what moved, and the rest of the plan is kept.
              </Shot>
              <p>
                Questions get answers, not a rewrite. <q>Is Fushimi Inari crowded early in the morning?</q> gets a short
                reply based on your plan, with an offer to change it if you'd like. Changing the basics (<q>make it 5
                days</q>, <q>start from Mumbai instead</q>) researches the trip again and writes a fresh draft.
              </p>
            </section>

            <section id="map">
              <h2>Route, map &amp; 3D view</h2>
              <p>
                <strong>Route &amp; map</strong> (top right, or <strong>Open spatial view</strong> in the sidebar)
                opens the trip as a route: your origin, each base, and the legs between them. It's built from the latest
                itinerary, and in agent mode it redraws after every change.
              </p>
              <Shot src="06-spatial-3d" alt="3D graph of the Kyoto trip: Delhi, Central Kyoto, Arashiyama, Kansai Airport, Kyoto Station">
                <strong>3D graph</strong> places stops on a globe-like grid, with travel time and distance on each leg
                where they're known. The Kyoto draft became Delhi → Central Kyoto (days 1–3) → Arashiyama → Kansai
                Airport, and the strip underneath lists the same route in order. Click a stop to open nearby places, or a leg for
                its segments, time, distance and cost. <strong>Atlas / Outline / Journal</strong> switch the layout.
              </Shot>
              <Shot src="07-route-map" alt="Google map view of the same route">
                <strong>Map</strong> shows the same route on a real map, including every place planned at each stop.
                When you add a place in chat, it pulses on the map as soon as the plan updates, and the map pans to it
                if it's off-screen. Click a place to open its stop. Switch <strong>Map / Terrain /
                Satellite</strong>. On long-haul trips you can also toggle between <strong>Stops</strong> and the
                <strong> Full route</strong> line. The panel sits beside the chat, so the conversation stays visible.
                Drag its left edge to resize it, or double-click the edge to switch between half and full width.
              </Shot>
            </section>

            <section id="budget">
              <h2>Budget planner</h2>
              <p>
                <strong>Budget</strong> opens the trip's cost ledger. Rows are created from the itinerary: for each base
                you get stay, food, activities and local travel, plus one row per journey between places. Stay counts
                <em> nights</em>; food and local travel count <em>days</em>.
              </p>
              <Shot src="08-budget-empty" alt="Budget planner before any amounts are entered">
                A new budget. Set an optional <strong>Budget target</strong> and <strong>Currency</strong>. The currency
                locks once amounts are entered, because TripVerse never converts money behind your back.
                <strong> Suggest amounts</strong> fills typical costs for every row.
              </Shot>
              <Shot src="09-budget-suggestions" alt="Budget with suggested amounts and a projected trip cost">
                After <strong>Suggest amounts</strong>: each row shows a suggestion and where it came from (for example
                <q>Reddit travelers: stay 4–8k/night</q>). <strong>Projected trip cost</strong> adds the suggestions
                to what you've entered. <strong>Entered so far</strong> only counts amounts you've accepted or typed.
              </Shot>
              <Shot src="10-budget-rows" alt="Budget rows with Use and Edit actions, and the add-a-cost form">
                <strong>Use</strong> accepts one suggestion, <strong>Use all suggestions</strong> accepts them all, and
                <strong> Edit</strong> sets your own amount, quantity, or excludes a row. <strong>Add a cost</strong> covers
                anything else: insurance, visas, tickets. If the route changes, removed rows move to
                <em> Needs review</em> with your amounts kept.
              </Shot>
            </section>

            <section id="agent">
              <h2>Build with the agent</h2>
              <p>
                Choose <strong>Build with the agent</strong> on the planning card. A short setup appears; everything in
                it is optional, and you can change it later just by saying so.
              </p>
              <Shot src="11-build-setup" alt="Build with the agent setup: budget 60000 JPY, public transit, chill and hidden gems">
                The setup for our Tokyo trip: a total budget of <strong>¥60,000</strong>, <strong>public transit</strong>,
                and a <strong>chill, hidden gems</strong> vibe. <strong>Getting around</strong> sets the cost and time
                of moving between neighbourhoods. <strong>Vibe</strong> nudges which places rank first.
              </Shot>
              <Steps>
                <li>Press <strong>Start planning together</strong>. The agent reads traveler posts for your destination,
                  estimates typical hotel, food and transit costs, and ranks places for each day. The first run takes a
                  little longer than later ones.</li>
                <li>Its reply opens day 1, and the <strong>day panel</strong> appears above the message box.</li>
              </Steps>
              <p>
                Talk to it the way you'd talk to a friend who's planning with you. While it works, a status line says what
                it's doing (<em>Working that into your plan</em>, <em>Checking what travelers recommend</em>). Your
                change lands in the day panel and on the map first, and the agent's reply follows word by word.
              </p>
              <Shot src="12-build-day-1" alt="Agent reply for day 1 with suggestions and the day panel below">
                Day 1. The reply explains the suggestions and why travelers like them. The day panel below holds
                everything you act on:
                <strong> day tabs</strong> (D1 · marks the day the agent is on), the day's hours and cost,
                the <strong>trip budget</strong> bar (stay and food are counted in; flights live in the Budget planner),
                and tap-to-add <strong>suggestion chips</strong> with their typical cost: here Kagurazaka (~¥2,000),
                Marunouchi Brick Square and Nezu Shrine.
              </Shot>
              <Shot src="13-build-added" alt="Day 1 after adding Kagurazaka">
                Tapping <strong>+ Kagurazaka</strong> added it to day 1. The day now shows 2 of 8 hours used, the trip
                total rose from ~¥29,000 to ~¥31,000, and the agent's reply offers what still fits. Tapped actions skip the language parsing step, so they're
                quick and exact.
              </Shot>
            </section>

            <section id="agent-days">
              <h2>Working day by day</h2>
              <p>
                Each day keeps its own plan, its own suggestions and the agent's last notes for it. You don't have to
                finish day 1 before planning day 2, and switching days is instant: it doesn't ask the agent anything.
              </p>
              <Shot src="14-build-day-2-switch" alt="Day 2 selected in the day panel with its own suggestions">
                Tapping <strong>D2</strong> (or <strong>Next day</strong>) shows day 2's own suggestions straight away.
                Day 1's plan is kept exactly as you left it.
              </Shot>
              <Shot src="15-build-preferences" alt="Day 2 with two places planned after a typed request">
                Typing works too, and it always applies to the day on screen. On day 2 we tapped Marunouchi Brick Square,
                then typed <q>I never want museums on this trip. Also add a great local lunch spot today.</q> The agent
                recorded <strong>avoid museums</strong> as a hard rule, added Tsukiji Outer Market as the lunch spot, and
                asked what kind of food we'd like for another option. Each
                planned place has <strong>Remove</strong>.
              </Shot>
              <Shot src="16-build-day-1-held" alt="Back on day 1 with the agent's saved notes expanded">
                Back on <strong>D1</strong>: its plan is intact, and <strong>Agent's notes for day 1</strong> replays
                the last advice the agent gave for that day, again without a new request. Pick up where you left off.
              </Shot>
              <Shot src="18-build-complete" alt="Completed itinerary summary with a day table and budget summary">
                <strong>Finish itinerary</strong> (shown as the main button on the last day) wraps up with a day table
                and budget summary. You can keep chatting to change anything afterwards.
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
              <h2>How the chat and the Budget planner connect</h2>
              <p>They're one budget seen two ways, and they stay in sync automatically.</p>
              <ul className="tv-guide__list">
                <li><strong>Agent → Budget planner.</strong> Every stay, food, activity and local-travel number the agent plans
                  with appears in the Budget planner as a suggestion marked <q>From your build-with-agent plan</q>. The
                  projected total there matches the agent's trip total.</li>
                <li><strong>Budget planner → agent.</strong> Amounts you type for stay or food replace the agent's estimates
                  on your next message, so its checks use your real prices.</li>
                <li><strong>Your budget.</strong> A budget you give the agent becomes the Budget planner's target, in the
                  same currency.</li>
                <li><strong>Flights and other journeys</strong> between cities are only in the Budget planner. Use
                  <strong> Suggest amounts</strong> there to estimate them.</li>
              </ul>
              <Shot src="17-build-budget-sync" alt="Budget planner for the Tokyo trip showing the agent's numbers as suggestions">
                The Tokyo trip's Budget planner: the ¥60,000 target came from the agent setup, and stay (2 nights),
                food (3 days), activities and local travel carry the agent's own numbers. The projected ~¥34,000
                matches the agent's trip total exactly.
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
                <dt>Why does the agent say I'm over budget before I've added anything?</dt>
                <dd>Its total includes hotel nights and daily food for the whole trip. Raise the budget, or tell it your
                  real hotel and food costs.</dd>
                <dt>Does switching days lose my plan?</dt>
                <dd>No. Every day keeps its plan and notes. Switching is instant and doesn't message the agent.</dd>
                <dt>The agent suggested nothing for a day.</dt>
                <dd>Tell it what you're in the mood for (<q>street food and a quiet garden</q>). It records that as a
                  preference and searches traveler posts for that day's base.</dd>
                <dt>Can I change the trip brief later?</dt>
                <dd>Yes, with <strong>Edit details</strong> on the planning card, before you pick a path.</dd>
                <dt>Why is my currency locked in the Budget planner?</dt>
                <dd>Amounts are already entered in that currency. Clear them first; TripVerse never converts silently.</dd>
              </dl>
            </section>

            <section id="changes">
              <h2>What's new</h2>
              <ul className="tv-guide__list tv-guide__changes">
                <li><strong>{LAST_UPDATED}.</strong> Conversations feel live. The agent answers in short, natural
                  messages that stream in as they're written, and each change appears in the day panel and on the map
                  before the reply finishes. One-shot itineraries can now be edited just by asking: TripVerse revises
                  your plan in place and answers questions without rewriting it. Replies also start much sooner when
                  the AI service is busy.</li>
                <li><strong>{LAST_UPDATED}.</strong> Build with the agent: each day keeps its own plan, suggestions and
                  notes, and switching days is instant. The chat and Budget planner share one set of numbers. The Budget
                  planner can suggest amounts, counts nights and days, and shows a projected total. The trip brief now
                  always appears before planning, even when your first message already had every detail.</li>
                <li><strong>{LAST_UPDATED}.</strong> Route &amp; map was redesigned. There are three layouts (Atlas,
                  Outline, Journal), each with a 3D graph and a Google map. Stops open into nearby places, and legs open
                  into segments with time, distance, cost and checks against your preferences. The panel now sits beside
                  the chat and can be resized, and a streaming itinerary no longer flickers or leaves the old form on screen.
                  The map pins every planned place and highlights new ones as the chat adds them. Long unlabelled legs,
                  such as Delhi → Tokyo, are treated as flights instead of week-long drives.</li>
              </ul>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
