export function ConceptCard({ title, summary, example, pitfall, exampleTag = "例子" }: { title: string; summary: string; example: string; pitfall: string; exampleTag?: string }) {
  return (
    <details className="c">
      <summary>
        <span>
          <span className="t">{title}</span>
          <span className="s">{summary}</span>
        </span>
      </summary>
      <div className="c-body">
        <p><span className="tag ex">{exampleTag}</span>{example}</p>
        <p><span className="tag warn">誤區</span>{pitfall}</p>
      </div>
    </details>
  );
}
