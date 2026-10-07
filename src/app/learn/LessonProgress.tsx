"use client";
import { useUserData } from "@/lib/storage/useUserData";

export function LessonDone({ slug }: { slug: string }) {
  const [d] = useUserData();
  return d.lessonsDone.includes(slug) ? <span className="done">已讀</span> : null;
}

export function MarkDone({ slug }: { slug: string }) {
  const [d, update] = useUserData();
  const done = d.lessonsDone.includes(slug);
  return (
    <button
      type="button"
      className={done ? "btn ghost small" : "btn small"}
      onClick={() =>
        update((x) => ({ ...x, lessonsDone: done ? x.lessonsDone.filter((s) => s !== slug) : [...x.lessonsDone, slug] }))
      }
    >
      {done ? "已讀（取消）" : "標記為已讀"}
    </button>
  );
}
