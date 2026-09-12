import { LogoutButton } from "./logout-button";

// Step 1 of the build order: auth, database, a single empty page.
// This is deliberately bare — the drill screen and everything else
// comes later. The vowelled line below is a standing smoke test for
// tashkeel rendering at this font and line height; keep it here until
// the lesson view exists and can take over that job.

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-12">
      <div>
        <p className="text-sm text-ink-muted">Signed in as Djibril</p>

        <p className="arabic-text mt-10 text-2xl text-ink" lang="ar">
          أَهْلًا وَسَهْلًا
        </p>
        <p className="mt-2 text-sm text-ink-muted">Welcome.</p>
      </div>

      <LogoutButton />
    </main>
  );
}
