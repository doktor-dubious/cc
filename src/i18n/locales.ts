import { GB, DK, SE, NO, FR, DE, ES } from 'country-flag-icons/react/3x2';

export const locales = ['en', 'da', 'sv', 'no', 'fr', 'de', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeConfig: Record<Locale, { label: string; flag: typeof GB }> = {
  en: { label: 'English',  flag: GB },
  da: { label: 'Dansk',    flag: DK },
  sv: { label: 'Svenska',  flag: SE },
  no: { label: 'Norsk',    flag: NO },
  fr: { label: 'Français', flag: FR },
  de: { label: 'Deutsch',  flag: DE },
  es: { label: 'Español',  flag: ES },
};
