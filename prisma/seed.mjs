// One-time seed: the single user row everything else hangs off of,
// plus the 8 topics from the exam spec (section 5.8).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Djibril's known error patterns (section 5.3) — seeded so the
// weaknesses view and the drill weighting have something real to work
// with from day one, rather than waiting for the pattern to be
// rediscovered from scratch. skill lets 5.8's per-skill weaknesses
// lists filter rather than showing one merged list.
const ERROR_PATTERNS = [
  {
    key: "maadha_vs_ayna",
    description: "Reads ماذا (what) as أين (where)",
    skill: "reading",
    exampleItems: ["ماذا", "أين"],
  },
  {
    key: "verb_prefix",
    description: "Uses the ت (you/she) verb prefix where أ (I) is needed",
    skill: "writing",
    exampleItems: ["أدرس", "تدرس", "أسكن", "تسكن"],
  },
  {
    key: "feminine_default",
    description: "Defaults to feminine forms when describing himself",
    skill: "writing",
    exampleItems: ["طالبة", "إيطالية"],
  },
  {
    key: "sharika_sharjah_balad",
    description: "Mixes up شركة (company), الشارقة (Sharjah), and بلد (country)",
    skill: "reading",
    exampleItems: ["شركة", "الشارقة", "بلد"],
  },
  {
    key: "possessive_suffix_pressure",
    description: "Knows the possessive-suffix system but reaches for the wrong one under time pressure",
    skill: "writing",
    exampleItems: ["أسرته", "أسرتها", "أسرتهم"],
  },
  {
    key: "sticky_vocabulary",
    description: "Words that have needed three or more exposures to stick",
    skill: "reading",
    exampleItems: ["فندق", "مركز", "أشخاص", "معلم", "يتحدث", "متى", "بعض", "بعد"],
  },
];

const TOPICS = [
  { slug: "introductions", nameAr: "التعارف", nameEn: "Introductions", order: 1 },
  { slug: "family", nameAr: "أسرتي", nameEn: "Family", order: 2 },
  { slug: "housing", nameAr: "السكن", nameEn: "Housing", order: 3 },
  { slug: "food", nameAr: "الطعام والشراب", nameEn: "Food and drink", order: 4 },
  { slug: "daily-life", nameAr: "حياتنا اليومية", nameEn: "Daily life", order: 5 },
  { slug: "weather", nameAr: "كيف الجو؟", nameEn: "Weather", order: 6 },
  { slug: "shopping", nameAr: "التسوق", nameEn: "Shopping", order: 7 },
  { slug: "health", nameAr: "الصحة", nameEn: "Health", order: 8 },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { name: "Djibril" },
    update: {},
    create: { name: "Djibril" },
  });

  for (const pattern of ERROR_PATTERNS) {
    await prisma.errorPattern.upsert({
      where: { userId_key: { userId: user.id, key: pattern.key } },
      update: { skill: pattern.skill },
      create: {
        userId: user.id,
        key: pattern.key,
        description: pattern.description,
        skill: pattern.skill,
        exampleItems: JSON.stringify(pattern.exampleItems),
      },
    });
  }

  for (const topic of TOPICS) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: topic,
      create: topic,
    });
  }

  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // The standing home for hand-entered vocab (section 5.4's "manually
  // from anything he highlights"), separate from any uploaded book.
  const manualBook = await prisma.book.upsert({
    where: { title: "Manual additions" },
    update: {},
    create: { title: "Manual additions", source: "manual" },
  });
  const manualUnit = await prisma.unit.upsert({
    where: { bookId_number: { bookId: manualBook.id, number: 0 } },
    update: {},
    create: { bookId: manualBook.id, number: 0, titleAr: "إضافات", titleEn: "Manual additions" },
  });
  await prisma.lesson.upsert({
    where: { unitId_number: { unitId: manualUnit.id, number: 0 } },
    update: {},
    create: { unitId: manualUnit.id, number: 0, section: "manual" },
  });

  // The exact substitution-table example from section 5.8, so the
  // sentence-builder view has something real to show immediately
  // rather than starting empty.
  const familyTopic = await prisma.topic.findUniqueOrThrow({ where: { slug: "family" } });
  const familySet = await prisma.sentenceBuilderSet.upsert({
    where: { topicId_titleAr: { topicId: familyTopic.id, titleAr: "أسرتي" } },
    update: {},
    create: { topicId: familyTopic.id, titleAr: "أسرتي" },
  });
  const existingColumns = await prisma.sentenceBuilderColumn.count({ where: { setId: familySet.id } });
  if (existingColumns === 0) {
    const columns = [
      { order: 1, label: "subject", options: [["أَبِي", "my father"], ["أَخِي", "my brother"], ["جَدِّي", "my grandfather"]] },
      { order: 2, label: "verb", options: [["يَعْمَلُ", "works"], ["يَدْرُسُ", "studies"], ["يَسْكُنُ", "lives"]] },
      { order: 3, label: "object", options: [["فِي الْمَدْرَسَةِ", "at the school"], ["فِي الْجَامِعَةِ", "at the university"], ["فِي دُبَيَّ", "in Dubai"]] },
      { order: 4, label: "time", options: [["كُلَّ يَوْمٍ", "every day"], ["فِي الصَّبَاحِ", "in the morning"], ["الْآنَ", "now"]] },
    ];
    for (const col of columns) {
      const column = await prisma.sentenceBuilderColumn.create({
        data: { setId: familySet.id, order: col.order, label: col.label },
      });
      for (const [arabic, gloss] of col.options) {
        await prisma.sentenceBuilderOption.create({ data: { columnId: column.id, arabic, gloss } });
      }
    }
  }

  // Section I's explicit seed list, with the glosses Djibril has
  // already given for these words.
  const STICKY_SEED = [
    ["فُنْدُقٌ", "hotel"],
    ["مَرْكَزٌ", "center"],
    ["أَشْخَاصٌ", "people / persons"],
    ["مُعَلِّمٌ", "teacher"],
    ["يَتَحَدَّثُ", "he speaks"],
    ["مَتَى", "when"],
    ["بَعْضٌ", "some"],
    ["بَعْدَ", "after"],
    ["شَرِكَةٌ", "company"],
    ["بَلَدٌ", "country"],
  ];
  for (const [arabic, gloss] of STICKY_SEED) {
    await prisma.stickyWord.upsert({
      where: { userId_arabic: { userId: user.id, arabic } },
      update: {},
      create: { userId: user.id, arabic, gloss, active: true },
    });
  }

  console.log("Seeded: 1 user, 8 topics, settings, manual-entry book/unit/lesson, 6 known error patterns, 1 sentence-builder set, 10 sticky words.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
