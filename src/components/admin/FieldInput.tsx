'use client';

import { fromLocalInput, toLocalInput } from '@/lib/cms/format';
import type { Field } from '@/lib/cms/types';
import { cleanRows, GalleryField, TableField } from './CollectionFields';
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
    case 'gallery':
      input = <GalleryField value={value} onChange={onChange} />;
      break;
    case 'table':
      input = <TableField columns={f.columns ?? []} value={value} onChange={onChange} label={f.label} />;
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

  const labelled = ['richtext', 'media', 'gallery', 'table'].includes(f.type);
  return (
    <div className="cms-label">
      {labelled ? <span>{f.label}{f.required && ' *'}</span> : <label htmlFor={id}>{f.label}{f.required && ' *'}</label>}
      {f.help && <span className="cms-muted">{f.help}</span>}
      {input}
      {props.error && <span className="cms-error">{props.error}</span>}
    </div>
  );
}

/** Keeps only the given fields, dropping empty values and rows, before
    sending them to the API. Fields of another template are left out too. */
export function cleanFields(values: Record<string, unknown>, fields: Field[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (v === null || v === undefined || v === '') continue;
    if (f.type === 'table') {
      const rows = cleanRows(Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
      if (rows.length) out[f.name] = rows;
    } else if (f.type === 'list') {
      const items = (Array.isArray(v) ? v : []).map((x) => String(x).trim()).filter(Boolean);
      if (items.length) out[f.name] = items;
    } else if (f.type === 'gallery') {
      if (Array.isArray(v) && v.length) out[f.name] = v;
    } else {
      out[f.name] = v;
    }
  }
  return out;
}
