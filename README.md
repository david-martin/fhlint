# FeedHenry App checker

FeedHenry App sdk & versions checker, with some sanity checking on API usage

## Usage

```
fhlint .
```

If no issues are detected, the output will be:

```
No issues detected
```

Otherwise, it exits with a non-zero code.
Sample output with error:

```
WARNING:  Could not find static index file at public/index.html
WARNING:  /Users/dmartin/templates/fh-connector-ibeacon-manager/application.js is diverged from latest application.js template :
Index: /Users/dmartin/templates/fh-connector-ibeacon-manager/application.js
===================================================================
--- /Users/dmartin/templates/fh-connector-ibeacon-manager/application.js
+++ /Users/dmartin/templates/fh-connector-ibeacon-manager/application.js
@@ -1,37 +1,35 @@
 var mbaasApi = require('fh-mbaas-api');
 var express = require('express');
 var mbaasExpress = mbaasApi.mbaasExpress();
+var cors = require('cors');
-var express = require('express');
-var beacons = require('./lib/beacons.js');

+// list the endpoints which you want to make securable here
+var securableEndpoints;
+// fhlint-begin: securable-endpoints
+// fhlint-end
-// Securable endpoints: list the endpoints which you want to make securable here
-var securableEndpoints = ['beacons'];

 var app = express();

+// Enable CORS for all requests
+app.use(cors());
+
 // Note: the order which we add middleware to Express here is important!
 app.use('/sys', mbaasExpress.sys(securableEndpoints));
 app.use('/mbaas', mbaasExpress.mbaas);

 // Note: important that this is added just before your own Routes
 app.use(mbaasExpress.fhmiddleware());

+// allow serving of static files from the public directory
+app.use(express.static(__dirname + '/public'));
-app.use('/beacons', require('./lib/beaconRoutes.js')());
-app.use('/cloud/beacons', require('./lib/beaconRoutes.js')());

+// fhlint-begin: custom-routes
+// fhlint-end
-// You can define custom URL handlers here, like this one:
-app.use('/', function(req, res){
-  res.end('Your Cloud App is Running');
-});

 // Important that this is last!
 app.use(mbaasExpress.errorHandler());

 var port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;
+var server = app.listen(port, function() {
-var server = app.listen(port, function(){
   console.log("App started at: " + new Date() + " on port: " + port);
+});
\ No newline at end of file
-});
-
-beacons.prime(function(err, res){
-  console.log(arguments);
-});
```

Sample output with --json flag

```
{
  "versions": {},
  "warnings": [
    "fh-mbaas-api not found in package.json dependencies",
    "Detected deprecated dependency fh-webapp",
    "Detected deprecated dependency fh-api",
    "fh-mbaas-api version (~4.3.0) does not satisfy the latest version 4.5.0"
  ],
  "type": {
    "flags": {
      "hasApplicationJS": true,
      "hasPackageJson": true,
      "hasPublicIndex": false,
      "hasWWWIndex": false,
      "hasCordovaConfigJson": false,
      "hasCordovaConfigXml": false,
      "hasJSSDK": false,
      "hasAndroidManifest": false,
      "hasTiAppXml": false,
      "hasPlist": false,
      "hasSLN": false,
      "hasCSProj": false,
      "hasXamarinAndroidSDK": false,
      "hasMainPage": false
    },
    "weights": {
      "cloud_nodejs": 6,
      "webapp_advanced": 6,
      "client_hybrid": -4,
      "webapp_basic": -4,
      "client_native_android": -10,
      "client_appcelerator": -10,
      "client_native_windowsphone8": -12,
      "client_xamarin": -12
    },
    "detected": [
      "cloud_nodejs",
      "webapp_advanced"
    ]
  }
}
```

```
{
  "versions": {
    "jSSDKVersion": "2.0.2"
  },
  "warnings": [
    "Found usage of deprecated api(s) ./www/hello.js:3:$fh.act({\n./www/hello.js:5:$fh.push({\n",
    "fh js-sdk version (2.0.2) does not satisfy the latest version 2.4.3"
  ],
  "type": {
    "flags": {
      "hasApplicationJS": false,
      "hasPackageJson": true,
      "hasPublicIndex": false,
      "hasWWWIndex": true,
      "hasCordovaConfigJson": false,
      "hasCordovaConfigXml": false,
      "hasJSSDK": true,
      "hasAndroidManifest": false,
      "hasTiAppXml": false,
      "hasPlist": false,
      "hasSLN": false,
      "hasCSProj": false,
      "hasXamarinAndroidSDK": false,
      "hasMainPage": false
    },
    "weights": {
      "cloud_nodejs": -4,
      "webapp_advanced": -4,
      "client_hybrid": 7,
      "webapp_basic": 7,
      "client_native_android": -10,
      "client_appcelerator": -10,
      "client_native_windowsphone8": -12,
      "client_xamarin": -12
    },
    "detected": [
      "client_hybrid",
      "webapp_basic"
    ]
  }
}
```