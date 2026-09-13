"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Section B: a visible search bar in the header of every page, no
// shortcut required. Two screens are deliberately exempt: /login has
// nothing to search, and /drills is the one screen section 7
// explicitly asks to keep "almost empty... no navigation" — adding
// chrome there would undo the thing that screen is for.
const EXEMPT_PREFIXES = ["/login", "/drills"];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  return (
    <div className="border-b border-line px-6 py-2 print:hidden">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }}
        className="mx-auto max-w-2xl"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a word or phrase — any script, Ctrl+K"
          className="w-full rounded-md border border-line bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
        />
      </form>
    </div>
  );
}
