import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatInputModule }           from '@angular/material/input';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatSelectModule }          from '@angular/material/select';
import { MatChipsModule }           from '@angular/material/chips';
import { MatIconModule }            from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule }       from '@angular/material/paginator';
import { MatDividerModule }         from '@angular/material/divider';
import { MatBadgeModule }           from '@angular/material/badge';
import { MatTooltipModule }         from '@angular/material/tooltip';

import { ServiceListComponent }     from './list/service-list.component';
import { ServiceDetailComponent }   from './detail/service-detail.component';
import { ProviderProfileComponent } from './provider-profile/provider-profile.component';

const routes: Routes = [
  { path: '',                component: ServiceListComponent },
  { path: 'provider/:id',    component: ProviderProfileComponent },
  { path: ':id',             component: ServiceDetailComponent },
];

@NgModule({
  declarations: [ServiceListComponent, ServiceDetailComponent, ProviderProfileComponent],
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    RouterModule.forChild(routes),
    MatCardModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule,
    MatPaginatorModule, MatDividerModule, MatBadgeModule, MatTooltipModule,
  ],
})
export class CatalogueModule {}