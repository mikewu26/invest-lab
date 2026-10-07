"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "總覽" },
  { href: "/plan", label: "計畫" },
  { href: "/portfolio", label: "持股" },
  { href: "/learn", label: "學習" },
  { href: "/trend", label: "趨勢" },
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="主要功能">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className="tab" aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
