'use client';

import { useState } from 'react';
import type { Field, Layout, SectionValue } from '@/lib/cms/types';
import { FieldInput } from './FieldInput';

/* A flexible field (ACF "flexible content"): a list of sections, each using one of the field's layouts.
   Sections can be added anywhere, reordered, duplicated, collapsed and removed. */

let nextKey = 1;

function summary(s: SectionValue): string {
  for (const k of ['heading', 'eyebrow', 'form_heading', 'text', 'note', 'caption']) {
    const v = s[k];
    if (typeof v === 'string' && v.trim()) return v.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  }
  return '';
}

export function SectionsField({ field, value, onChange, error }: {
  field: Field; value: unknown; onChange: (v: SectionValue[]) => void; error?: string;
}) {
  const layouts = field.layouts ?? [];
  const sections = Array.isArray(value) ? (value as SectionValue[]) : [];
  // Stable keys for the sections on screen (sections have no IDs of their own), kept in step with every change.
  const [keys, setKeys] = useState<number[]>(() => sections.map(() => nextKey++));
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const [picker, setPicker] = useState<number | null>(null); // where a new section goes
  const k = keys.length === sections.length ? keys : sections.map((_, i) => keys[i] ?? nextKey++);
  if (k !== keys) setKeys(k);

  const commit = (next: SectionValue[], nextKeys: number[]) => {
    setKeys(nextKeys);
    onChange(next);
  };
  const layoutOf = (name: string) => layouts.find((l) => l.name === name);

  const add = (at: number, layout: Layout) => {
    const key = nextKey++;
    commit([...sections.slice(0, at), { layout: layout.name }, ...sections.slice(at)], [...k.slice(0, at), key, ...k.slice(at)]);
    setOpen((o) => new Set(o).add(key));
    setPicker(null);
  };
  const move = (i: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const s = [...sections];
    const kk = [...k];
    [s[i], s[to]] = [s[to], s[i]];
    [kk[i], kk[to]] = [kk[to], kk[i]];
    commit(s, kk);
  };
  const duplicate = (i: number) => {
    const key = nextKey++;
    const copy = structuredClone(sections[i]);
    commit([...sections.slice(0, i + 1), copy, ...sections.slice(i + 1)], [...k.slice(0, i + 1), key, ...k.slice(i + 1)]);
    setOpen((o) => new Set(o).add(key));
  };
  const remove = (i: number) => {
    const label = layoutOf(sections[i].layout)?.label ?? 'section';
    if (!window.confirm(`Remove this ${label} section?`)) return;
    commit(sections.filter((_, j) => j !== i), k.filter((_, j) => j !== i));
  };
  const set = (i: number, name: string, v: unknown) => onChange(sections.map((s, j) => (j === i ? { ...s, [name]: v } : s)));
  const toggle = (key: number) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  const allOpen = sections.length > 0 && k.every((key) => open.has(key));

  return (
    <div className="cms-label cms-sections">
      <div className="cms-sections__head">
        <span>{field.label}</span>
        {sections.length > 1 && (
          <button type="button" className="cms-link-btn" onClick={() => setOpen(allOpen ? new Set() : new Set(k))}>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>
      {field.help && <span className="cms-muted">{field.help}</span>}
      {error && <span className="cms-error">{error}</span>}

      <ol className="cms-sections__list">
        {sections.map((s, i) => {
          const layout = layoutOf(s.layout);
          const key = k[i];
          const isOpen = open.has(key);
          const sum = summary(s);
          return (
            <li key={key} className={`cms-section${isOpen ? ' is-open' : ''}`}>
              <div className="cms-section__bar">
                <button type="button" className="cms-section__toggle" aria-expanded={isOpen} onClick={() => toggle(key)}>
                  <span className="cms-section__num">{i + 1}</span>
                  <span className="cms-section__name">{layout?.label ?? `Unknown section (${s.layout})`}</span>
                  {sum && <span className="cms-section__sum">{sum}</span>}
                </button>
                <span className="cms-rowbtns">
                  <button type="button" className="cms-tool" title="Move up" aria-label={`Move section ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
                  <button type="button" className="cms-tool" title="Move down" aria-label={`Move section ${i + 1} down`} disabled={i === sections.length - 1} onClick={() => move(i, i + 1)}>↓</button>
                  <button type="button" className="cms-tool" title="Add a section below" aria-label={`Add a section below section ${i + 1}`} onClick={() => setPicker(picker === i + 1 ? null : i + 1)}>＋</button>
                  <button type="button" className="cms-tool" title="Duplicate" aria-label={`Duplicate section ${i + 1}`} onClick={() => duplicate(i)}>⧉</button>
                  <button type="button" className="cms-tool cms-tool--danger" title="Remove" aria-label={`Remove section ${i + 1}`} onClick={() => remove(i)}>✕</button>
                </span>
              </div>
              {isOpen && (
                <div className="cms-section__body">
                  {layout?.help && <p className="cms-muted">{layout.help}</p>}
                  {layout && layout.fields.length === 0 && <p className="cms-muted">This section has nothing to fill in.</p>}
                  {layout?.fields.map((f) => (
                    <FieldInput key={f.name} idPrefix={`s${key}-`} field={f} value={s[f.name]} onChange={(v) => set(i, f.name, v)} />
                  ))}
                  {!layout && <p className="cms-error">The website doesn&apos;t know this kind of section. Remove it or update the CMS.</p>}
                </div>
              )}
              {picker === i + 1 && <LayoutPicker layouts={layouts} onPick={(l) => add(i + 1, l)} onClose={() => setPicker(null)} />}
            </li>
          );
        })}
      </ol>

      {sections.length === 0 && <p className="cms-muted">No sections yet. Add the first one below.</p>}
      {picker === -1 ? (
        <LayoutPicker layouts={layouts} onPick={(l) => add(sections.length, l)} onClose={() => setPicker(null)} />
      ) : (
        <button type="button" className="cms-btn" onClick={() => setPicker(-1)}>Add section</button>
      )}
    </div>
  );
}

function LayoutPicker({ layouts, onPick, onClose }: { layouts: Layout[]; onPick: (l: Layout) => void; onClose: () => void }) {
  return (
    <div className="cms-layouts" role="group" aria-label="Choose a section">
      <div className="cms-layouts__head">
        <strong>Choose a section</strong>
        <button type="button" className="cms-link-btn" onClick={onClose}>Cancel</button>
      </div>
      <div className="cms-layouts__grid">
        {layouts.map((l) => (
          <button type="button" key={l.name} className="cms-layout" onClick={() => onPick(l)}>
            <strong>{l.label}</strong>
            {l.help && <span>{l.help}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Keeps each section's own fields (cleaned like top-level fields) and its layout. */
export function cleanSections(value: unknown, field: Field, clean: (v: Record<string, unknown>, fields: Field[]) => Record<string, unknown>) {
  if (!Array.isArray(value)) return [];
  return (value as SectionValue[]).flatMap((s) => {
    const layout = field.layouts?.find((l) => l.name === s.layout);
    return layout ? [{ layout: s.layout, ...clean(s, layout.fields) }] : [];
  });
}
