import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { Role } from "@/generated/prisma/client";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { clerkId: userId },
    include: { employee: true },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

export async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { employee: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        role: Role.EMPLOYEE,
        employee: {
          create: {
            firstName: clerkUser.firstName || "New",
            lastName: clerkUser.lastName || "User",
          },
        },
      },
      include: { employee: true },
    });
  }

  return user;
}