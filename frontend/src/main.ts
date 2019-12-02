// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import Amplify from 'aws-amplify';

if (environment.production) {
  enableProdMode();
}

Amplify.configure({
  Auth: {
    region: environment.region,
    userPoolId: environment.userPoolId,
    userPoolWebClientId: environment.userPoolWebClientId,
    authenticationFlowType: 'CUSTOM_AUTH'
  },
  API: {
        endpoints: [
            {
                name: "RekognitionApi",
                endpoint: environment.apiRekognition
            },
            {
                name: "LivenessApi",
                endpoint: environment.apiLivenessDetect
            }
        ]
    }
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
