import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { UserInfo } from './core/models/api.models';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  currentUser$!: Observable<UserInfo | null>;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
  }

  logout(): void {
    this.authService.logout();
  }
}
