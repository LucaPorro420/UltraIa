'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from '@ultraia/core';

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}