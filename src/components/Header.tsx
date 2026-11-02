import Link from "next/link";
import { Wordmark } from "./Logo";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/roles", label: "Find a role" },
  { href: "/orgs", label: "Organisations" },
  { href: "/about", label: "About" },
];

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-3 z-40 px-4">
      <div className="mx-auto max-w-[1240px] flex items-center gap-3 md:gap-5 rounded-full bg-paper/80 backdrop-blur-md border border-sand-line pl-5 pr-2 py-2">
        <Link href="/" className="no-underline shrink-0" aria-label="Good Local Life – Phillip Island home">
          <Wordmark />
        </Link>
        <nav className="flex-1 min-w-0 flex justify-center overflow-x-auto">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap min-h-11 px-3 md:px-4 flex items-center rounded-full font-bold no-underline hover:bg-sand">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-1.5 shrink-0">
          <Link href="/org/dashboard" className="hidden sm:flex whitespace-nowrap h-11 px-4 items-center rounded-full font-bold no-underline hover:bg-sand">
            Post a need
          </Link>
          <Link
            href={user ? "/me" : "/sign-in"}
            className="whitespace-nowrap h-11 px-5 flex items-center rounded-full bg-navy text-white font-bold no-underline hover:bg-navy-deep hover:text-white"
          >
            {user ? "My volunteering" : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}
