import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TextFieldModule } from '@angular/cdk/text-field';

import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatInputModule }           from '@angular/material/input';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatSelectModule }          from '@angular/material/select';
import { MatChipsModule }           from '@angular/material/chips';
import { MatIconModule }            from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule }           from '@angular/material/table';
import { MatPaginatorModule }       from '@angular/material/paginator';
import { MatDialogModule }          from '@angular/material/dialog';
import { MatDividerModule }         from '@angular/material/divider';
import { MatBadgeModule }           from '@angular/material/badge';
import { MatTabsModule }            from '@angular/material/tabs';
import { MatMenuModule }            from '@angular/material/menu';
import { MatTooltipModule }         from '@angular/material/tooltip';

import { ProviderDashboardComponent }   from './dashboard/provider-dashboard.component';
import { ProviderServicesComponent }    from './services/provider-services.component';
import { ProviderSubscriptionComponent} from './subscription/provider-subscription.component';
import { SubscriptionSuccessComponent } from './subscription/subscription-success.component';
import { SubscriptionCancelComponent }  from './subscription/subscription-cancel.component';
import { ProviderNegotiationsComponent} from './negotiations/provider-negotiations.component';

const routes: Routes = [
  { path: '',              redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',     component: ProviderDashboardComponent },
  { path: 'services',      component: ProviderServicesComponent },
  { path: 'subscription',         component: ProviderSubscriptionComponent },
  { path: 'subscription/success', component: SubscriptionSuccessComponent },
  { path: 'subscription/cancel',  component: SubscriptionCancelComponent },
  { path: 'negotiations',  component: ProviderNegotiationsComponent },
];

@NgModule({
  declarations: [
    ProviderDashboardComponent,
    ProviderServicesComponent,
    ProviderSubscriptionComponent,
    SubscriptionSuccessComponent,
    SubscriptionCancelComponent,
    ProviderNegotiationsComponent,
  ],
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    TextFieldModule,
    RouterModule.forChild(routes),
    MatCardModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule,
    MatTableModule, MatPaginatorModule, MatDialogModule, MatDividerModule,
    MatBadgeModule, MatTabsModule, MatMenuModule, MatTooltipModule,
  ],
})
export class ProviderModule {}