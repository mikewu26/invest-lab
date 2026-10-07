import Link from "next/link";
import type { Check } from "@/lib/calc/policy";

const LABEL = { ok: "正常", warn: "注意", bad: "優先處理", todo: "待填寫" } as const;

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="checks">
      {checks.map((c) => (
        <li key={c.id} className={`check ${c.status}`}>
          <span className={`state ${c.status}`}>{LABEL[c.status]}</span>
          <div>
            <b>{c.title}</b>
            <p>
              {c.detail}
              {c.lesson && (
                <>
                  {" "}
                  <Link href={`/learn/${c.lesson}`}>為什麼？</Link>
                </>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
