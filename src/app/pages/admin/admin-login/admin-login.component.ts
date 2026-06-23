import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { LucideAngularModule, Mail, KeyRound, Shield, ArrowRight, AlertCircle } from 'lucide-angular';
import { AdminAuthService } from '../../../services/admin-auth.service';

/** Durée d’ouverture des rideaux (ms) — doit correspondre à `admin-login.component.css` (.curtain) */
const CURTAIN_MS = 650;

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent implements OnInit, OnDestroy {
  email = '';
  password = '';
  errorMessage = '';
  formVisible = false;
  brandVisible = true;
  curtainsOpen = false;
  /** Tant que false : aucun clic (calque) jusqu’à affichage du formulaire */
  interactionUnlocked = false;
  private introSequenceDone = false;
  /** Un seul timer fiable (évite double transitionend, Safari, etc.) */
  private endIntroTimer?: ReturnType<typeof setTimeout>;

  readonly Mail = Mail;
  readonly KeyRound = KeyRound;
  readonly Shield = Shield;
  readonly ArrowRight = ArrowRight;
  readonly AlertCircle = AlertCircle;

  private returnUrl = '/admin/dashboard';

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.adminAuth.isLoggedIn()) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }
    this.route.queryParamMap.subscribe(q => {
      const r = q.get('returnUrl');
      if (r && r.startsWith('/admin')) {
        this.returnUrl = r;
      }
    });

    // Frame suivante : lancement de l’anim CSS (les rideaux sont visibles un instant puis s’ouvrent)
    requestAnimationFrame(() => {
      this.curtainsOpen = true;
    });

    // Fin d’intro : durée fixe = durée CSS + petite marge (pas d’évènement transitionend)
    this.endIntroTimer = setTimeout(() => {
      this.finishIntro();
    }, CURTAIN_MS + 80);
  }

  @HostListener('document:keydown', ['$event'])
  blockKeysWhileLocked(event: KeyboardEvent): void {
    if (this.interactionUnlocked) return;
    if (['Tab', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
    }
  }

  ngOnDestroy(): void {
    if (this.endIntroTimer) clearTimeout(this.endIntroTimer);
  }

  private finishIntro(): void {
    if (this.introSequenceDone) return;
    this.introSequenceDone = true;
    this.brandVisible = false;
    this.formVisible = true;
    this.interactionUnlocked = true;
  }

  submit(): void {
    if (!this.interactionUnlocked) return;
    this.errorMessage = '';
    this.adminAuth.login(this.email, this.password).subscribe((ok) => {
      if (ok) {
        this.router.navigateByUrl(this.returnUrl);
      } else {
        this.errorMessage = 'Identifiant ou mot de passe administrateur incorrect.';
      }
    });
  }
}
