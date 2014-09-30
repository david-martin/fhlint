var fhapptype = require('fhapptype');
var path = require('path');
var fs = require('fs');
var npm = require('npm');
var async = require('async');
var semver = require('semver');
var request = require('request');

function checkJSStringUsages(arr, dir, result, omit, cb) {
  // find . -iname '*.js' -not -path "./node_modules/*" | xargs grep '$fh.act'
  var omits = '';
  if (omit.length) {
    omit.forEach(function(str) {
      omits += '-not -path \"' + str + '\" ';
    });
  }
  var command = "find " + require('path').resolve(dir) + " -iname '*.js' " + omits + " | xargs grep -in '" + arr.join('\\|') + "'";
  process.env.DEBUG && console.log(command);
  require('child_process').exec(command, {
    cwd: process.cwd()
  }, function(err, stdout, stderr) {
    if (err) {
      if (err.code != 1) return cb(err); // grep exits with 1 if no find
      return cb();
    }

    var results = stdout.trim().split('\n');
    if (stdout != '' && results.length > 0) {
      result.warnings.push('Found usage of deprecated api(s) stdout:\'' + stdout + '\'');
    }
    return cb();
  });
}

module.exports = function(dir, cb) {
  var result = {
    versions: {},
    warnings: []
  };

  fhapptype(dir, function(err, res) {
    if (err) return cb(err);
    result.type = res;

    async.parallel([function jSSDKVersionCheck(pcb) {
      if (res.flags.hasJSSDK) {
        // check jssdk version
        // Try first location
        var contents = fs.readFileSync(res.globs.hasJSSDKLocation[0]);
        var regex = /\"?sdk_version\"?:.*?\"(.+?)\"/g;
        var matches = regex.exec(contents.toString('utf-8'));
        if (matches && matches.length > 1) {
          result.versions.jSSDKVersion = matches[1];
        } else {
          result.warnings.push('fh js-sdk version not found in ' + res.globs.hasJSSDKLocation[0]);
          return pcb();
        }

        request('https://raw.githubusercontent.com/feedhenry/fh-js-sdk/master/package.json', function(err, res, body) {
          if (err) return pcb(err);

          var package = JSON.parse(body);
          var latestJSSDKVersion = package.version.replace(/-BUILD-NUMBER/g, '');
          process.env.DEBUG && console.log(latestJSSDKVersion);

          try {
            if (!semver.satisfies(latestJSSDKVersion, result.versions.jSSDKVersion.replace(/-BUILD-NUMBER/g, ''))) {
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
    }, function deprecatedClientAPICheck(pcb) {
      if (res.flags.hasJSSDK) {
        checkJSStringUsages(['$fh.act', '$fh.push', '$fh.acc', '$fh.audio', '$fh.cam', '$fh.contacts', '$fh.data', '$fh.env', '$fh.feed', '$fh.file', '$fh.handlers', '$fh.geoip', '$fh.geo', '$fh.log', '$fh.map', '$fh.send', '$fh.notify', '$fh.ready', '$fh.web', '$fh.webview'], dir, result, ['./node_modules/*'].concat(res.globs.hasJSSDKLocation), pcb);
      } else {
        return pcb();
      }
    }, function deprecatedCloudAPICheck(pcb) {
      if (res.flags.hasApplicationJS && res.flags.hasPackageJson) {
        checkJSStringUsages(['$fh.act', '$fh.push', '$fh.web', '$fh.log', '$fh.parse', '$fh.stringify'], dir, result, ['./node_modules/*'], pcb);
      } else {
        return pcb();
      }
    }, function fhMbaasVersionCheck(pcb) {
      if (res.flags.hasApplicationJS && res.flags.hasPackageJson) {
        // check fh-mbaas-api version
        process.env.DEBUG && console.log(path.join(dir, 'package.json'));
        var package = JSON.parse(fs.readFileSync(res.globs.hasPackageJsonLocation[0]));
        process.env.DEBUG && console.log(package);
        if (package.dependencies['fh-mbaas-api']) {
          result.versions.fhMbaasApiVersion = package.dependencies['fh-mbaas-api'];
        } else {
          result.warnings.push('fh-mbaas-api not found in package.json dependencies');
        }
        npm.load({
          loaded: false
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
    }, function deprecatedDepsCheck(pcb) {
      if (res.flags.hasApplicationJS && res.flags.hasPackageJson) {
        // check fh-mbaas-api version
        process.env.DEBUG && console.log(path.join(dir, 'package.json'));
        var package = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
        ['fh-webapp', 'fh-api', 'fh-nodeapp', 'fh-mbaas-express'].forEach(function(dep) {
          if (package.dependencies[dep] != null) {
            result.warnings.push('Detected deprecated dependency (' + dep + ') in package.json');
          }
        });
      }
      return pcb();
    }], function(err, res) {
      return cb(err, result);
    });
  });
};