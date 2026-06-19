import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Store, UserRound, Scale, FileSearch, ChevronRight, LogOut } from 'lucide-angular';
import { AdminAuthService } from '../../../services/admin-auth.service';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './admin-home.component.html',
  styleUrl: './admin-home.component.css'
})
export class AdminHomeComponent {
  readonly Store = Store;
  readonly UserRound = UserRound;
  readonly Scale = Scale;
  readonly FileSearch = FileSearch;
  readonly ChevronRight = ChevronRight;
  readonly LogOut = LogOut;

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router
  ) {}

  logout(): void {
    this.adminAuth.logout();
    this.router.navigate(['/admin/login']);
  }
}
