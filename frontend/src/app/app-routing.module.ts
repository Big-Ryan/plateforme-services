import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard }     from './core/guards/auth.guard';
import { ProviderGuard } from './core/guards/auth.guard';
import { ClientGuard }   from './core/guards/auth.guard';
import { AdminGuard }    from './core/guards/auth.guard';
import { GuestGuard }    from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/catalogue', pathMatch: 'full' },

  {
    path: 'auth',
    canActivate: [GuestGuard],
    loadChildren: () =>
      import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'catalogue',
    loadChildren: () =>
      import('./features/catalogue/catalogue.module').then(m => m.CatalogueModule)
  },
  {
    path: 'provider',
    canActivate: [ProviderGuard],
    canActivateChild: [ProviderGuard],
    loadChildren: () =>
      import('./features/provider/provider.module').then(m => m.ProviderModule)
  },
  {
    path: 'client',
    canActivate: [ClientGuard],
    canActivateChild: [ClientGuard],
    loadChildren: () =>
      import('./features/client/client.module').then(m => m.ClientModule)
  },
  {
    path: 'admin',
    canActivate: [AdminGuard],
    canActivateChild: [AdminGuard],
    loadChildren: () =>
      import('./features/admin/admin.module').then(m => m.AdminModule)
  },
  { path: '**', redirectTo: '/catalogue' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
