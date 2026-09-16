/*
 * Shared content for the v2 marketing surface.
 *
 * Every string here is specific and contextual — real places, real-shaped
 * numbers, plain language. No placeholder names, no round marketing figures,
 * no "seamless"/"elevate" copy.
 */

/*
 * Photography resolves to `media/web/` — 1800px-wide, quality-82 derivatives
 * of the originals (72.8 MB -> 12.0 MB across the set). The full-resolution
 * sources stay in `media/` for reprocessing.
 */
import fuji from '@media/web/hero-bg.jpg';
import fujiCutout from '@media/hero-bg-transparent.png';
import pagoda from '@media/web/3rd.jpg';
import parasail from '@media/web/1st.jpg';
import cityPlan from '@media/web/4th.jpg';
import sydney from '@media/web/caleb-JmuyB_LibRo-unsplash.jpg';
import dubaiTower from '@media/web/christoph-schulz-7tb-b37yHx4-unsplash.jpg';
import dubaiMarina from '@media/web/kate-trysh-U3CntDq16yY-unsplash.jpg';
import prague from '@media/web/fredy-martinez-frd7WNzipdU-unsplash.jpg';
import budapest from '@media/web/philipp-trubchenko-oOTo9nR7f9Q-unsplash.jpg';
import porto from '@media/web/will-goodman-1EikowqH9fs-unsplash.jpg';
import newYork from '@media/web/pierre-blache-VMNG8BYFQfs-unsplash.jpg';
import luxembourg from '@media/web/pedro-lastra-5g8dJvtYRYA-unsplash.jpg';
import alpineLake from '@media/web/datingscout-RlQ29vvbU2Q-unsplash.jpg';
import kyotoGarden from '@media/web/david-emrich-VCM99u6HltA-unsplash.jpg';
import seoulPalace from '@media/web/brady-bellini-t5dGNNQVwg8-unsplash.jpg';
import tokyoAlley from '@media/web/matthieu-buhler-PaFHv0Zi71E-unsplash.jpg';
import izakaya from '@media/web/pema-g-lama-6cfK0SEtpbY-unsplash.jpg';
import osakaStreet from '@media/web/shigeki-wakabayashi-6nuz52vsbWc-unsplash.jpg';
import blossomFuji from '@media/web/jj-ying-9Qwbfa_RM94-unsplash.jpg';
import monoCity from '@media/web/james-wilkinson-FMuorhl0EHY-unsplash.jpg';
import contrail from '@media/web/ben-klewais-nLE3eLaQA6A-unsplash.jpg';
import poolVilla from '@media/web/bilderboken-rlwE8f8anOc-unsplash.jpg';
import hotelRoom from '@media/web/vojtech-bruzek-Yrxr3bsPdS0-unsplash.jpg';
import dinner from '@media/web/jay-wennington-N_Y88TWmGwA-unsplash.jpg';
import platedFood from '@media/web/alexandru-bogdan-ghita-UeYkqQh4PoI-unsplash.jpg';
import temple from '@media/web/mountain-girl-WfT3o1KhnwQ-unsplash.jpg';

export const img = {
  fuji,
  fujiCutout,
  pagoda,
  parasail,
  cityPlan,
  sydney,
  dubaiTower,
  dubaiMarina,
  prague,
  budapest,
  porto,
  newYork,
  luxembourg,
  alpineLake,
  kyotoGarden,
  seoulPalace,
  tokyoAlley,
  izakaya,
  osakaStreet,
  blossomFuji,
  monoCity,
  contrail,
  poolVilla,
  hotelRoom,
  dinner,
  platedFood,
  temple,
};

export interface Destination {
  city: string;
  country: string;
  code: string;
  image: string;
  nights: number;
  note: string;
}

export const DESTINATIONS: Destination[] = [
  { city: 'Kyoto', country: 'Japan', code: 'UKY', image: kyotoGarden, nights: 4, note: 'Temple districts, kaiseki, autumn maples' },
  { city: 'Porto', country: 'Portugal', code: 'OPO', image: porto, nights: 3, note: 'Douro riverfront, tiled facades, port cellars' },
  { city: 'Prague', country: 'Czechia', code: 'PRG', image: prague, nights: 3, note: 'Old Town rooftops, Vltava crossings' },
  { city: 'Seoul', country: 'South Korea', code: 'ICN', image: seoulPalace, nights: 5, note: 'Palace grounds, night markets, Bukchon' },
  { city: 'Budapest', country: 'Hungary', code: 'BUD', image: budapest, nights: 3, note: 'Thermal baths, Buda hill, ruin bars' },
  { city: 'Sydney', country: 'Australia', code: 'SYD', image: sydney, nights: 6, note: 'Harbour walks, coastal track, ferries' },
];

/** A believable agent transcript used by the Console and Bento heroes. */
export const AGENT_TRANSCRIPT = [
  { role: 'user' as const, text: 'Two weeks in Japan in early April. Trains, not flights. Keep it under ¥420,000.' },
  { role: 'agent' as const, text: 'Anchoring on the Kansai–Kanto corridor so a rail pass covers the long legs. Holding 4 nights Kyoto for peak blossom, then Kanazawa.' },
];

export const AGENT_STEPS = [
  { label: 'Parsed constraints', detail: '14 nights · rail-only · ¥420k ceiling', state: 'done' as const },
  { label: 'Resolved 9 candidate cities', detail: 'Scored on season, transit, budget fit', state: 'done' as const },
  { label: 'Built the route graph', detail: '23 nodes · 31 edges', state: 'done' as const },
  { label: 'Costing the rail segments', detail: 'JR Pass vs. point-to-point', state: 'active' as const },
  { label: 'Reserving evening slots', detail: 'Queued', state: 'idle' as const },
];

