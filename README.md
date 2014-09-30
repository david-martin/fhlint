# FeedHenry App checker

FeedHenry App sdk & versions checker, with some sanity checking on API usage

## Usage

```
fhlint .
```

Sample output

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