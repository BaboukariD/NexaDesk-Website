import { prisma } from "@/lib/prisma";

// "Four skills, tracked separately... one score hides that" (5.8).
// Deliberately not collapsed into a single number anywhere in this
// file or its callers.

export const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
export type Skill = (typeof SKILLS)[number];

function assessmentSkillFor(taskType: string): Skill | null {
  if (taskType === "writing") return "writing";
  if (taskType.startsWith("speaking_")) return "speaking";
  return null;
}

export async function getSkillBreakdown(userId: number) {
  const [attempts, assessmentAttempts, patterns] = await Promise.all([
    prisma.attempt.findMany({ where: { userId, skill: { not: null } }, select: { skill: true, correct: true, createdAt: true } }),
    prisma.assessmentAttempt.findMany({
      where: { userId },
      include: { task: { select: { type: true } } },
    }),
    prisma.errorPattern.findMany({ where: { userId, retired: false, frequency: { gt: 0 }, skill: { not: null } } }),
  ]);

  return SKILLS.map((skill) => {
    const drillForSkill = attempts.filter((a) => a.skill === skill);
    const assessmentForSkill = assessmentAttempts.filter((a) => assessmentSkillFor(a.task.type) === skill);

    const drillCorrect = drillForSkill.filter((a) => a.correct).length;
    // Assessment scores are out of 5 per criterion (15 total) — folded
    // onto the same 0-100 scale as drill accuracy so one percentage
    // can represent the skill, per "each skill gets its own progress
    // line" (a single number per line, not a single number overall).
    const assessmentPct = assessmentForSkill.map(
      (a) => ((a.contentScore + a.accuracyScore + a.rangeScore) / 15) * 100
    );

    const totalEvents = drillForSkill.length + assessmentForSkill.length;
    const overallPct =
      totalEvents === 0
        ? null
        : (drillCorrect * 100 + assessmentPct.reduce((s, p) => s + p, 0)) / totalEvents;

    return {
      skill,
      overallPct,
      eventCount: totalEvents,
      weaknesses: patterns.filter((p) => p.skill === skill).map((p) => p.description),
    };
  });
}
