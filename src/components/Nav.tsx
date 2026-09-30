"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "學習" },
  { href: "/trend", label: "趨勢" },
  { href: "/plan", label: "配置" },
  { href: "/portfolio", label: "持股" },
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="主要功能">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="tab" aria-current={path === l.href ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
