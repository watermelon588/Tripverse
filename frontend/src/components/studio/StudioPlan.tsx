/*
 * StudioPlan — the trip document as a readable day-by-day plan.
 * Overview shows every day; a selected day groups its places by time of day.
 */
import type { TripDocument, TripDocumentItem } from '../../services/tripService';

interface Props {
  document: TripDocument;
  day: number | null;
  onSelectDay: (day: number | null) => void;
}

const SLOTS: { key: TripDocumentItem['time_of_day']; label: string }[] = [
  { key: 'morning', label: 'Morning' }, { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' }, { key: null, label: 'Any time' },
];

export const dayDate = (iso: string | null, style: 'short' | 'long' = 'short') => iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, style === 'long'
    ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' })
  : null;

export const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
};

const sourceLabel = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, '').split('.')[0]; } catch { return 'source'; }
};

function Item({ item, currency }: { item: TripDocumentItem; currency: string }) {
  return (
    <li className="tv-plan__item">
      <div>
        <strong>{item.name}</strong>
        <span className="tv-plan__meta">
          {item.category}{item.area ? ` · ${item.area}` : ''}
          {item.est_cost !== null ? ` · ~${money(item.est_cost, currency)} pp` : ''}
          {item.duration_hours ? ` · ${item.duration_hours} h` : ''}
        </span>
      </div>
      {item.tip && (
        <p className="tv-plan__tip">
          “{item.tip}”
          {item.source_url && <> <a href={item.source_url} target="_blank" rel="noreferrer">via {sourceLabel(item.source_url)}</a></>}
        </p>
      )}
    </li>
  );
}

export function StudioPlan({ document, day, onSelectDay }: Props) {
  const currency = document.budget.currency;
  if (!document.days.length) {
    return <p className="tv-plan__empty">The plan appears here once your itinerary is drafted.</p>;
  }

  if (day === null) {
    return (
      <div className="tv-plan tv-plan--overview">
        {document.days.map((entry) => (
          <button key={entry.day} type="button" className="tv-plan__daycard" onClick={() => onSelectDay(entry.day)}>
            <span className="tv-label">DAY {entry.day}{entry.date ? ` · ${dayDate(entry.date)?.toUpperCase()}` : ''}</span>
            <strong>{entry.base}</strong>
            <span>
              {entry.items.filter((item) => !item.option).slice(0, 3).map((item) => item.name).join(', ')
                || (entry.items.length ? `${entry.items.length} options to choose from` : 'Open day')}
            </span>
          </button>
        ))}
      </div>
    );
  }

  const current = document.days.find((entry) => entry.day === day);
  if (!current) return null;
  const planned = current.items.filter((item) => !item.option);
  const options = current.items.filter((item) => item.option);
  return (
    <article className="tv-plan">
      <header className="tv-plan__head">
        <span className="tv-label">DAY {current.day} OF {document.days.length}</span>
        <h2>{current.base}</h2>
        {current.date && <p>{dayDate(current.date, 'long')}</p>}
      </header>
      {SLOTS.map((slot) => {
        const items = planned.filter((item) => item.time_of_day === slot.key);
        return items.length ? (
          <section key={slot.label} className="tv-plan__slot" aria-label={slot.label}>
            <h3>{slot.label}</h3>
            <ul>{items.map((item) => <Item key={item.name} item={item} currency={currency} />)}</ul>
          </section>
        ) : null;
      })}
      {options.length > 0 && (
        <section className="tv-plan__slot tv-plan__slot--options" aria-label="Pick one">
          <h3>Pick one</h3>
          <ul>{options.map((item) => <Item key={item.name} item={item} currency={currency} />)}</ul>
        </section>
      )}
      {!current.items.length && <p className="tv-plan__empty">Nothing planned for this day yet.</p>}
    </article>
  );
}
