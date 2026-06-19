import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Store, ChevronRight, UserPlus, LayoutDashboard, ArrowLeft } from 'lucide-angular';

@Component({
  selector: 'app-audience-seller',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './audience-seller.component.html',
  styles: []
})
export class AudienceSellerComponent {
  /** Photo de fond : boutique / retail (Unsplash) */
  readonly coverUrl =
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80';

  readonly Store = Store;
  readonly ChevronRight = ChevronRight;
  readonly UserPlus = UserPlus;
  readonly LayoutDashboard = LayoutDashboard;
  readonly ArrowLeft = ArrowLeft;
}
