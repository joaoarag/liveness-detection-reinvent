// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Component, OnInit, OnDestroy, AfterContentInit, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { AuthService } from '../auth.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import Amplify, { API } from 'aws-amplify';

@Component({
  selector: 'app-answer-challenge',
  templateUrl: './answer-challenge.component.html',
  styleUrls: ['./answer-challenge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerChallengeComponent implements OnInit, AfterContentInit {

  @ViewChild('videoElementFace') videoElementFace;

  @ViewChild("canvasFace") videoCanvasFace;

  public video: any;
  public canvas: any;

  public cameraOn = false;
  displayControls = false;

  image: any;
  faceId: any;

  apiName = 'RekognitionApi'; 
  search_path = '/search-faces'; 

  private errorMessage_ = new BehaviorSubject('');
  public errorMessage = this.errorMessage_.asObservable();

  private busy_ = new BehaviorSubject(false);
  public busy = this.busy_.asObservable();

  // private allSubscriptions = new Subscription();

  private message_ = new BehaviorSubject('');
  public message = this.message_.asObservable();

  private path: string;

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit() {

    // Get instructions for first challenge
    try{
      this.auth.getPublicChallengeParameters()
        .then(param => this.message_.next(param.message));
    } catch (err) {
      this.errorMessage_.next('Invalid user session. Please Sign In');
      this.router.navigate(['/sign-in']);
    }

    this.video = this.videoElementFace.nativeElement;
    this.canvas = this.videoCanvasFace.nativeElement;
  }

  ngAfterContentInit() {
    this.start();
  }

  public async submit() {
    try {
      this.errorMessage_.next('');
      this.busy_.next(true);
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
          const resp = await API.post(this.apiName, this.search_path, myInit);
          this.faceId = resp['faceId'];
        }
        console.log(this.faceId);
        if(this.faceId == '-1') {
          this.errorMessage_.next('Photo does not contain any faces! Please retake');
          this.faceId = undefined;
        }
        // TBD: Either keep this condition or send as CustomChallenge anyway
        // else if(this.faceId == 0) {
        //   this.errorMessage_.next('No matches for provided face!');
        //   this.faceId = undefined;
        // }
        else {
          const answer = this.faceId;
          await this.auth.answerCustomChallenge(answer);
          const loginSucceeded = await this.auth.isAuthenticated();
          if (loginSucceeded) {
            this.stop();
            this.router.navigate(['/private']);
          } else {
            // If user is not authenticated and we did not get NotAuthorizedException,
            // an additional challenge is required
            await this.auth.getPublicChallengeParameters()
              .then(param => this.path = param.path);
            console.log('answer challenge redirect: ' + this.path);
            this.errorMessage_.next('User recognized! Moving to Liveness Detection...');
            await (this.sleep(2000));
            this.router.navigate([this.path]);
          }
        }
      }
    } catch (err) {
      // If face mismatch, we get NotAuthorizedException and HTTP Status Code 400
      this.errorMessage_.next(err.message || err);
      this.router.navigate(['/sign-in']);
    } finally {
      this.busy_.next(false);
    }
  }

  private sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public start() {
    if (this.cameraOn) {
      return
    }
    this.cameraOn = true;
    this.video.style.display = "block";

    this.initCamera({ video: true, audio: false });
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
    this.submit();
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
