import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_LESSONS, lessonIndex } from "@/content/catalog";
import { MarkDone } from "../LessonProgress";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const l = ALL_LESSONS.find((x) => x.slug === slug);
  return { title: l?.title ?? "課程" };
}

export default async function LessonPage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const i = lessonIndex(slug);
  if (i < 0) notFound();
  const l = ALL_LESSONS[i];
  const prev = ALL_LESSONS[i - 1];
  const next = ALL_LESSONS[i + 1];
  const { default: Body } = await import(`@/content/lessons/${slug}.mdx`);
  return (
    <article>
      <p className="crumb"><Link href="/learn">學習</Link> / {l.module.title}</p>
      <h1 style={{ marginTop: 6 }}>{l.title}</h1>
      <p className="lede">
        {l.personal && <span className="tag you">你的狀況</span>}
        {l.summary} · 約 {l.minutes} 分鐘
      </p>
      <div className="prose">
        <Body />
      </div>
      <div className="row" style={{ marginTop: 24 }}><MarkDone slug={slug} /></div>
      <nav className="lesson-nav" aria-label="上一課與下一課">
        {prev ? <Link href={`/learn/${prev.slug}`}>← {prev.title}</Link> : <span />}
        {next ? <Link href={`/learn/${next.slug}`}>{next.title} →</Link> : <Link href="/learn/portfolios">投資組合範例庫 →</Link>}
      </nav>
    </article>
  );
}