export const ITINERARY_ROWS = [
  { day: 'D1–D4', place: 'Kyoto', mode: 'Arrive KIX', cost: '¥86,400' },
  { day: 'D5–D6', place: 'Kanazawa', mode: 'Thunderbird', cost: '¥31,200' },
  { day: 'D7–D9', place: 'Takayama', mode: 'Hida ltd. exp.', cost: '¥44,750' },
  { day: 'D10–D14', place: 'Tokyo', mode: 'Hokuriku Shink.', cost: '¥118,900' },
];

export const CAPABILITIES = [
  {
    n: '01',
    title: 'It reasons about the whole trip, not one stop',
    body: 'Move a museum to Thursday and the agent re-checks the train you were going to catch, the table you booked after it, and whether the day still ends where you sleep.',
    icon: 'graph' as const,
    image: cityPlan,
    alt: 'Transit corridor overlaid on a city plan',
    caption: 'Every edit propagates through the graph',
  },
  {
    n: '02',
    title: 'You watch it think',
    body: 'Every constraint it reads, every city it scores, every route it discards is written out as it happens. Nothing arrives as a finished block you have to trust blindly.',
    icon: 'spark' as const,
    image: monoCity,
    alt: 'Aircraft passing between two towers',
    caption: 'Streamed reasoning, not a finished block',
  },
  {
    n: '03',
    title: 'The itinerary is a map, not a list',
    body: 'Cities, stays, meals, and transit render as connected nodes in 3D. Distance and sequence are things you look at, rather than things you reconstruct from bullet points.',
    icon: 'layers' as const,
    image: alpineLake,
    alt: 'Lakeside village seen from the mountainside',
    caption: 'Distance you can see, not infer',
  },
  {
    n: '04',
    title: 'Budget is a constraint, not a footnote',
    body: 'Set a ceiling and it holds. Costs recompute on every edit, and the agent tells you which segment broke the budget before it hands you the plan.',
    icon: 'wallet' as const,
    image: izakaya,
    alt: 'Lantern-lit izakaya alley at night',
    caption: 'Priced to the segment, held to the ceiling',
  },
];

/** Photography for the infinite marquee strip. */
export const MARQUEE = [
  { src: kyotoGarden, label: 'Kyoto' },
  { src: porto, label: 'Porto' },
  { src: prague, label: 'Prague' },
  { src: seoulPalace, label: 'Seoul' },
  { src: budapest, label: 'Budapest' },
  { src: sydney, label: 'Sydney' },
  { src: tokyoAlley, label: 'Tokyo' },
  { src: luxembourg, label: 'Luxembourg' },
  { src: osakaStreet, label: 'Osaka' },
  { src: newYork, label: 'New York' },
  { src: dubaiMarina, label: 'Dubai' },
  { src: blossomFuji, label: 'Fujiyoshida' },
];

/** Small supporting thumbnails for the How-it-works index. */
export const STEP_IMAGES = [temple, cityPlan, pagoda, hotelRoom];

export const STEPS = [
  {
    n: '01',
    title: 'Describe the trip in your own words',
    body: 'Dates, a budget, who is coming, how you like to move. Plain sentences — no forms, no dropdowns, no wizard.',
  },
  {
    n: '02',
    title: 'Watch the agent build the graph',
    body: 'It resolves candidate cities, scores them against your constraints, wires the routes, and prices each segment while you read along.',
  },
  {
    n: '03',
    title: 'Explore it in three dimensions',
    body: 'Your trip opens as a spatial universe. Pan across the route, open any node, see what connects to what and what it costs.',
  },
  {
    n: '04',
    title: 'Change anything and replan live',
    body: 'Drop a city, add two nights, cap the spend. The agent reruns the affected branch and shows you exactly what moved.',
  },
];

export const FAQ = [
  {
    q: 'What makes this different from asking a chatbot for an itinerary?',
    a: 'A chatbot returns text it cannot check. TripVerse builds a structured graph of your trip — nodes for places and stays, edges for transit — then validates it against your dates, budget, and opening hours. When something does not fit, it tells you which constraint failed instead of quietly writing around it.',
  },
  {
    q: 'Can I edit the plan after the agent generates it?',
    a: 'Yes, and editing is the point. Ask for a change in the same conversation and the agent replans only the affected branch of the graph. The parts you already approved stay where they are.',
  },
  {
    q: 'Does it book anything on my behalf?',
    a: 'Not today. TripVerse plans, prices, and sequences the trip, then hands you the booking links for each segment. You stay in control of every transaction.',
  },
  {
    q: 'What happens to a trip I started but did not finish?',
    a: 'Sessions persist against your account. Reopen the conversation and both the transcript and the 3D graph come back in the state you left them.',
  },
  {
    q: 'Do I need an account to try it?',
    a: 'You can plan a trip as a guest and see the full 3D graph. An account is only needed to save a trip, reopen it later, or pick it back up on another device.',
  },
];

export const FOOTER_NAV = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Explore trips', href: '#explore', key: 'explore' },
      { label: 'Plan a trip', href: '#plan', key: 'plan' },
      { label: 'Questions', href: '#questions' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Changelog', href: '#changelog' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation', href: '#docs' },
      { label: 'API reference', href: '#api' },
      { label: 'Status', href: '#status' },
    ],
  },
];
