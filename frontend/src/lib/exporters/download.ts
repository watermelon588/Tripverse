import type { TripDocument } from '../../services/tripService';

export const tripTitle = (doc: TripDocument) =>
  `${doc.destination || 'Trip'}${doc.duration_days ? ` · ${doc.duration_days} ${doc.duration_days === 1 ? 'day' : 'days'}` : ''}`;

/** "kyoto-3-days" style base name for every exported file. */
export const fileBase = (doc: TripDocument) =>
  tripTitle(doc).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trip';

/** Save text as a file straight away: no dialog, no new tab. */
export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename, rel: 'noopener' });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
