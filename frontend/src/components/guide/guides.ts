/*
 * The guide cast: companions who "sketch" the trip with the traveler.
 *
 * Portfolio placeholders. These portraits are recognisable anime characters or fan art,
 * so they must be replaced with original or licensed art before any commercial launch
 * (plan.md, "Commercial readiness"). Keep every guide reference going through this file.
 */
export interface Guide {
  id: string;
  name: string;
  image: string;
  line: string;
}

export const GUIDES: Guide[] = [
  { id: 'aoi', name: 'Aoi', image: '/pfp/5ebc2b293bd93a26c5a67eb0d7c7c37a.jpg', line: 'Cool-headed planner. Quiet corners, zero wasted steps.' },
  { id: 'yuki', name: 'Yuki', image: '/pfp/4f9accdea0d0f90f7c828e529b6bcecc.jpg', line: 'Wide-eyed explorer who has seen centuries of sights.' },
  { id: 'beni', name: 'Beni', image: '/pfp/084f860e3eb1569fddd7e47d1ab9337f.jpg', line: 'Tiny critic with big opinions on where to eat.' },
  { id: 'kaede', name: 'Kaede', image: '/pfp/f6acbd3ea789240a081bc312c6dc69d5.jpg', line: 'Always has a plan. Budget in check, no surprises.' },
  { id: 'momo', name: 'Momo', image: '/pfp/fe325776d3bdd1174fa04644870657cb.jpg', line: 'Shy, but knows every hidden gem nobody posts about.' },
  { id: 'rin', name: 'Rin', image: '/pfp/2aa4e37adf102ac2bc180cb30a085da0.jpg', line: 'Night owl. Late bites, city lights, slow mornings.' },
];

export const DEFAULT_GUIDE = GUIDES[0];

export const guideById = (id?: string | null): Guide => GUIDES.find((guide) => guide.id === id) || DEFAULT_GUIDE;
