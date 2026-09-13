import Link from "next/link";
import { LogoutButton } from "../logout-button";

export default function MenuPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-12">
      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-ink-muted">Everything</p>
          <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
            Today
          </Link>
        </div>

        <p className="mt-10 text-xs uppercase text-ink-muted">Daily practice</p>
        <nav className="mt-2 flex flex-col gap-4">
          <Link href="/drills" className="text-ink underline underline-offset-2">
            Drill
          </Link>
          <Link href="/flashcards" className="text-ink underline underline-offset-2">
            Review flashcards
          </Link>
          <Link href="/vocab" className="text-ink underline underline-offset-2">
            Vocabulary
          </Link>
          <Link href="/sentence-builder" className="text-ink underline underline-offset-2">
            Sentence builder
          </Link>
          <Link href="/upload" className="text-ink underline underline-offset-2">
            Upload
          </Link>
        </nav>

        <p className="mt-8 text-xs uppercase text-ink-muted">Progress</p>
        <nav className="mt-2 flex flex-col gap-4">
          <Link href="/skills" className="text-ink underline underline-offset-2">
            Skills
          </Link>
          <Link href="/weaknesses" className="text-ink underline underline-offset-2">
            Weaknesses
          </Link>
          <Link href="/roots" className="text-ink underline underline-offset-2">
            Roots
          </Link>
          <Link href="/progress" className="text-ink underline underline-offset-2">
            Progress
          </Link>
        </nav>

        <p className="mt-8 text-xs uppercase text-ink-muted">Assessment</p>
        <nav className="mt-2 flex flex-col gap-4">
          <Link href="/organiser" className="text-ink underline underline-offset-2">
            Knowledge organisers
          </Link>
          <Link href="/assessment" className="text-ink underline underline-offset-2">
            Writing / speaking
          </Link>
          <Link href="/translation" className="text-ink underline underline-offset-2">
            Translation
          </Link>
          <Link href="/practice-paper" className="text-ink underline underline-offset-2">
            Practice paper
          </Link>
        </nav>

        <p className="mt-8 text-xs uppercase text-ink-muted">Other</p>
        <nav className="mt-2 flex flex-col gap-4">
          <Link href="/sticky-words" className="text-ink underline underline-offset-2">
            Sticky words
          </Link>
          <Link href="/cold-recall" className="text-ink underline underline-offset-2">
            Cold recall
          </Link>
          <Link href="/search" className="text-ink underline underline-offset-2">
            Search
          </Link>
          <Link href="/export" className="text-ink underline underline-offset-2">
            Export & backup
          </Link>
        </nav>
      </div>

      <LogoutButton />
    </main>
  );
}
