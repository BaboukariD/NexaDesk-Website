import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getUserId();
  const [items, notes] = await Promise.all([
    prisma.vocabItem.findMany({ where: { userId, root: { not: null } }, orderBy: { root: "asc" } }),
    prisma.rootNote.findMany({ where: { userId } }),
  ]);

  const noteByRoot = new Map(notes.map((n) => [n.root, n]));
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const root = item.root!;
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(item);
  }

  const result = [...groups.entries()]
    .map(([root, groupItems]) => ({
      root,
      items: groupItems.map((i) => ({ id: i.id, arabic: i.arabic, english: i.english })),
      note: noteByRoot.get(root)
        ? { quranRef: noteByRoot.get(root)!.quranRef, quranSnippet: noteByRoot.get(root)!.quranSnippet }
        : null,
    }))
    .sort((a, b) => b.items.length - a.items.length);

  return NextResponse.json(result);
}
