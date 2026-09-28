/*
 * CopilotPanel — build-with-agent controls above the composer.
 *
 * Each day is its own state: its plan, its ranked suggestions and the agent's
 * last notes for it all arrive with every reply. Switching days is purely
 * local, so it never waits on the agent. Only real decisions (add, remove,
 * finish, or a typed message) go to the server, tagged with the day on screen.
 */
import { MarkdownMessage } from './MarkdownMessage';

export interface CopilotItem {
  name: string;
  area?: string | null;
  category: string;
  est_cost: number | null;
  duration_hours: number;
  why?: string;
  source?: string | null;
}

export interface CopilotDay {
  day: number;
  base: string;
  items: CopilotItem[];
  suggestions?: string[];
  reply?: string;
}

export interface CopilotState {
  status: 'building' | 'complete';
  current_day: number;
  currency: string;
  budget: number | null;
  days: CopilotDay[];
  pool: CopilotItem[];
  last_suggestions: string[];
  profile: { travel_mode: string; pace: string };
  summary?: {
    committed: number;
    baseline: number;
    remaining: number | null;
    over: boolean;
    by_day: { day: number; cost: number; hours: number; capacity_hours: number }[];
  };
}

export type CopilotOp = Record<string, unknown> & { op: string };

interface Props {
  copilot: CopilotState;
  viewDay: number;
  onViewDay: (day: number) => void;
  disabled?: boolean;
  onOps: (ops: CopilotOp[], label: string, day: number) => void;
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

export function CopilotPanel({ copilot, viewDay, onViewDay, disabled, onOps }: Props) {
  const day = copilot.days[viewDay - 1] || copilot.days[0];
  if (!day) return null;
  const stats = copilot.summary?.by_day.find((entry) => entry.day === day.day);
  const suggestions = (day.suggestions ?? (day.day === copilot.current_day ? copilot.last_suggestions : []))
    .map((name) => copilot.pool.find((item) => item.name === name))
    .filter((item): item is CopilotItem => Boolean(item));
  const committed = copilot.summary?.committed ?? 0;
  const used = copilot.budget ? Math.min(100, committed / copilot.budget * 100) : 0;
  const complete = copilot.status === 'complete';
  const act = (ops: CopilotOp[], label: string) => onOps(ops, label, day.day);

  return (
    <section className="tv-copilot" aria-label="Build with the agent">
      <nav className="tv-copilot__days" aria-label="Trip days">
        {copilot.days.map((entry) => (
          <button key={entry.day} type="button" onClick={() => onViewDay(entry.day)}
            aria-current={entry.day === day.day ? 'step' : undefined}
            className={entry.day === day.day ? 'is-current' : ''}>
            <span>D{entry.day}{entry.day === copilot.current_day ? ' ·' : ''}</span>
            <small>{entry.items.length ? `${entry.items.length} planned` : entry.base}</small>
          </button>
        ))}
      </nav>

      <div className="tv-copilot__status">
        <p>
          <strong>Day {day.day} · {day.base}</strong>
          {stats && <span>{stats.hours} of {stats.capacity_hours} h planned · ~{money(stats.cost, copilot.currency)}</span>}
        </p>
        <div className={`tv-copilot__budget ${copilot.summary?.over ? 'is-over' : ''}`}>
          <span>
            {copilot.budget
              ? `Trip ~${money(committed, copilot.currency)} of ${money(copilot.budget, copilot.currency)}${copilot.summary?.over ? ' · over budget' : ''}`
              : `Trip ~${money(committed, copilot.currency)} · no budget set`}
          </span>
          {copilot.budget ? <i role="progressbar" aria-label="Budget used" aria-valuenow={Math.round(used)}
            aria-valuemin={0} aria-valuemax={100}><b style={{ width: `${used}%` }} /></i> : null}
          {copilot.summary?.baseline ? <small>incl. ~{money(copilot.summary.baseline, copilot.currency)} stay & food · flights in Budget</small> : null}
        </div>
      </div>

      <div className="tv-copilot__day">
        {day.items.length ? (
          <ul className="tv-copilot__plan" aria-label={`Day ${day.day} plan`}>
            {day.items.map((item) => (
              <li key={item.name}>
                <span>{item.name}{item.area ? <small> · {item.area}</small> : null}</span>
                <small>{item.est_cost !== null ? `~${money(item.est_cost, copilot.currency)}` : 'cost unknown'} · {item.duration_hours} h</small>
                {!complete && <button type="button" disabled={disabled} aria-label={`Remove ${item.name} from day ${day.day}`}
                  onClick={() => act([{ op: 'remove', name: item.name }], `Remove ${item.name} from day ${day.day}`)}>Remove</button>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="tv-copilot__empty">Nothing planned for day {day.day} yet. Tap a suggestion, or tell me what you'd like to do.</p>
        )}

        {!complete && suggestions.length > 0 && (
          <div className="tv-copilot__chips" aria-label={`Suggestions for day ${day.day}`}>
            {suggestions.map((item) => (
              <button key={item.name} type="button" disabled={disabled} title={item.why || undefined}
                onClick={() => act([{ op: 'add', name: item.name, day: day.day }], `Add ${item.name} to day ${day.day}`)}>
                + {item.name}
                {item.est_cost !== null && <small>~{money(item.est_cost, copilot.currency)}</small>}
              </button>
            ))}
          </div>
        )}

        {day.reply && day.day !== copilot.current_day && (
          <details className="tv-copilot__notes">
            <summary>Agent's notes for day {day.day}</summary>
            <MarkdownMessage content={day.reply} />
          </details>
        )}
      </div>

      <div className="tv-copilot__actions">
        {complete ? (
          <span className="tv-copilot__done">Itinerary complete. Chat to keep changing it.</span>
        ) : (
          <>
            {day.day > 1 && (
              <button type="button" className="tv-btn tv-btn--sm tv-btn--ghost" onClick={() => onViewDay(day.day - 1)}>
                Previous day
              </button>
            )}
            {day.day < copilot.days.length && (
              <button type="button" className="tv-btn tv-btn--sm tv-btn--ghost" onClick={() => onViewDay(day.day + 1)}>
                Next day
              </button>
            )}
            <button type="button" className={`tv-btn tv-btn--sm ${day.day === copilot.days.length ? 'tv-btn--primary' : 'tv-btn--ghost'}`}
              disabled={disabled} onClick={() => act([{ op: 'finish' }], 'Finish the itinerary')}>
              Finish itinerary
            </button>
          </>
        )}
      </div>
    </section>
  );
}
