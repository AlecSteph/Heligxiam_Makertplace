import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  LucideAngularModule,
  Scale, ShieldCheck, Cookie, FileText, ChevronRight, CheckCircle2, Lock, Mail,
  Printer, CalendarDays, Info, Sparkles, Globe, Download
} from 'lucide-angular';

type LegalSection = 'terms' | 'privacy' | 'cookies' | 'legal';

interface NavEntry {
  id: LegalSection;
  label: string;
  short: string;
  icon: any;
  color: string;
  accent: string;
}

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './legal.component.html',
  styleUrls: ['./legal.component.css']
})
export class LegalComponent implements OnInit, OnDestroy {
  activeSection: LegalSection = 'terms';
  lastUpdate = new Date('2026-04-01');

  readonly navEntries: NavEntry[] = [
    { id: 'terms',    label: "Conditions générales d'utilisation", short: 'CGU',          icon: Scale,      color: 'from-indigo-500 to-purple-600', accent: 'text-indigo-600' },
    { id: 'privacy',  label: 'Politique de confidentialité',       short: 'Confidentialité', icon: ShieldCheck, color: 'from-emerald-500 to-teal-600',  accent: 'text-emerald-600' },
    { id: 'cookies',  label: 'Gestion des cookies',                 short: 'Cookies',      icon: Cookie,     color: 'from-amber-500 to-orange-600',   accent: 'text-amber-600' },
    { id: 'legal',    label: 'Mentions légales',                   short: 'Mentions',     icon: FileText,   color: 'from-slate-600 to-gray-700',    accent: 'text-slate-700' }
  ];

  // Lucide icons
  readonly Scale = Scale;
  readonly ShieldCheck = ShieldCheck;
  readonly Cookie = Cookie;
  readonly FileText = FileText;
  readonly ChevronRight = ChevronRight;
  readonly CheckCircle2 = CheckCircle2;
  readonly Lock = Lock;
  readonly Mail = Mail;
  readonly Printer = Printer;
  readonly CalendarDays = CalendarDays;
  readonly Info = Info;
  readonly Sparkles = Sparkles;
  readonly Globe = Globe;
  readonly Download = Download;

  private routeSub?: Subscription;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.routeSub = this.route.fragment.subscribe(fragment => {
      if (this.isLegalSection(fragment)) {
        this.activeSection = fragment;
        setTimeout(() => this.scrollToSection(fragment), 50);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private isLegalSection(value: string | null): value is LegalSection {
    return value === 'terms' || value === 'privacy' || value === 'cookies' || value === 'legal';
  }

  selectSection(id: LegalSection): void {
    this.activeSection = id;
    this.scrollToSection(id);
  }

  private scrollToSection(id: LegalSection): void {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    // Update active entry based on the section currently visible
    const offset = 180;
    const sections: LegalSection[] = ['terms', 'privacy', 'cookies', 'legal'];
    for (let i = sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(sections[i]);
      if (el && el.getBoundingClientRect().top < offset) {
        this.activeSection = sections[i];
        break;
      }
    }
  }

  print(): void {
    window.print();
  }
}
