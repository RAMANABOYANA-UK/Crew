import { useId } from 'react';

// =============================================================
// Canonical Tabs component — underline variant. Powers profile
// tabs, Time Off sub-tabs. Segmented/pill variant lives below.
// =============================================================
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function Tabs({
  items,
  active,
  onChange,
  className = '',
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={`crew-tabs ${className}`}>
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={active === it.id}
          disabled={it.disabled}
          onClick={() => onChange(it.id)}
          className="crew-tabs__t"
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================
// Segmented control (`.crew-seg`) — visually-hidden radios +
// labels styled as pills (Cirrus Day/Week/Month/Year pattern).
// No JS required for the visual state; onChange reads the value.
// =============================================================
export interface SegOption<T extends string> {
  value: T;
  label: React.ReactNode;
  ariaLabel?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
  className = '',
  ariaLabel,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  name?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const autoId = useId();
  const group = name ?? autoId;
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`crew-seg ${className}`}>
      {options.map((opt) => {
        const id = `seg-${group}-${opt.value}`;
        return (
          <span key={opt.value}>
            <input
              type="radio"
              id={id}
              className="crew-seg__r"
              name={group}
              value={opt.value}
              aria-label={opt.ariaLabel ?? String(opt.label)}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <label className="crew-seg__l" htmlFor={id}>
              {opt.label}
            </label>
          </span>
        );
      })}
    </div>
  );
}