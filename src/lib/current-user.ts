import { prisma } from "@/lib/prisma";
import { APP_USERNAME } from "@/lib/auth";

// Single-user app: every table hangs off one User row, created by the
// seed script. This just fetches its id.
export async function getUserId(): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({ where: { name: APP_USERNAME } });
  return user.id;
}
