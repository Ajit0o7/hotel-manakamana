/* Small pagoda mark (header/footer logo). Same drawing as the favicon in app/icon.svg. */
export const MARK_STROKES = [
  'M12 1.8V3.5',
  'M10.7 5.3C10.8 3.8 13.2 3.8 13.3 5.3', 'M10 5.5H14',
  'M12 5.7L7.6 8.4Q7 8.8 6.2 8.7', 'M12 5.7L16.4 8.4Q17 8.8 17.8 8.7', 'M6.2 8.7Q12 10 17.8 8.7',
  'M9 9.5V12.3', 'M15 9.5V12.3',
  'M9 12.3H15', 'M9 12.3L4.8 15Q4.1 15.4 3.2 15.3', 'M15 12.3L19.2 15Q19.9 15.4 20.8 15.3', 'M3.2 15.3Q12 16.9 20.8 15.3',
  'M6.9 16.3V20.2', 'M17.1 16.3V20.2', 'M10.6 20.2V18.5Q12 17.3 13.4 18.5V20.2',
  'M5.2 20.3H18.8', 'M3.9 22.2H20.1',
];
export const MARK_DOME = 'M10.7 5.3C10.8 3.8 13.2 3.8 13.3 5.3Z';

export function PagodaMark({ className = 'logo__pagoda' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.1}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {MARK_STROKES.map((d) => <path key={d} d={d} />)}
      <path d={MARK_DOME} fill="currentColor" stroke="none" />
    </svg>
  );
}
