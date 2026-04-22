import { Pipe, PipeTransform } from '@angular/core';
import { LocaleService } from '../services/locale.service';

/**
 * Formats a EUR-based amount in the user's current currency & locale.
 * Pipe is impure so that a change in preferences re-renders all displayed prices.
 *
 * Usage: {{ product.price | localizedPrice }}
 */
@Pipe({
  name: 'localizedPrice',
  standalone: true,
  pure: false
})
export class LocalizedPricePipe implements PipeTransform {
  constructor(private localeService: LocaleService) {}

  transform(amountInEur: number | null | undefined): string {
    if (amountInEur === null || amountInEur === undefined || isNaN(amountInEur)) {
      return '';
    }
    return this.localeService.formatPrice(amountInEur);
  }
}
