// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Component, OnInit, OnDestroy, AfterContentInit, ChangeDetectionStrategy } from '@angular/core';
import { ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import Amplify, { API } from 'aws-amplify';
//import { VideoService } from '../video.service';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class SignUpComponent implements OnInit, AfterContentInit{

  @ViewChild('videoElement') videoElement;

  @ViewChild("canvas") videoCanvas;

  email = new FormControl('');
  fullName = new FormControl('');
  password = new FormControl('');

  image: any;
  faceId: any;

  apiName = 'RekognitionApi'; 
  index_path = '/index-faces'; 

  private busy_ = new BehaviorSubject(false);
  public busy = this.busy_.asObservable();

  private errorMessage_ = new BehaviorSubject('');
  public errorMessage = this.errorMessage_.asObservable();

  private path: string;

  constructor(private router: Router, private auth: AuthService) { }
  
  ngOnInit() {
    this.video = this.videoElement.nativeElement;
    this.canvas = this.videoCanvas.nativeElement;
  }

  ngAfterContentInit() {
    this.start();
  }

  public async signup() {
    this.errorMessage_.next('');
    this.busy_.next(true);
    this.takeSnapshot()
    try {
      if (this.image === undefined) {
        this.errorMessage_.next('Please provide a face photo');
      }
      else {
        let body = {
          image: this.image
        };
        let myInit = {
            body: body,
            headers: { 'X-Api-Key': environment.apiKey }
        }
        if (this.faceId === undefined) {
          const resp = await API.post(this.apiName, this.index_path, myInit);
          this.faceId = resp['faceId'];
        }
        console.log(this.faceId);
        if(this.faceId == 0 || this.faceId == null) {
          this.errorMessage_.next('Photo does not contain any faces! Please retake');
          this.faceId = undefined;
        }
        else {
          const signUpResult = await this.auth.signUp(this.email.value, this.fullName.value, this.faceId, this.password.value);
          this.router.navigate(['/sign-in']);
          // await this.auth.signIn(this.email.value, this.password.value);
          // const loginSucceeded = await this.auth.isAuthenticated();
          // if (loginSucceeded) {
          //   this.stop();
          //   this.router.navigate(['/private']);
          // } else {
          //   // If user is not authenticated and we did not get NotAuthorizedException,
          //   // an additional challenge is required
          //   await this.auth.getPublicChallengeParameters()
          //     .then(param => this.path = param.path);
          //   console.log('sign-up redirect: ' + this.path);
          //   this.stop();
          //   this.router.navigate([this.path]);
          // }
        }
      }
    } catch (err) {
      console.log(err);
      this.errorMessage_.next(err.message || err);
    } finally {
      this.busy_.next(false);
    }
  }

  public video: any;
  public canvas: any;

  public cameraOn = false;
  displayControls = false;

  // ngAfterViewInit() {
  //   this.video = this.videoElement.nativeElement;
  //   this.canvas = this.videoCanvas.nativeElement;
  // }

  public start() {
    if (this.cameraOn) {
      return
    }
    this.cameraOn = true;
    this.video.style.display = "block";

    this.initCamera({ video: true, audio: false });
    this.canvas.getContext("2d").translate(this.canvas.width, 0);
    this.canvas.getContext("2d").scale(-1, 1);
  }

  public stop() {
    if (!this.cameraOn) {
      return
    }
    this.video.srcObject.getTracks().forEach(track => {
      track.stop();
    });

    if (this.video.style.display === "block") {
      this.video.style.display = "none";
    }

    this.cameraOn = false;
  }

  public takeSnapshot() {
    if (!this.cameraOn) {
      return
    }

    // if (this.canvas.style.display === "none") {
    //   this.canvas.style.display = "block";
    // } 

    this.canvas.getContext("2d").drawImage(this.video, 0, 0, 320, 320*this.video.videoHeight/this.video.videoWidth);
    var dataUrl = this.canvas.toDataURL("image/png");
    this.image = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
  }

  public initCamera(config:any) {
    var browser = <any>navigator;

    browser.getUserMedia = (browser.getUserMedia ||
      browser.webkitGetUserMedia ||
      browser.mozGetUserMedia ||
      browser.msGetUserMedia);

    browser.mediaDevices.getUserMedia(config).then(stream => {
      //this.video.src = window.URL.createObjectURL(stream);
      this.video.srcObject = stream;
      this.video.controls = this.displayControls;
    });
  }
}