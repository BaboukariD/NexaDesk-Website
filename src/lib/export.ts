import { prisma } from "@/lib/prisma";

/** Everything a full data dump needs — used by both JSON export and the backup. */
export async function buildFullDump(userId: number) {
  const [vocab, dialogues, attempts, reviewStates, errorPatterns, stickyWords, rootNotes] = await Promise.all([
    prisma.vocabItem.findMany({ where: { userId }, include: { flashcards: true, topic: true } }),
    prisma.dialogue.findMany({ include: { lines: true } }),
    prisma.attempt.findMany({ where: { userId } }),
    prisma.reviewState.findMany({ where: { userId } }),
    prisma.errorPattern.findMany({ where: { userId } }),
    prisma.stickyWord.findMany({ where: { userId } }),
    prisma.rootNote.findMany({ where: { userId } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    vocab,
    dialogues,
    attempts,
    reviewStates,
    errorPatterns,
    stickyWords,
    rootNotes,
  };
}

export function vocabToCsv(vocab: { arabic: string; english: string; root: string | null; gender: string | null; plural: string | null; notes: string | null; sourceRef: string | null }[]): string {
  const header = "arabic,english,root,gender,plural,notes,source_ref";
  const escape = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const rows = vocab.map((v) =>
    [v.arabic, v.english, v.root, v.gender, v.plural, v.notes, v.sourceRef].map(escape).join(",")
  );
  return [header, ...rows].join("\n");
}

export async function runBackup(userId: number, trigger: "manual" | "weekly"): Promise<void> {
  const dump = await buildFullDump(userId);
  await prisma.backup.create({ data: { userId, trigger, data: JSON.stringify(dump) } });
  // Keep the last 12 of each kind only, so this doesn't grow forever.
  const old = await prisma.backup.findMany({
    where: { userId, trigger },
    orderBy: { createdAt: "desc" },
    skip: 12,
  });
  if (old.length > 0) {
    await prisma.backup.deleteMany({ where: { id: { in: old.map((b) => b.id) } } });
  }
}
