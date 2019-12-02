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
  selector: 'app-liveness-challenge',
  templateUrl: './liveness-challenge.component.html',
  styleUrls: ['./liveness-challenge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LivenessChallengeComponent implements OnInit, AfterContentInit {

  @ViewChild('videoElementLiveness') videoElementLiveness;
  @ViewChild("canvasLiveness") canvasLiveness;
  @ViewChild("canvasDrawLiveness") canvasDrawLiveness;

  private mirror = true; //mirror the boundary boxes
  private updateInterval = environment.livenessUpdateInterval; //the max rate to upload images in FPS
  // private apiServer = environment.livenessApiServer;

  private points = undefined;

  public video: any;
  public canvas: any;
  public canvasDraw: any;

  public cameraOn = false;

  private image: any;
  private faceId: any;
  private httpParams = {
      //'Access-Control-Allow-Origin': '*'
  }

  private apiLiveness = 'LivenessApi'; 
  private noseCenterPath = '/nosecenter'; 
  private noseDetectPath = '/nosedetect';
  private apiRekognition = 'RekognitionApi';
  private search_path = '/search-faces';

  private challenge: any;
  private passedTest = false;
  private referenceRect: any;
  private referenceObject: any;
  private signedSecret: any;
  private challengeName: any;

  private errorMessage_ = new BehaviorSubject('');
  public errorMessage = this.errorMessage_.asObservable();

  private busy_ = new BehaviorSubject(false);
  public busy = this.busy_.asObservable();

  // private allSubscriptions = new Subscription();

  private message_ = new BehaviorSubject('');
  public message = this.message_.asObservable();

  private redirectPath: string;
  private lastFrameTime = Date.now();

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit() {
  // Get instructions for second challenge
    this.initChallengeParams();

    this.video = this.videoElementLiveness.nativeElement;
    this.canvas = this.canvasLiveness.nativeElement;
    this.canvasDraw = this.canvasDrawLiveness.nativeElement;
  }

  ngAfterContentInit() {
    this.start();
  }

  private async initChallengeParams() {
    try {
      await this.auth.getPublicChallengeParameters()
        .then(param => {
          this.message_.next(param.message);
          this.challenge = {
            Challenge_name: param.Challenge_name,
            Coords: {
              posX: parseInt(param.posX, 10),
              posY: parseInt(param.posY, 10)
            },
            Message: param.Message,
            Secret: param.Secret
          };
        });
    } catch (err) {
        // console.log(err);
    }
  }

  public async submit() {
    try {
      this.errorMessage_.next('');
      this.busy_.next(true);

      const answer = this.signedSecret;
      if (answer == 'Failed') {
        // Fake face
        this.signedSecret = undefined;
        this.errorMessage_.next('Failed Liveness Test! Please start over.');
        await (this.sleep(2500));
        this.stop();
        this.router.navigate(['/sign-in']);
      }
      await this.auth.answerCustomChallenge(answer);
      const loginSucceeded = await this.auth.isAuthenticated();
      if (loginSucceeded) {
        this.stop();
        this.signedSecret = undefined;
        this.router.navigate(['/private']);
      } else {
        // If user is not authenticated and we did not get NotAuthorizedException,
        // an additional challenge is required
        await this.initChallengeParams();
        await this.processChallenge();
      }
    } catch (err) {
      this.errorMessage_.next(err.message || err);
    } finally {
      this.busy_.next(false);
    }
  }

  public start() {
    if (this.cameraOn) {
      return
    }
    // this.video.style.display = "block";
    this.canvasDraw.getContext("2d").clearRect(0, 0, this.canvasDraw.width, this.canvasDraw.height);
    this.initCamera({ video: true, audio: false });
    this.canvas.style.top = this.video.offsetTop;
    this.cameraOn = true;
  }

  public stop() {
    if (!this.cameraOn) {
      return
    }
    this.canvasDraw.getContext("2d").clearRect(0, 0, this.canvasDraw.width, this.canvasDraw.height);
    this.video.srcObject.getTracks().forEach(track => {
      track.stop();
    });

    // if (this.video.style.display === "block") {
    //   this.video.style.display = "none";
    // }

    this.cameraOn = false;
  }

  private sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  //Draw boxes and labels on each detected object
  private drawBoxes(objects) {
      // this.canvas.getContext("2d").clearRect(0, 0, this.canvasDraw.width, this.canvasDraw.height);
      //this.canvasDraw.getContext("2d").clearRect(0, 0, this.canvasDraw.width, this.canvasDraw.height);

      //filter out objects that contain a class_name and then draw boxes and labels on each
      objects.filter(object => object.class_name).forEach(object => {
          if (object.class_name == "rect") {
              let x = object.x;
              let y = object.y;
              let width = object.width;
              let height = object.height;

              //flip the x axis if local video is mirrored
              if (this.mirror == true) {
                  x = this.canvasDraw.width - (x + width)
                  // x = this.canvas.width - (x + width);
              }

              if (this.passedTest && this.challengeName=='center nose') {
                this.referenceRect = {x: object.x, y: object.y, width: object.width, height: object.height};
                // console.log(this.referenceRect);
                this.referenceObject = objects;
                // console.log(this.referenceObject);
              }

              //this.canvasDraw.getContext("2d").strokeRect(x, y, width, height);
              // this.canvas.getContext("2d").strokeRect(x, y, width, height);
          }
          else if (object.class_name == 33){

              let x = object.x;
              let y = object.y;
              
              if (this.mirror == true) {
                  x = this.canvasDraw.width - x
                  // x = this.canvas.width - x
              }
              this.canvasDraw.getContext("2d").fillText(".", x, y);
              // this.canvas.getContext("2d").fillText(".", x, y);
          }

          // else if ((typeof object.class_name === "number") && this.challengeName=='center nose') {

          //     let x = object.x;
          //     let y = object.y;
              
          //     if (this.mirror == true) {
          //         x = this.canvasDraw.width - x
          //         // x = this.canvas.width - x
          //     }
          //     this.canvasDraw.getContext("2d").fillText(".", x, y);
          //     // this.canvas.getContext("2d").fillText(".", x, y);
          // }
      });
  }

  //Check if the image has changed & enough time has passed sending it to the API
  private async alignNose() {
    if(!this.cameraOn || this.challengeName!='center nose') {
      this.canvasDraw.getContext("2d").clearRect(0, 0, this.canvasDraw.width, this.canvasDraw.height);
      //this.canvas.getContext("2d").drawImage(this.video, 0, 0, 320, 320*this.video.videoHeight/this.video.videoWidth);
      return;
    }

    let currentTime = Date.now();
    let enoughTime = (currentTime - this.lastFrameTime) > 1000/this.updateInterval;
    let timeout: any;

    if(enoughTime) {
      this.lastFrameTime = Date.now();
      this.canvas.getContext("2d").drawImage(this.video, 0, 0, 320, 320*this.video.videoHeight/this.video.videoWidth);
      // this.canvasDraw.getContext("2d").translate(this.canvas.width, 0);
      // this.canvasDraw.getContext("2d").scale(-1, 1);
      // this.canvasDraw.getContext("2d").drawImage(this.video, 0, 0, 320, 320*this.video.videoHeight/this.video.videoWidth);
      var dataUrl = this.canvas.toDataURL("image/jpeg", 1);
      this.image = dataUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");

      // let body = JSON.stringify({
      //   'image': this.image,
      //   'canvasWidth': this.canvas.width,
      //   'videoWidth': this.canvas.width
      // })
      let body = {
        'image': this.image,
        'canvasWidth': this.canvas.width,
        'videoWidth': this.canvas.width
      };

      try {
        let myInit = {
            body: body,
            headers: {
              'Connection': 'keep-alive'
            }
        }
        const resp = await API.post(this.apiLiveness, this.noseCenterPath, myInit);
        this.canvasDraw.getContext("2d").clearRect(0, 0, this.canvasDraw.width, this.canvasDraw.height);
        //clear the previous drawings
        let deltaW = 5; //Math.round(this.canvasDraw.width*0.02);
        let deltaH = 5; // Math.round(this.canvasDraw.height*0.03);
        let posX = Math.round(this.canvasDraw.width/2);
        let posY = Math.round(this.canvasDraw.height/2); //- 5*deltaH;

        this.canvasDraw.getContext("2d").strokeStyle = "Red";        
        this.canvasDraw.getContext("2d").strokeRect(posX - deltaW, posY - deltaH, 2*deltaW, 2*deltaH);
        this.canvasDraw.getContext("2d").strokeStyle = "Cyan";
        let objects = resp;
        if (!( "Error" in objects )) {
          await objects.filter(object => object.class_name).forEach(async object => {
            if (object.class_name == 33) { //tip of nose

              let x = object.x;
              let y = object.y;
              
              if (this.mirror == true) {
                  x = this.canvasDraw.width - x;
                  // x = this.canvas.width - x
              }
              if (x > (posX - deltaW) && x < (posX + deltaW) && 
                y > (posY - deltaH) && y < (posY + deltaH)) {
                this.passedTest = true;
                this.canvasDraw.getContext("2d").fillStyle = "Green";
                this.canvasDraw.getContext("2d").fillText(".", x, y);
                this.canvasDraw.getContext("2d").fillStyle = "Cyan";
              // this.canvas.getContext("2d").fillText(".", x, y);
                this.drawBoxes(objects);
                let myInit = {
                  body : {image: this.image},
                  headers : { 
                    'X-Api-Key': environment.apiKey,
                    'Connection': 'keep-alive'
                  }
                }
                const resp2 = await API.post(this.apiRekognition, this.search_path, myInit);
                this.faceId = resp2['faceId'];
                console.log(this.faceId);
                return;
                //clearTimeout(timeout);
              }
            }
          });
        this.drawBoxes(objects);
        }
        timeout = setTimeout(async () => { await this.alignNose() }, 1000/this.updateInterval);
      } catch (err) {
        this.errorMessage_.next(err.message || err);
      } finally {
        this.busy_.next(false);
      }

    }
    else {
        timeout = setTimeout(async () => { await this.alignNose() }, 1000/this.updateInterval);
    }
  }

  //Check if the image has changed & enough time has passed sending it to the API
  private async noseChallenge(challenge) {

    if(!this.cameraOn || this.challengeName!='align nose') {
      this.canvasDraw.getContext("2d").clearRect(0, 0, this.canvasDraw.width, this.canvasDraw.height);
      //this.canvas.getContext("2d").drawImage(this.video, 0, 0, 320, 320*this.video.videoHeight/this.video.videoWidth);
      return;
    }

    let currentTime = Date.now();
    let enoughTime = (currentTime - this.lastFrameTime) > 1000/this.updateInterval;
    let timeout: any;

    if (enoughTime) {
      this.lastFrameTime = Date.now();
      this.canvas.getContext("2d").drawImage(this.video, 0, 0, 320, 320*this.video.videoHeight/this.video.videoWidth);
      // this.canvasDraw.getContext("2d").translate(this.canvas.width, 0);
      // this.canvasDraw.getContext("2d").scale(-1, 1);
      // this.canvasDraw.getContext("2d").drawImage(this.video, 0, 0, 320, 320*this.video.videoHeight/this.video.videoWidth);
      var dataUrl = this.canvas.toDataURL("image/jpeg", 1);
      this.image = dataUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");

      let body = {
        'image': this.image,
        'canvasWidth': this.canvas.width,
        'videoWidth': this.canvas.width,
        'challenge': challenge,
        'referenceRect': this.referenceRect,
        'referenceObject': this.referenceObject
      };

      try {
        let myInit = {
            body: body,
            headers: {
              'Connection': 'keep-alive'
            }
        }
        const resp = await API.post(this.apiLiveness, this.noseDetectPath, myInit);
        this.canvasDraw.getContext("2d").clearRect(0, 0, this.canvasDraw.width, this.canvasDraw.height);
        //clear the previous drawings
        let deltaW = 5; //Math.round(this.canvasDraw.width*0.02);
        let deltaH = 5; // Math.round(this.canvasDraw.height*0.03);
        let posX = this.referenceRect.x + challenge.Coords.posX*this.referenceRect.width/100;
        if (this.mirror == true) {
          posX = this.canvasDraw.width - posX
        }
        let posY = this.referenceRect.y + challenge.Coords.posY*this.referenceRect.height/100;

        this.canvasDraw.getContext("2d").strokeStyle = "Red";        
        this.canvasDraw.getContext("2d").strokeRect(posX - deltaW, posY - deltaH, 2*deltaW, 2*deltaH);
        this.canvasDraw.getContext("2d").strokeStyle = "Cyan";

        let objects = resp;
        if (!( "Error" in objects )) {
          await objects.filter(object => object.class_name).forEach(async object => {
            if (object.class_name == "secret") { 

              if (object.value.length > 0) { // if test has not yet passed we get an empty string ''

                //const resp2 = await this.apigClient.searchFacesPost(this.httpParams, {image: this.image});
                //let faceId = resp2['data']['faceId'];
                this.signedSecret = object.value; //+ '##' + faceId;
                console.log(this.signedSecret);
                this.passedTest = true;
                // this.canvasDraw.getContext("2d").fillStyle = "Red";
                // this.canvasDraw.getContext("2d").fillText(".", x, y);
                // this.canvasDraw.getContext("2d").fillStyle = "Cyan";
              // this.canvas.getContext("2d").fillText(".", x, y);
                //clearTimeout(timeout);
                return;
              } 
            }
          });
        this.drawBoxes(objects);
        }
        timeout = setTimeout(async () => { await this.noseChallenge(challenge) }, 1000/this.updateInterval);
      } catch (err) {
        this.errorMessage_.next(err.message || err);
      } finally {
        this.busy_.next(false);
      }

    }
    else {
        timeout = setTimeout(async () => { await this.noseChallenge(challenge) }, 1000/this.updateInterval);
    }
  }

  private async processChallenge(){
    this.lastFrameTime = Date.now();
    this.passedTest = false;
    this.signedSecret = '';

    try{
      this.errorMessage_.next('');
      this.busy_.next(true);
      this.lastFrameTime = Date.now();
      this.passedTest = false;
      console.log(this.challenge);
      if (this.challenge.Challenge_name == 'nose') {
        if (this.referenceRect === undefined) {
          console.log('center nose');
          this.message_.next('CALIBRATION: Center your face in the camera');
          this.challengeName = 'center nose';
          await this.alignNose();
          while (!this.passedTest) {
            // Implement Timeout
            // If timeout then break and fail test
            await this.sleep(20);
          }
        }
        //await this.sleep(100);
        console.log('nose challenge');
        this.passedTest = false;
        this.message_.next(this.challenge.Message);
        this.lastFrameTime = Date.now();
        this.challengeName = 'align nose';
        let timeout: any;
        await this.noseChallenge(this.challenge);
        while (!this.passedTest) {
          // Implement Timeout
          // If timeout then break and fail test
          await this.sleep(100);
          //timeout = setTimeout(async () => { await this.noseChallenge(this.challenge) }, 1000/this.updateInterval);
          //await this.sleep(1000/this.updateInterval);
        }
        clearTimeout(timeout);
        this.challengeName = 'none';
      }
      else if (this.challenge.Challenge_name == 'blink') {
        await this.noseChallenge(this.challenge);
      }
      console.log('Sending Answer...');
      await this.submit();
      //await this.sendImageFromCanvas();
    } catch (err) {
      this.errorMessage_.next(err.message || err);
      this.busy_.next(false);
    } 
  }

  public async startDetection() {
    if (!this.cameraOn) {
      return
    }
    // if (this.canvas.style.display === "none") {
    //   this.canvas.style.display = "block";
    // } 
    if (this.canvasDraw.style.display === "none") {
      this.canvasDraw.style.display = "block";
    } 
    this.canvas.getContext("2d").translate(this.canvas.width, 0);
    this.canvas.getContext("2d").scale(-1, 1);
    this.canvasDraw.getContext("2d").translate(this.canvas.width, 0);
    this.canvasDraw.getContext("2d").scale(-1, 1);
    this.canvasDraw.getContext("2d").lineWidth = 3;
    this.canvasDraw.getContext("2d").strokeStyle = "cyan";
    this.canvasDraw.getContext("2d").font = "30px Verdana";
    this.canvasDraw.getContext("2d").fillStyle = "cyan";
    this.errorMessage_.next('');
    this.busy_.next(true);
    await this.processChallenge();
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
    });
  }
}
