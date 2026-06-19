import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminAuthGuard: CanActivateFn = (_route, state) => {
  const admin = inject(AdminAuthService);
  const router = inject(Router);
  if (admin.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
};
