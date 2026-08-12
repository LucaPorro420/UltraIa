import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma, SESSION_COOKIE, getSessionUser } from '@ultraia/core';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return getSessionUser(prisma, token);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function optionalUser() {
  return getCurrentUser();
}
