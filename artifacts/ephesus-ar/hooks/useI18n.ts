import { useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import {
  LOCALE_INFO,
  SUPPORTED_LOCALES,
  normalizeLocale,
  translate,
  type Locale,
  type TranslationKey,
} from '@/lib/i18n';

/**
 * The single localisation hook used by app-owned screens.  The GameContext
 * remains the persistence boundary; this hook only normalises its value and
 * exposes translated copy plus RTL metadata to presentation components.
 */
export function useI18n() {
  const { language } = useGame();
  const locale = normalizeLocale(String(language));

  return useMemo(() => {
    const info = LOCALE_INFO[locale];
    return {
      locale,
      info,
      rtl: info.rtl,
      locales: SUPPORTED_LOCALES,
      t: (key: TranslationKey) => translate(locale, key),
    };
  }, [locale]);
}

export function localeDirection(locale: Locale): 'ltr' | 'rtl' {
  return LOCALE_INFO[locale].rtl ? 'rtl' : 'ltr';
}