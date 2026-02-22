'use server';

import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from '@/i18n/locales';

export async function setLocale(locale: string) {
  const cookieStore = await cookies();
  const resolvedLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  cookieStore.set('NEXT_LOCALE', resolvedLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
