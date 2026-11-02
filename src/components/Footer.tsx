import Link from "next/link";
import { Wordmark } from "./Logo";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Volunteer terms" },
  { href: "/org/register", label: "For organisations" },
  { href: "mailto:hello@example.org", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-navy text-sand">
      <div className="mx-auto max-w-[1240px] px-6 py-12 flex flex-wrap gap-8 justify-between items-start">
        <div className="flex flex-col gap-3 text-white">
          <Wordmark />
          <p className="text-sand max-w-[40ch]">Volunteer roles from Phillip Island groups, in one place.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sand hover:text-amber">{l.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
