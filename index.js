var fhapptype = require('fhapptype');
var path = require('path');
var fs = require('fs');
var npm = require('npm');
var async = require('async');
var semver = require('semver');
var request = require('request');

module.exports = function(dir, cb) {
  var result = {
    versions: {},
    warnings: []
  };

  fhapptype(dir, function(err, res) {
    if (err) return cb(err);
    result.type = res;

    async.parallel([function hasJSSDK(pcb) {
      if (res.flags.hasJSSDK) {
        // check jssdk version
        var contents = fs.readFileSync(path.join(dir, 'www/feedhenry.js'));
        var regex = /\"?sdk_version\"?:.*?\"(.+?)\"/g;
        var matches = regex.exec(contents.toString('utf-8'));
        if (matches && matches.length > 1) {
          result.versions.jSSDKVersion = matches[1];
        } else {
          result.warnings.push('fh js-sdk version not found in www/feedhenry.js');
          return pcb();
        }

        request('https://raw.githubusercontent.com/feedhenry/fh-js-sdk/master/package.json', function(err, res, body) {
          if (err) return pcb(err);

          var package = JSON.parse(body);
          var latestJSSDKVersion = package.version.replace(/-BUILD-NUMBER/g, '');
          // console.log(latestJSSDKVersion);

          try {
            if (!semver.satisfies(latestJSSDKVersion, result.versions.jSSDKVersion)) {
              result.warnings.push('fh js-sdk version (' + result.versions.jSSDKVersion + ') does not satisfy the latest version ' + latestJSSDKVersion);
            }
          } catch (e) {
            result.warnings.push('Unable to determine fh js-sdk version: ' + e.toString());
          }
          return pcb();
        });
      } else {
        return pcb();
      }
    }, function hasApplicationJShasPackageJson(pcb) {
      if (res.flags.hasApplicationJS && res.flags.hasPackageJson) {
        // check fh-mbaas-api version
        // console.log(path.join(dir, 'package.json'));
        var package = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
        // console.log(package);
        if (package.dependencies['fh-mbaas-api']) {
          result.versions.fhMbaasApiVersion = package.dependencies['fh-mbaas-api'];
        } else {
          result.warnings.push('fh-mbaas-api not found in package.json dependencies');
          return pcb();
        }

        ['fh-webapp', 'fh-api', 'fh-nodeapp'].forEach(function(dep) {
          if (package.dependencies[dep]) {
            result.warnings.push('Detected deprecated dependency ' + dep);
          }
        });

        npm.load({
          loaded: false,
          silent: true
        }, function (err) {
          if (err) return pcb(err);

          npm.commands.show(['fh-mbaas-api', 'version'], true, function(err, data) {
            if (err) return pcb(err);

            var latestMbaasVersion = data[Object.keys(data)[0]].version;
            // var mbaasVersionMatch = /.*?(\d+\.\d+\.\d+).*/g.exec(result.versions.fhMbaasApiVersion);
            // var mbaasVersion = mbaasVersionMatch !== null ? mbaasVersionMatch[1] : null;
            try {
              if(!semver.satisfies(latestMbaasVersion, result.versions.fhMbaasApiVersion)) {
                result.warnings.push('fh-mbaas-api version (' + result.versions.fhMbaasApiVersion + ') does not satisfy the latest version ' + latestMbaasVersion);
              }
            } catch (e) {
              result.warnings.push('Unable to determine fh-mbaas-api version: ' + e.toString());
            }

            return pcb();
          });
        });
      } else {
        return pcb();
      }
    }], function(err, res) {
      return cb(null, result);
    });
  });
};