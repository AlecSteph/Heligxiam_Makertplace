import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.css'
})
export class LogoComponent implements OnInit {
  @Input() size: LogoSize = 'md';
  @Input() showWordmark = true;
  @Input() showTagline = false;
  @Input() link: string | null = '/';
  @Input() variant: 'default' | 'light' | 'dark' = 'default';
  /** PNG haute qualité (recommandé — SVG simplifié en secours) */
  @Input() usePhoto = true;

  readonly emblemPng = 'assets/brand/heligxiam-emblem.png';
  readonly emblemSvg = 'assets/brand/heligxiam-emblem.svg';

  emblemSrc = this.emblemPng;

  ngOnInit(): void {
    this.emblemSrc = this.usePhoto ? this.emblemPng : this.emblemSvg;
  }

  onEmblemError(): void {
    if (this.emblemSrc !== this.emblemPng) {
      this.emblemSrc = this.emblemPng;
    }
  }

  get hasLink(): boolean {
    return this.link !== null && this.link !== '';
  }

  get rootClass(): string {
    return `logo-root logo-variant-${this.variant}${this.hasLink ? ' logo-link' : ''}`;
  }
}
