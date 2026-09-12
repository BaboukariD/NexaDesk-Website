import Link from "next/link";
import { LogoutButton } from "./logout-button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-12">
      <div>
        <p className="text-sm text-ink-muted">Signed in as Djibril</p>

        <p className="arabic-text mt-10 text-2xl text-ink" lang="ar">
          أَهْلًا وَسَهْلًا
        </p>

        <nav className="mt-10 flex flex-col gap-4">
          <Link href="/drills" className="text-ink underline underline-offset-2">
            Drill
          </Link>
          <Link href="/flashcards" className="text-ink underline underline-offset-2">
            Review flashcards
          </Link>
          <Link href="/vocab" className="text-ink underline underline-offset-2">
            Vocabulary
          </Link>
          <Link href="/upload" className="text-ink underline underline-offset-2">
            Upload
          </Link>
          <Link href="/weaknesses" className="text-ink underline underline-offset-2">
            Weaknesses
          </Link>
        </nav>
      </div>

      <LogoutButton />
    </main>
  );
}
