/** One restrained visual primitive; meaningful state remains available without color. */
export function AttentionMark({ count, label }: { count: number; label: string }) {
  return count > 0 ? <span className="attention-mark" role="img" aria-label={`${count} ${label}`} title={`${count} ${label}`} /> : null;
}
