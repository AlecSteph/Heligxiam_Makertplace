import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { NotificationComponent } from './components/notification/notification.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent, NotificationComponent, ChatbotComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-50">
      <app-header *ngIf="showChrome"></app-header>
      <app-notification></app-notification>
      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>
      <app-footer *ngIf="showChrome"></app-footer>
      <app-chatbot></app-chatbot>
    </div>
  `,
  styles: []
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'heligxiam-marketplace';
  showChrome = true;
  private sub = new Subscription();

  // Routes qui ne doivent PAS afficher le header/footer publics
  private chromelessPrefixes = ['/seller', '/admin'];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateChromeFromUrl(this.router.url);
    this.sub.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => this.updateChromeFromUrl(e.urlAfterRedirects))
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private updateChromeFromUrl(url: string): void {
    const path = (url.split('?')[0] || '').toLowerCase();
    this.showChrome = !this.chromelessPrefixes.some(p => path === p || path.startsWith(p + '/'));
  }
}
