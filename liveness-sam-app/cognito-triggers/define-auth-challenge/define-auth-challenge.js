"use strict";
// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = async (event, context, callback) => {
    if (
        //event.request.session 
        event.request.session.length == 1 
        && event.request.session.slice(-1)[0].challengeName == 'SRP_A'
        //&& event.request.session.slice(-1)[0].challengeResult === true
        ) {
        // The user provided the right answer; proceed to next challenge
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
        event.response.challengeName = 'PASSWORD_VERIFIER';
    }
    else if (event.request.session &&
        event.request.session.length == 2 &&
        event.request.session.slice(-1)[0].challengeName == 'PASSWORD_VERIFIER' &&
        event.request.session.slice(-1)[0].challengeResult === true) {
        // The user provided the right answer; succeed auth
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
        event.response.challengeName = 'CUSTOM_CHALLENGE';
    }
    else if (event.request.session &&
        event.request.session.length == 3 &&
        event.request.session.slice(-1)[0].challengeName == 'CUSTOM_CHALLENGE' &&
        event.request.session.slice(-1)[0].challengeMetadata == 'FACE_DETECT' &&
        event.request.session.slice(-1)[0].challengeResult === true) {
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
        event.response.challengeName = 'CUSTOM_CHALLENGE';
    }
    else if (event.request.session &&
        event.request.session.length == 4 &&
        event.request.session.slice(-1)[0].challengeName == 'CUSTOM_CHALLENGE' &&
        event.request.session.slice(-1)[0].challengeMetadata == 'LIVENESS_DETECT' &&
        event.request.session.slice(-1)[0].challengeResult === true) {
        // The user provided the right answer; succeed auth
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
        event.response.challengeName = 'CUSTOM_CHALLENGE';
    }
    else if (event.request.session &&
        event.request.session.length == 5 &&
        event.request.session.slice(-1)[0].challengeName == 'CUSTOM_CHALLENGE' &&
        event.request.session.slice(-1)[0].challengeMetadata == 'LIVENESS_DETECT' &&
        event.request.session.slice(-1)[0].challengeResult === true) {
        // The user provided the right answer; succeed auth
        event.response.issueTokens = true;
        event.response.failAuthentication = false;
    }
    else {
        // The user did not provide a correct answer; fail authentication
        event.response.issueTokens = false;
        event.response.failAuthentication = true;
    }
    console.log(event);
    callback(null, event);
};