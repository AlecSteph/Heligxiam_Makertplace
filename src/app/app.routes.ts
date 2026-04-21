import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search.component').then(m => m.SearchComponent)
  },
  {
    path: 'product/:id',
    loadComponent: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: 'category/:category',
    loadComponent: () => import('./pages/category/category.component').then(m => m.CategoryComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./pages/cart/cart.component').then(m => m.CartComponent)
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./pages/wishlist/wishlist.component').then(m => m.WishlistComponent)
  },
  {
    path: 'account',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [() => import('./guards/auth.guard').then(m => m.AuthGuard)]
  },
  {
    path: 'sell',
    loadComponent: () => import('./pages/sell/sell.component').then(m => m.SellComponent)
  },
  {
    path: 'guide',
    loadComponent: () => import('./pages/guide/guide.component').then(m => m.GuideComponent)
  },
  {
    path: 'legal',
    loadComponent: () => import('./pages/legal/legal.component').then(m => m.LegalComponent)
  },
  {
    path: 'seller',
    loadComponent: () => import('./pages/seller-dashboard/seller-dashboard.component').then(m => m.SellerDashboardComponent),
    canActivate: [() => import('./guards/auth.guard').then(m => m.SellerGuard)]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
