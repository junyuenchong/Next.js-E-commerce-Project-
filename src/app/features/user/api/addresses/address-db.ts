import prisma from "@/app/lib/prisma";

/** After delete: if user still has rows and none default, mark the oldest as default. */
export async function ensureOneDefault(userId: number) {
  const count = await prisma.userAddress.count({
    where: { userId, isActive: true },
  });
  if (count === 0) return;
  const def = await prisma.userAddress.findFirst({
    where: { userId, isDefault: true, isActive: true },
  });
  if (def) return;
  const first = await prisma.userAddress.findFirst({
    where: { userId, isActive: true },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (first) {
    await prisma.userAddress.update({
      where: { id: first.id },
      data: { isDefault: true },
    });
  }
}
