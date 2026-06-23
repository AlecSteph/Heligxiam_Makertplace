import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (container: HTMLElement, params: { sitekey: string; theme?: string }) => number;
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class RecaptchaService {
  private readonly configUrl = 'http://localhost:3001/api/auth/recaptcha-config';
  private readonly hostIds = ['recaptcha-login-host', 'recaptcha-register-host', 'recaptcha-forgot-host'];
  private siteKey = '';
  private enabled = false;
  private scriptLoaded = false;
  private widgetId: number | null = null;
  private configLoaded = false;
  private placementObserver: MutationObserver | null = null;

  constructor(private http: HttpClient) {}

  async loadConfig(): Promise<void> {
    if (this.configLoaded) return;
    try {
      const cfg = await firstValueFrom(
        this.http.get<{ success: boolean; data: { enabled: boolean; siteKey: string } }>(this.configUrl)
      );
      this.enabled = !!cfg.data?.enabled;
      this.siteKey = cfg.data?.siteKey || '';
    } catch {
      this.enabled = false;
      this.siteKey = '';
    }
    this.configLoaded = true;
  }

  isEnabled(): boolean {
    return this.enabled && !!this.siteKey;
  }

  private loadScript(): Promise<void> {
    if (this.scriptLoaded || typeof window.grecaptcha !== 'undefined') {
      this.scriptLoaded = true;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="google.com/recaptcha/api.js"]');
      if (existing) {
        if (typeof window.grecaptcha !== 'undefined') {
          this.scriptLoaded = true;
          resolve();
          return;
        }
        existing.addEventListener('load', () => {
          this.scriptLoaded = true;
          resolve();
        });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Impossible de charger reCAPTCHA'));
      document.head.appendChild(script);
    });
  }

  private purgeOrphanWidgets(): void {
    this.stopPlacementObserver();
    this.hostIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
    document.querySelectorAll('iframe[src*="google.com/recaptcha"]').forEach((iframe) => {
      if (!iframe.closest('[id^="recaptcha-"]')) {
        iframe.parentElement?.remove();
      }
    });
    this.widgetId = null;
  }

  /** Replace le widget sous le bouton s'il a été injecté au mauvais endroit. */
  enforcePlacement(host: HTMLElement, submitButton?: HTMLElement | null): void {
    const form = host.closest('form');
    if (!form) return;

    const submit = submitButton ?? form.querySelector<HTMLElement>('[data-recaptcha-submit]');
    if (!submit) return;

    const footer = host.closest('.auth-form-footer') ?? form;

    // Remonter le bloc reCAPTCHA juste avant le bouton
    const block = host.closest('.recaptcha-block') as HTMLElement | null;
    if (block && block.parentElement === footer && block.nextElementSibling !== submit) {
      footer.insertBefore(block, submit);
    }

    // Déplacer les nœuds reCAPTCHA orphelins après le bouton vers le host
    let sibling = submit.nextElementSibling;
    while (sibling) {
      const next = sibling.nextElementSibling;
      const el = sibling as HTMLElement;
      if (this.isRecaptchaNode(el)) {
        while (el.firstChild) {
          host.appendChild(el.firstChild);
        }
        el.remove();
      }
      sibling = next;
    }

    // Si le host est vide, chercher le widget ailleurs dans le formulaire
    if (!host.querySelector('iframe[src*="recaptcha"]')) {
      const orphanIframe = form.querySelector('iframe[src*="google.com/recaptcha"]');
      if (orphanIframe) {
        const wrapper = orphanIframe.parentElement;
        host.appendChild(orphanIframe);
        if (wrapper && wrapper !== host && !wrapper.querySelector('iframe')) {
          wrapper.remove();
        }
      }
    }
  }

  private isRecaptchaNode(el: HTMLElement): boolean {
    if (el.querySelector('iframe[src*="google.com/recaptcha"]')) return true;
    if (el.tagName === 'IFRAME' && (el.getAttribute('src') ?? '').includes('recaptcha')) return true;
    return el.classList.contains('g-recaptcha') || !!el.querySelector('.g-recaptcha');
  }

  watchPlacement(host: HTMLElement, submitButton?: HTMLElement | null, durationMs = 3000): void {
    this.stopPlacementObserver();
    const form = host.closest('form');
    if (!form) return;

    const fix = () => this.enforcePlacement(host, submitButton ?? undefined);
    fix();

    this.placementObserver = new MutationObserver(() => fix());
    this.placementObserver.observe(form, { childList: true, subtree: true });
    setTimeout(() => this.stopPlacementObserver(), durationMs);
  }

  private stopPlacementObserver(): void {
    this.placementObserver?.disconnect();
    this.placementObserver = null;
  }

  async mount(host: HTMLElement, submitButton?: HTMLElement | null): Promise<void> {
    await this.loadConfig();
    if (!this.isEnabled()) return;

    await this.loadScript();
    this.purgeOrphanWidgets();
    host.innerHTML = '';

    await new Promise<void>((resolve, reject) => {
      if (!window.grecaptcha) {
        reject(new Error('reCAPTCHA indisponible'));
        return;
      }
      window.grecaptcha.ready(() => {
        try {
          this.widgetId = window.grecaptcha!.render(host, {
            sitekey: this.siteKey,
            theme: 'light'
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    this.enforcePlacement(host, submitButton);
    this.watchPlacement(host, submitButton);
  }

  unmount(host?: HTMLElement): void {
    this.stopPlacementObserver();
    if (this.widgetId !== null && window.grecaptcha) {
      try {
        window.grecaptcha.reset(this.widgetId);
      } catch {}
    }
    this.purgeOrphanWidgets();
    if (host) {
      host.innerHTML = '';
    }
  }

  getToken(): string {
    if (!this.isEnabled() || !window.grecaptcha) {
      return '';
    }
    if (this.widgetId !== null) {
      const byId = window.grecaptcha.getResponse(this.widgetId);
      if (byId) return byId;
    }
    try {
      return window.grecaptcha.getResponse() || '';
    } catch {
      return '';
    }
  }

  clearWidget(): void {
    this.widgetId = null;
    this.stopPlacementObserver();
  }

  reset(): void {
    if (this.widgetId !== null && window.grecaptcha) {
      window.grecaptcha.reset(this.widgetId);
    }
  }
}
