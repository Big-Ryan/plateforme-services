import { NgModule, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
registerLocaleData(localeFr);
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MatSnackBarModule }    from '@angular/material/snack-bar';
import { MatButtonModule }      from '@angular/material/button';
import { MatIconModule }        from '@angular/material/icon';
import { MatToolbarModule }     from '@angular/material/toolbar';
import { MatMenuModule }        from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule }     from '@angular/material/divider';

import { ToastrModule } from 'ngx-toastr';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent }     from './app.component';

// Plus d'intercepteur — le token est géré directement dans ApiService

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    AppRoutingModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatProgressBarModule,
    MatDividerModule,
    ToastrModule.forRoot({
      positionClass: 'toast-top-right',
      timeOut: 4000,
      preventDuplicates: true,
      progressBar: true,
    }),
  ],
  providers: [{ provide: LOCALE_ID, useValue: 'fr' }],
  bootstrap: [AppComponent],
})
export class AppModule {}