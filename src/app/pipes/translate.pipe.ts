import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';
import { LocaleService } from '../services/locale.service';

/**
 * Traduit une clé selon la langue active (prefs LocaleService).
 * Pipe impur : se met à jour quand l'utilisateur change de langue.
 *
 * Usage: {{ 'header.nav.cart' | t }}
 */
@Pipe({
  name: 't',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private sub?: Subscription;
  private lang = '';

  constructor(
    private localeService: LocaleService,
    private cdr: ChangeDetectorRef
  ) {
    this.lang = this.localeService.prefs.language.code;
    this.sub = this.localeService.prefs$.subscribe((p) => {
      if (p.language.code !== this.lang) {
        this.lang = p.language.code;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  transform(key: string, params?: Record<string, string>): string {
    if (!key) return '';
    return this.localeService.t(key, undefined, params);
  }
}
