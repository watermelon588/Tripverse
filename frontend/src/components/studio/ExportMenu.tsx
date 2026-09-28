/*
 * ExportMenu: take the trip anywhere. Every file is built in the browser from the trip document
 * (lib/exporters) and downloads straight away. GPX and KML first locate the places on the server
 * (OpenStreetMap), which is slow only the first time. `pdf` is filled in by the PDF export.
 */
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../services/apiClient';
import { getTripBudget, type TripDocument } from '../../services/tripService';
import { budgetCsv } from '../../lib/exporters/csv';
import { download, fileBase } from '../../lib/exporters/download';
import { toGpx } from '../../lib/exporters/gpx';
import { toIcs } from '../../lib/exporters/ics';
import { toKml } from '../../lib/exporters/kml';
import { dayDirectionsUrl } from '../../lib/exporters/maps';
import { type LatLon, type PlacePoints, pointsRequest } from '../../lib/exporters/points';
import '../../styles/export-menu.css';

interface Props {
  document: TripDocument | null;
  /** One-click PDF, wired by the PDF export; the entry only shows when provided. */
  pdf?: () => void;
}

export function ExportMenu({ document: doc, pdf }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const points = useRef<{ key: string; value: PlacePoints } | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', close); };
  }, [open]);

  if (!doc) return null;
  const base = fileBase(doc);
  const placeCount = doc.days.reduce((sum, day) => sum + day.items.length, 0);
  const dayLinks = doc.days.flatMap((day) => {
    const url = dayDirectionsUrl(day, doc.travel_mode);
    return url ? [{ day, url }] : [];
  });

  const run = async (label: string, task: () => Promise<string | void>) => {
    setBusy(label);
    setStatus('');
    try {
      setStatus((await task()) || `${label} downloaded.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `${label} could not be created.`);
    } finally {
      setBusy(null);
    }
  };

  const locate = async () => {
    const request = pointsRequest(doc);
    const key = JSON.stringify(request);
    if (points.current?.key !== key) {
      setStatus('Finding your places on the map. The first time can take up to a minute.');
      const response = await apiFetch<{ points: ({ id: string } & LatLon)[] }>('/api/exports/points', { method: 'POST', body: key });
      if (!response.ok || !response.data) throw new Error(response.error || 'Could not find the places on the map.');
      points.current = { key, value: Object.fromEntries(response.data.points.map(({ id, lat, lon }) => [id, { lat, lon }])) };
    }
    const found = Object.keys(points.current.value).length;
    if (!found) throw new Error('None of the places could be found on the map yet.');
    return { value: points.current.value, note: `${found} of ${placeCount} places located (© OpenStreetMap contributors).` };
  };

  const mapFile = (label: string, extension: string, type: string, build: (p: PlacePoints) => string) => () =>
    run(label, async () => {
      const { value, note } = await locate();
      download(`${base}.${extension}`, build(value), type);
      return `${label} downloaded. ${note}`;
    });

  const ics = doc.start_date ? toIcs(doc) : null;
  const disabled = busy !== null;

  return (
    <div className="tv-export" ref={root}>
      <button type="button" className="tv-export__trigger" aria-haspopup="true" aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!busy) setStatus(''); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        Export
      </button>
      {open && (
        <div className="tv-export__panel" role="group" aria-label="Export this trip">
          {pdf && <button type="button" disabled={disabled} onClick={pdf}><strong>PDF</strong><small>Every page, ready to print or share</small></button>}
          <button type="button" disabled={disabled || !ics} onClick={() => run('Calendar', async () => { download(`${base}.ics`, ics!, 'text/calendar'); })}>
            <strong>Calendar (.ics)</strong>
            <small>{ics ? 'Google, Apple or Outlook Calendar' : 'Add a start date to the trip brief to get a calendar'}</small>
          </button>
          <button type="button" disabled={disabled || !placeCount} onClick={mapFile('GPX', 'gpx', 'application/gpx+xml', (p) => toGpx(doc, p))}>
            <strong>GPX</strong><small>Organic Maps, Maps.me and GPS apps</small>
          </button>
          <button type="button" disabled={disabled || !placeCount} onClick={mapFile('KML', 'kml', 'application/vnd.google-earth.kml+xml', (p) => toKml(doc, p))}>
            <strong>KML</strong><small>Google My Maps and Google Earth</small>
          </button>
          <button type="button" disabled={disabled} onClick={() => run('Budget', async () => {
            download(`${base}-budget.csv`, budgetCsv(await getTripBudget(doc.trip_id)), 'text/csv;charset=utf-8');
          })}>
            <strong>Budget (.csv)</strong><small>Excel, Numbers or Google Sheets</small>
          </button>
          <button type="button" disabled={disabled} onClick={() => run('Trip data', async () => {
            download(`${base}.json`, JSON.stringify(doc, null, 2), 'application/json');
          })}>
            <strong>Everything (.json)</strong><small>The whole trip, for backups and other tools</small>
          </button>
          {dayLinks.length > 0 && (
            <div className="tv-export__days">
              <span>Directions in Google Maps</span>
              <ul>
                {dayLinks.map(({ day, url }) => (
                  <li key={day.day}><a href={url} target="_blank" rel="noopener noreferrer">Day {day.day} · {day.base}</a></li>
                ))}
              </ul>
            </div>
          )}
          <p className="tv-export__status" role="status" aria-live="polite">{busy ? `Preparing ${busy}…` : status}</p>
        </div>
      )}
    </div>
  );
}
