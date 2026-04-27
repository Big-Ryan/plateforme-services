import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TextFieldModule } from '@angular/cdk/text-field';

import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatTableModule }           from '@angular/material/table';
import { MatPaginatorModule }       from '@angular/material/paginator';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule }         from '@angular/material/divider';
import { MatChipsModule }           from '@angular/material/chips';
import { MatTabsModule }            from '@angular/material/tabs';

import { ClientDashboardComponent }    from './dashboard/client-dashboard.component';
import { ClientNegotiationsComponent } from './negotiations/client-negotiations.component';
import { ReviewFormComponent } from '../../shared/components/review-form/review-form.component';

const routes: Routes = [
  { path: '',               redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',      component: ClientDashboardComponent },
  { path: 'negotiations',   component: ClientNegotiationsComponent },
];

@NgModule({
  declarations: [
    ClientDashboardComponent,
    ClientNegotiationsComponent,
  ],
  imports: [
    ReviewFormComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatPaginatorModule, MatFormFieldModule,
    MatInputModule, MatProgressSpinnerModule, MatDividerModule,
    MatChipsModule, MatTabsModule,
  ],
})
export class ClientModule {}