"use strict";
// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
Object.defineProperty(exports, "__esModule", { value: true });
const digitGenerator = require("crypto-secure-random-digit");
const uuidv4 = require("uuid/v4");

function transformCoord(coord, margin, uniform, low) {
    // ensure the target point is "margin" apart from the center of the referenceRect
    if (coord < 50) {
        if (uniform) {
            return Math.floor( (50 - margin) / 50 * coord);
        }
        else
            // return Math.floor( (50 - margin) / (50 - low) * (coord-low));
            return Math.floor((coord+40)/3);
    }
    else {
        return Math.floor(2*margin + (50-margin) / 50 * coord);
    }
}

function randomGen(low, high, uniform) {
    // generate a random number between 0 and 99
    let random = Math.floor(Math.random() * (high-low) + low);
    
    // transform it to a random number between 0-(50-margin) and (50+margin)-
    return transformCoord(random, 20, uniform, low);
}

exports.handler = async (event, context, callback) => {
    console.log(event);
    if (event.request.session &&
        event.request.session.length == 2) {
        // Custom challenge for 'MATCH_FACE'
        let faceId = event.request.userAttributes['custom:faceId'];
        // This is sent back to the client app
        event.response.publicChallengeParameters = { message: "Please provide a face photo", path: "/validate-face" };
        // Add the faceId to the private challenge parameters
        // so it can be verified by the "Verify Auth Challenge Response" trigger
        event.response.privateChallengeParameters = { answer: faceId };
        event.response.challengeMetadata = 'FACE_DETECT';
    }
    else if (event.request.session &&
        event.request.session.length == 3) {
        // Custom challenge for 'NOSE DETECTION'
        const num_challenges = 1;
        const challenge_names = ['nose', 'blink', 'smile'];
        const messages = ['Touch the red square with your nose', 'Blink twice', 'Smile!'];
        var name, X, Y, message, secret;
        // var challenges = [];
        // var secrets = [];
        var challenges = {};
        var secrets = {};
        for (var i=0; i<num_challenges; i++) {
            name = challenge_names[i];
            X = randomGen(10,99, true);
            Y = randomGen(20,99, false);
            var coords = {posX: X, posY: Y};
            message = messages[i];
            secret = uuidv4(); //random string
            // challenges.push({Challenge_name: name, Coords: coords, Message: message, Secret: secret});
            // secrets.push(secret);
            challenges[i] = {Challenge_name: name, Coords: coords, Message: message, Secret: secret};
            secrets[i] = secret;
        }
        // let faceId = event.request.userAttributes['custom:faceId'];
        // event.response.publicChallengeParameters = { message: "Please provide a face photo", path: "/detect-liveness", challenges: challenges};
        event.response.publicChallengeParameters = { message: "Click START TEST to begin", path: "/detect-liveness", 
            Challenge_name: name, posX: X, posY: Y, Message: message, Secret: secret};
        event.response.privateChallengeParameters = { answer: secret };
        event.response.challengeMetadata = 'LIVENESS_DETECT';
    }
    else if (event.request.session &&
        event.request.session.length == 4) {
        // Custom challenge for 'NOSE DETECTION'
        const num_challenges = 1;
        const challenge_names = ['nose', 'blink', 'smile'];
        const messages = ['Touch the red square with your nose', 'Blink twice', 'Smile!'];
        // var challenges = [];
        // var secrets = [];
        challenges = {};
        secrets = {};
        for (var i=0; i<num_challenges; i++) {
            name = challenge_names[i];
            Y = randomGen(20,99,false);
            X = randomGen(10,99, true);
            coords = {posX: X, posY: Y};
            message = messages[i];
            secret = uuidv4(); //random string
            // challenges.push({Challenge_name: name, Coords: coords, Message: message, Secret: secret});
            // secrets.push(secret);
            challenges[i] = {Challenge_name: name, Coords: coords, Message: message, Secret: secret};
            secrets[i] = secret;
        }
        // let faceId = event.request.userAttributes['custom:faceId'];
        // event.response.publicChallengeParameters = { message: "Please provide a face photo", path: "/detect-liveness", challenges: challenges};
        event.response.publicChallengeParameters = { message: "Click START TEST to begin", path: "/detect-liveness", 
            Challenge_name: name, posX: X, posY: Y, Message: message, Secret: secret};
        event.response.privateChallengeParameters = { answer: secret };
        event.response.challengeMetadata = 'LIVENESS_DETECT';
    }
    else {
        const previousChallenge = event.request.session.slice(-1)[0];
    }
    console.log(event);
    callback(null, event);
};