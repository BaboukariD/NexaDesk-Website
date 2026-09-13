"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "./logout-button";

type Today = {
  date: string;
  block: { name: string; activity: string; route: string };
  cardsDue: number;
  topWeakness: string | null;
};

// Section D: open on what he is meant to be doing, not a menu.
// Removing the decision is the point — choosing what to do is where
// sessions die.
export default function TodayPage() {
  const [today, setToday] = useState<Today | null>(null);

  useEffect(() => {
    fetch("/api/today")
      .then((r) => r.json())
      .then(setToday);
  }, []);

  if (!today) return null;

  const dateLabel = new Date(today.date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-12">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-ink-muted">{dateLabel}</p>
        <p className="mt-2 text-2xl text-ink">{today.block.name}</p>
        <p className="mt-1 text-ink-muted">{today.block.activity}</p>

        <div className="mt-8 space-y-1 text-sm text-ink-muted">
          {today.cardsDue > 0 && <p>{today.cardsDue} card{today.cardsDue === 1 ? "" : "s"} due</p>}
          {today.topWeakness && <p>Still working on: {today.topWeakness}</p>}
        </div>

        <Link
          href={today.block.route}
          className="mt-10 rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper"
        >
          Start
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <Link href="/menu" className="text-sm text-ink-muted underline underline-offset-2">
          Everything else
        </Link>
        <LogoutButton />
      </div>
    </main>
  );
}
