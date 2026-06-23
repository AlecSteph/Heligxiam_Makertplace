import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { COUNTRY_LABELS, LANGUAGE_NATIVE_LABELS, UI_TRANSLATIONS } from '../i18n/translations';
import { HOME_FOOTER_I18N } from '../i18n/home-footer.translations';

export interface LanguageOption {
  code: string;
  label: string;
  short: string;
  /** BCP 47 locale used for Intl formatting */
  locale: string;
}

export interface CountryOption {
  code: string;
  label: string;
  flag: string;
  currency: string;
}

export interface LocalePreferences {
  language: LanguageOption;
  country: CountryOption;
}

const STORAGE_KEY = 'heligxiam-locale-prefs';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly rates: Record<string, number> = {
    EUR: 1,
    USD: 1.08,
    GBP: 0.85,
    CHF: 0.96,
    CAD: 1.48
  };

  private readonly symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
    CAD: 'CA$'
  };

  private readonly translations = Object.fromEntries(
    Object.keys(UI_TRANSLATIONS).map((lang) => [
      lang,
      { ...UI_TRANSLATIONS[lang], ...(HOME_FOOTER_I18N[lang] ?? HOME_FOOTER_I18N['fr']) }
    ])
  );

  private readonly defaultLanguage: LanguageOption = {
    code: 'fr', label: 'Français', short: 'FR', locale: 'fr-FR'
  };

  private readonly defaultCountry: CountryOption = {
    code: 'FR', label: 'France', flag: '🇫🇷', currency: 'EUR'
  };

  readonly languageOptions: LanguageOption[] = [
    { code: 'fr', label: LANGUAGE_NATIVE_LABELS['fr'], short: 'FR', locale: 'fr-FR' },
    { code: 'en', label: LANGUAGE_NATIVE_LABELS['en'], short: 'EN', locale: 'en-GB' },
    { code: 'es', label: LANGUAGE_NATIVE_LABELS['es'], short: 'ES', locale: 'es-ES' },
    { code: 'de', label: LANGUAGE_NATIVE_LABELS['de'], short: 'DE', locale: 'de-DE' },
    { code: 'it', label: LANGUAGE_NATIVE_LABELS['it'], short: 'IT', locale: 'it-IT' },
    { code: 'pt', label: LANGUAGE_NATIVE_LABELS['pt'], short: 'PT', locale: 'pt-PT' },
    { code: 'nl', label: LANGUAGE_NATIVE_LABELS['nl'], short: 'NL', locale: 'nl-NL' },
    { code: 'ar', label: LANGUAGE_NATIVE_LABELS['ar'], short: 'AR', locale: 'ar-SA' }
  ];

  readonly countryOptions: CountryOption[] = [
    { code: 'FR', label: 'France', flag: '🇫🇷', currency: 'EUR' },
    { code: 'BE', label: 'Belgique', flag: '🇧🇪', currency: 'EUR' },
    { code: 'LU', label: 'Luxembourg', flag: '🇱🇺', currency: 'EUR' },
    { code: 'CH', label: 'Suisse', flag: '🇨🇭', currency: 'CHF' },
    { code: 'DE', label: 'Deutschland', flag: '🇩🇪', currency: 'EUR' },
    { code: 'ES', label: 'España', flag: '🇪🇸', currency: 'EUR' },
    { code: 'IT', label: 'Italia', flag: '🇮🇹', currency: 'EUR' },
    { code: 'UK', label: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
    { code: 'US', label: 'United States', flag: '🇺🇸', currency: 'USD' },
    { code: 'CA', label: 'Canada', flag: '🇨🇦', currency: 'CAD' }
  ];

  private prefsSubject = new BehaviorSubject<LocalePreferences>({
    language: this.languageOptions[0],
    country: this.countryOptions[0]
  });
  public prefs$ = this.prefsSubject.asObservable();

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key !== STORAGE_KEY || !e.newValue) return;
        try {
          const parsed = JSON.parse(e.newValue) as { language?: { code?: string }; country?: { code?: string } };
          const language = this.resolveLanguage(parsed.language?.code);
          const country = this.resolveCountry(parsed.country?.code);
          this.prefsSubject.next({ language, country });
          this.applyDocumentAttributes(language);
        } catch {
          /* ignore */
        }
      });
    }
  }

  resolveLanguage(code: string | undefined | null): LanguageOption {
    const found = this.languageOptions.find(l => l.code === code);
    return found ?? this.defaultLanguage;
  }

  resolveCountry(code: string | undefined | null): CountryOption {
    const found = this.countryOptions.find(c => c.code === code);
    return found ?? this.defaultCountry;
  }

  /** Libellé pays traduit selon la langue UI active. */
  countryLabel(countryCode: string, langOverride?: string): string {
    const lang = langOverride ?? this.prefs.language.code;
    return COUNTRY_LABELS[lang]?.[countryCode]
      ?? COUNTRY_LABELS['fr']?.[countryCode]
      ?? this.resolveCountry(countryCode).label;
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.applyDocumentAttributes(this.prefsSubject.value.language);
        return;
      }
      const parsed = JSON.parse(raw) as { language?: { code?: string }; country?: { code?: string } };
      const language = this.resolveLanguage(parsed.language?.code);
      const country = this.resolveCountry(parsed.country?.code);
      const next: LocalePreferences = { language, country };
      this.prefsSubject.next(next);
      this.applyDocumentAttributes(language);
    } catch {
      this.applyDocumentAttributes(this.prefsSubject.value.language);
    }
  }

  private persist(prefs: LocalePreferences): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore quota errors */
    }
  }

  private applyDocumentAttributes(lang: LanguageOption): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('lang', lang.code);
    // Layout toujours LTR : évite de retourner header/navigation en arabe
    document.documentElement.setAttribute('dir', 'ltr');
  }

  get prefs(): LocalePreferences {
    return this.prefsSubject.value;
  }

  setPreferences(language: LanguageOption, country: CountryOption): void {
    const lang = this.resolveLanguage(language.code);
    const ctry = this.resolveCountry(country.code);
    const next: LocalePreferences = { language: lang, country: ctry };
    this.prefsSubject.next(next);
    this.persist(next);
    this.applyDocumentAttributes(lang);
  }

  formatPrice(amountInEur: number): string {
    const { currency } = this.prefs.country;
    const { locale } = this.prefs.language;
    const rate = this.rates[currency] ?? 1;
    const converted = amountInEur * rate;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'symbol',
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
      }).format(converted);
    } catch {
      const sym = this.symbols[currency] ?? currency;
      return `${converted.toFixed(2)} ${sym}`;
    }
  }

  currencySymbol(): string {
    return this.symbols[this.prefs.country.currency] ?? this.prefs.country.currency;
  }

  /**
   * Traduit une clé avec repli FR puis clé brute.
   * @param params interpolation {name} dans la chaîne
   */
  t(key: string, langOverride?: string, params?: Record<string, string>): string {
    const lang = langOverride ?? this.prefs.language.code;
    let text = this.translations[lang]?.[key]
      ?? this.translations['fr']?.[key]
      ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return text;
  }
}
