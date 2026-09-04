'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, destroySession, prisma } from '@ultraia/core';

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await destroySession(prisma, token); // H01: destroy server-side session
  }
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}