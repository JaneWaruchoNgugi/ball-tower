/** Numbered "how it works" steps, shown before the first round in place of the history. */
export function Steps({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="steps" aria-label="How it works">
      {steps.map((s, i) => (
        <li key={s}>
          <b>{i + 1}</b>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}
