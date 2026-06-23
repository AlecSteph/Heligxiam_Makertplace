import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  /**
   * Approximate exchange rates FROM EUR.
   * In production these would come from a real API (e.g. exchangerate.host).
   */
  private readonly rates: Record<string, number> = {
    EUR: 1,
    USD: 1.08,
    GBP: 0.85,
    CHF: 0.96,
    CAD: 1.48
  };

  /**
   * Currency symbols (fallback when Intl can't infer).
   */
  private readonly symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
    CAD: 'CA$'
  };

  /**
   * UI string translations for the keys that matter most.
   * Missing keys fall back to the French value (source of truth).
   */
  private readonly translations: Record<string, Record<string, string>> = {
    fr: {
      'action.addToCart': 'Ajouter au panier',
      'action.buyNow': 'Acheter maintenant',
      'action.save': 'Enregistrer les préférences',
      'action.saved': 'Préférences enregistrées',
      'price.free': 'Gratuit',
      'price.outOfStock': 'Rupture de stock',
      'price.inStock': 'En stock',
      'label.favorites': 'Favoris',
      'label.cart': 'Panier',
      'label.search': 'Rechercher',
      'label.account': 'Compte'
    },
    en: {
      'action.addToCart': 'Add to cart',
      'action.buyNow': 'Buy now',
      'action.save': 'Save preferences',
      'action.saved': 'Preferences saved',
      'price.free': 'Free',
      'price.outOfStock': 'Out of stock',
      'price.inStock': 'In stock',
      'label.favorites': 'Favorites',
      'label.cart': 'Cart',
      'label.search': 'Search',
      'label.account': 'Account'
    },
    es: {
      'action.addToCart': 'Añadir al carrito',
      'action.buyNow': 'Comprar ahora',
      'action.save': 'Guardar preferencias',
      'action.saved': 'Preferencias guardadas',
      'price.free': 'Gratis',
      'price.outOfStock': 'Agotado',
      'price.inStock': 'En stock',
      'label.favorites': 'Favoritos',
      'label.cart': 'Carrito',
      'label.search': 'Buscar',
      'label.account': 'Cuenta'
    },
    de: {
      'action.addToCart': 'In den Warenkorb',
      'action.buyNow': 'Jetzt kaufen',
      'action.save': 'Einstellungen speichern',
      'action.saved': 'Einstellungen gespeichert',
      'price.free': 'Kostenlos',
      'price.outOfStock': 'Nicht auf Lager',
      'price.inStock': 'Auf Lager',
      'label.favorites': 'Favoriten',
      'label.cart': 'Warenkorb',
      'label.search': 'Suchen',
      'label.account': 'Konto'
    },
    it: {
      'action.addToCart': 'Aggiungi al carrello',
      'action.buyNow': 'Compra ora',
      'action.save': 'Salva preferenze',
      'action.saved': 'Preferenze salvate',
      'price.free': 'Gratis',
      'price.outOfStock': 'Esaurito',
      'price.inStock': 'Disponibile',
      'label.favorites': 'Preferiti',
      'label.cart': 'Carrello',
      'label.search': 'Cerca',
      'label.account': 'Account'
    },
    pt: {
      'action.addToCart': 'Adicionar ao carrinho',
      'action.buyNow': 'Comprar agora',
      'action.save': 'Salvar preferências',
      'action.saved': 'Preferências salvas',
      'price.free': 'Grátis',
      'price.outOfStock': 'Esgotado',
      'price.inStock': 'Em estoque',
      'label.favorites': 'Favoritos',
      'label.cart': 'Carrinho',
      'label.search': 'Pesquisar',
      'label.account': 'Conta'
    },
    nl: {
      'action.addToCart': 'In winkelwagen',
      'action.buyNow': 'Nu kopen',
      'action.save': 'Voorkeuren opslaan',
      'action.saved': 'Voorkeuren opgeslagen',
      'price.free': 'Gratis',
      'price.outOfStock': 'Uitverkocht',
      'price.inStock': 'Op voorraad',
      'label.favorites': 'Favorieten',
      'label.cart': 'Winkelwagen',
      'label.search': 'Zoeken',
      'label.account': 'Account'
    },
    ar: {
      'action.addToCart': 'أضف إلى السلة',
      'action.buyNow': 'اشترِ الآن',
      'action.save': 'حفظ التفضيلات',
      'action.saved': 'تم حفظ التفضيلات',
      'price.free': 'مجاني',
      'price.outOfStock': 'غير متوفر',
      'price.inStock': 'متوفر',
      'label.favorites': 'المفضلة',
      'label.cart': 'السلة',
      'label.search': 'بحث',
      'label.account': 'الحساب'
    }
  };

  private readonly defaultLanguage: LanguageOption = {
    code: 'fr', label: 'Français - FR', short: 'FR', locale: 'fr-FR'
  };

  private readonly defaultCountry: CountryOption = {
    code: 'FR', label: 'France', flag: '🇫🇷', currency: 'EUR'
  };

  /**
   * Source unique de vérité (header, persistance, validation).
   */
  readonly languageOptions: LanguageOption[] = [
    { code: 'fr', label: 'Français - FR', short: 'FR', locale: 'fr-FR' },
    { code: 'en', label: 'English - EN', short: 'EN', locale: 'en-GB' },
    { code: 'es', label: 'Español - ES', short: 'ES', locale: 'es-ES' },
    { code: 'de', label: 'Deutsch - DE', short: 'DE', locale: 'de-DE' },
    { code: 'it', label: 'Italiano - IT', short: 'IT', locale: 'it-IT' },
    { code: 'pt', label: 'Português - PT', short: 'PT', locale: 'pt-PT' },
    { code: 'nl', label: 'Nederlands - NL', short: 'NL', locale: 'nl-NL' },
    { code: 'ar', label: 'العربية - AR', short: 'AR', locale: 'ar-SA' }
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

  /** Remap vers les objets canoniques (évite JSON partiel / localStorage corrompu). */
  resolveLanguage(code: string | undefined | null): LanguageOption {
    const found = this.languageOptions.find(l => l.code === code);
    return found ?? this.defaultLanguage;
  }

  resolveCountry(code: string | undefined | null): CountryOption {
    const found = this.countryOptions.find(c => c.code === code);
    return found ?? this.defaultCountry;
  }

  // ---------------------- Storage ----------------------
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
    document.documentElement.setAttribute('dir', lang.code === 'ar' ? 'rtl' : 'ltr');
  }

  // ---------------------- Public API ----------------------
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

  /**
   * Convert an amount expressed in EUR to the user's selected currency,
   * and format it with the correct locale conventions.
   */
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
   * Translate a key with fallback to French then to the key itself.
   * @param langOverride code langue (ex. sélection en cours dans le menu) pour prévisualiser sans enregistrer
   */
  t(key: string, langOverride?: string): string {
    const lang = langOverride ?? this.prefs.language.code;
    return this.translations[lang]?.[key]
        ?? this.translations['fr']?.[key]
        ?? key;
  }
}
