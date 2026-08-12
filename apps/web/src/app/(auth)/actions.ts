'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  assertStrongPassword,
  createSession,
  createWorkspace,
  hashPassword,
  prisma,
  verifyPassword,
} from '@ultraia/core';
import { z } from 'zod';

const credentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

async function issueSession(userId: string) {
  const { token, expiresAt } = await createSession(prisma, userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
  redirect('/dashboard');
}

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: 'Invalid email or password' };
  }
  await issueSession(user.id);
  return null;
}

export async function registerAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const parsed = credentialsSchema.extend({ name: z.string().trim().max(100).optional() }).safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  try {
    assertStrongPassword(parsed.data.password);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Weak password' };
  }
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: 'An account with this email already exists' };
  }
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name || null,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  await createWorkspace(prisma, { ownerId: user.id, name: `${user.name ?? user.email}'s workspace` });
  await issueSession(user.id);
  return null;
}
