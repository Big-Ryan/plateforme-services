import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatTableModule }           from '@angular/material/table';
import { MatPaginatorModule }       from '@angular/material/paginator';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule }         from '@angular/material/divider';
import { MatChipsModule }           from '@angular/material/chips';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatSlideToggleModule }     from '@angular/material/slide-toggle';
import { MatTabsModule }            from '@angular/material/tabs';
import { MatBadgeModule }           from '@angular/material/badge';

import { AdminDashboardComponent }    from './dashboard/admin-dashboard.component';
import { AdminUsersComponent }        from './users/admin-users.component';
import { AdminSubscriptionsComponent} from './subscriptions/admin-subscriptions.component';
import { AdminCategoriesComponent }   from './categories/admin-categories.component';

const routes: Routes = [
  { path: '',              redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',     component: AdminDashboardComponent },
  { path: 'users',         component: AdminUsersComponent },
  { path: 'subscriptions', component: AdminSubscriptionsComponent },
  { path: 'categories',    component: AdminCategoriesComponent },
];

@NgModule({
  declarations: [
    AdminDashboardComponent,
    AdminUsersComponent,
    AdminSubscriptionsComponent,
    AdminCategoriesComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatPaginatorModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatProgressSpinnerModule,
    MatDividerModule, MatChipsModule, MatTooltipModule,
    MatSlideToggleModule, MatTabsModule, MatBadgeModule,
  ],
})
export class AdminModule {}