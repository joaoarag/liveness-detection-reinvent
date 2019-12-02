// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { AuthService } from '../auth.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {

  public email = new FormControl('');
  password = new FormControl('');

  private busy_ = new BehaviorSubject(false);
  public busy = this.busy_.asObservable();

  private errorMessage_ = new BehaviorSubject('');
  public errorMessage = this.errorMessage_.asObservable();

  private path: string;

  constructor(private router: Router, private auth: AuthService) { }

  public async signIn() {
    this.busy_.next(true);
    this.errorMessage_.next('');
    try {
      if (this.email.value == '' || this.email.value === undefined) {
        this.errorMessage_.next('Please enter E-mail');
      }
      else if (this.password.value == '' || this.password.value === undefined) {
        this.errorMessage_.next('Please enter password');
      }
      else {
        await this.auth.signIn(this.email.value, this.password.value);
        const loginSucceeded = await this.auth.isAuthenticated();
        if (loginSucceeded) {
          this.router.navigate(['/private']);
        }
        else {
          // If user is not authenticated and we did not get NotAuthorizedException,
          // an additional challenge is required
          await this.auth.getPublicChallengeParameters()
            .then(param => this.path = param.path);
          console.log('sign-in redirect: ' + this.path);
          this.router.navigate([this.path]);
        }
      }
    } catch (err) {
      // If user/password mismatch, we get NotAuthorizedException and HTTP Status Code 400
      this.errorMessage_.next(err.message || err);
    } finally {
      this.busy_.next(false);
    }
  }
}
