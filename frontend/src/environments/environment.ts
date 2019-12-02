// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  region: 'us-east-1',
  userPoolId: 'us-east-1_qaTBnal34',
  userPoolWebClientId: '4tf9862edqa02kldak6kqt11sh',
  apiRekognition: 'https://4m29isnkue.execute-api.us-east-1.amazonaws.com/Prod/',
  apiKey: 'DbjlUVqFjV7pC8uBBzzNW1TcfCWZ01983kH8d1yN',
  //livenessApiServer: "http://localhost:5000/",
  apiLivenessDetect: 'http://192.168.0.19:5001',
  livenessUpdateInterval: 10
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import 'zone.js/dist/zone-error';  // Included with Angular CLI.
