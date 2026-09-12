// One-time seed: the single user row everything else hangs off of,
// plus the 8 topics from the exam spec (section 5.8).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  await prisma.user.upsert({
    where: { name: "Djibril" },
    update: {},
    create: { name: "Djibril" },
  });

  for (const topic of TOPICS) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: topic,
      create: topic,
    });
  }

  console.log("Seeded: 1 user, 8 topics.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
