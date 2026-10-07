'use client';

import { fromLocalInput, toLocalInput } from '@/lib/cms/format';
import type { Field } from '@/lib/cms/types';
import { MediaField } from './MediaPicker';
import { RichTextEditor } from './RichTextEditor';

/** The right input for one custom field of a content type. */
export function FieldInput(props: { field: Field; value: unknown; onChange: (v: unknown) => void; error?: string }) {
  const { field: f, value, onChange } = props;
  const str = typeof value === 'string' ? value : value == null ? '' : String(value);
  const id = `field-${f.name}`;

  let input: React.ReactNode;
  switch (f.type) {
    case 'textarea':
      input = <textarea id={id} className="cms-input" rows={4} value={str} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'richtext':
      input = <RichTextEditor label={f.label} value={str} onChange={onChange} minimal />;
      break;
    case 'number':
    case 'integer':
      input = (
        <input
          id={id}
          className="cms-input cms-input--short"
          type="number"
          step={f.type === 'integer' ? 1 : 'any'}
          value={str}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );
      break;
    case 'boolean':
      return (
        <label className="cms-check">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          {f.label}
          {f.help && <span className="cms-muted"> — {f.help}</span>}
        </label>
      );
    case 'date':
      input = <input id={id} className="cms-input cms-input--short" type="date" value={str} onChange={(e) => onChange(e.target.value || null)} />;
      break;
    case 'datetime':
      input = (
        <input id={id} className="cms-input cms-input--short" type="datetime-local" value={toLocalInput(str || null)} onChange={(e) => onChange(fromLocalInput(e.target.value))} />
      );
      break;
    case 'select':
      input = (
        <select id={id} className="cms-input cms-input--short" value={str} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case 'list': {
      const items = Array.isArray(value) ? (value as string[]) : [];
      input = (
        <textarea
          id={id}
          className="cms-input"
          rows={3}
          placeholder="One item per line"
          value={items.join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n'))}
        />
      );
      break;
    }
    case 'media':
      input = <MediaField value={str || null} onChange={onChange} />;
      break;
    default:
      input = (
        <input
          id={id}
          className="cms-input"
          type={f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : 'text'}
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  const labelled = f.type === 'richtext' || f.type === 'media';
  return (
    <div className="cms-label">
      {labelled ? <span>{f.label}{f.required && ' *'}</span> : <label htmlFor={id}>{f.label}{f.required && ' *'}</label>}
      {f.help && <span className="cms-muted">{f.help}</span>}
      {input}
      {props.error && <span className="cms-error">{props.error}</span>}
    </div>
  );
}

/** Drops empty values and trims list items before sending fields to the API. */
export function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) {
      const items = v.map((x) => String(x).trim()).filter(Boolean);
      if (items.length) out[k] = items;
      continue;
    }
    out[k] = v;
  }
  return out;
}
