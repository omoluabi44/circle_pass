import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function checkRole(role: string) {
  const user = await getCurrentUser();
  return user?.role === role;
}
