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
    "fh-mbaas-api version (undefined) does not satisfy the latest version 4.5.0"
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
