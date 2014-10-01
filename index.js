var fhapptype = require('fhapptype');
var path = require('path');
var npm = require('npm');
var async = require('async');
var semver = require('semver');
var request = require('request');
var jsdiff = require('diff');
var mkdirp = require('mkdirp');
var fs = require('fs-extra');
var http = require('http');
var https = require('https');

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
        request('https://raw.githubusercontent.com/feedhenry/fh-js-sdk/master/package.json', function(err, response, body) {
          if (err) throw err;

          var package = JSON.parse(body);
          var latestJSSDKVersion = package.version.replace(/-BUILD-NUMBER/g, '');
          process.env.DEBUG && console.log(latestJSSDKVersion);
          async.map(res.globs.hasJSSDKLocation, function(location, mcb) {
            // check jssdk version
            // Try first location
            process.env.DEBUG && console.log('hasJSSDKLocation', location);
            var contents = fs.readFileSync(location);
            var regex = /\"?sdk_version\"?:.*?\"(.+?)\"/g;
            var matches = regex.exec(contents.toString('utf-8'));
            var this_version;
            if (matches && matches.length > 1) {
              this_version = matches[1];
              result.versions.jSSDKVersion = result.versions.jSSDKVersion || {};
              result.versions.jSSDKVersion[location] = (this_version);
            } else {
              result.warnings.push('fh js-sdk version not found in ' + location);
              return mcb();
            }

            try {
              if (!semver.satisfies(latestJSSDKVersion, this_version.replace(/-BUILD-NUMBER/g, ''))) {
                result.warnings.push('fh js-sdk version (' + this_version + ') in ' + location + ' does not satisfy the latest version ' + latestJSSDKVersion);

                if (process.env.FHLINT_FIX) {
                  console.log('creating write stream to ', location);
                  var file = fs.createWriteStream(location);
                  https.get('https://raw.githubusercontent.com/feedhenry/fh-js-sdk/master/dist/feedhenry.js', function(sdk_stream) {
                    console.log('got sdk_stream stream');
                    sdk_stream.pipe(file);
                    file.on('finish', function() {
                      console.log('finish file write pipe');
                      file.close(mcb);
                    });
                  });
                } else {
                  return mcb();
                }
              } else {
                return mcb();
              }
            } catch (e) {
              result.warnings.push('Unable to determine fh js-sdk version: ' + e.toString());
              return mcb();
            }
          }, pcb);
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
        // TODO: allow for multiple application.js files (maybe tests have a copy)
        var location = res.globs.hasPackageJsonLocation[0];
        var package = JSON.parse(fs.readFileSync(location));
        process.env.DEBUG && console.log(package);
        var this_version = 'unknown';
        if (package.dependencies['fh-mbaas-api']) {
          this_version = package.dependencies['fh-mbaas-api'];
          result.versions.fhMbaasApiVersion = result.versions.fhMbaasApiVersion || {};
          result.versions.fhMbaasApiVersion[location] = this_version;
        } else {
          result.warnings.push('fh-mbaas-api not found in package.json dependencies');
        }

        npm.load({
          loaded: false
        }, function (err) {
          if (err) throw err;

          npm.commands.show(['fh-mbaas-api', 'version'], true, function(err, data) {
            if (err) throw err;

            var latestMbaasVersion = data[Object.keys(data)[0]].version;
            try {
              if(!semver.satisfies(latestMbaasVersion, this_version)) {
                result.warnings.push('fh-mbaas-api version (' + this_version + ') does not satisfy the latest version ' + latestMbaasVersion);
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
    }, function applicationJsCheck(pcb) {
      if (res.flags.hasApplicationJS) {
        fs.readFile(path.join(__dirname, 'sample', 'application.js'), function compareSample(err, data) {
          if (err) throw err;

          var sample = data.toString();
          async.map(res.globs.hasApplicationJSLocation, function compareSampleWithApplicationJs(location, mcb) {
            fs.readFile(location, function(err, data) {
              if (err) throw err;

              var applicationJs = data.toString().replace(/(\/\/\s+fhlint-begin.*?\n)([^]*?)(\/\/\s+fhlint-end)/g, function(original, a, b, c) {
                process.env.DEBUG && console.log('match:', arguments);
                return a + c;
              });
              var diff = jsdiff.diffLines(applicationJs, sample);

              var unifiedDiff = '';
              if (diff.length > 1 || (diff[0].added || diff[0].removed)) {
                process.env.DEBUG && console.log('diff:', diff);
                unifiedDiff = jsdiff.createPatch(location, applicationJs, sample);
                result.warnings.push(location + ' is diverged from latest application.js template :\n' + unifiedDiff);

                if (process.env.FHLINT_FIX) {
                  fs.writeFileSync(location, jsdiff.applyPatch(applicationJs, unifiedDiff));
                }
              }

              return mcb();
            });
          }, pcb);
        });
      } else {
        return pcb();
      }
    }, function checkPublicIndex(pcb) {
      if (res.flags.hasApplicationJS) {
        var index = path.join(dir, 'public', 'index.html');
        fs.exists(index, function(exists) {
          if (err) throw err;

          if (!exists) {
            result.warnings.push('Could not find static index file at ' + index);
            if (process.env.FHLINT_FIX) {
              mkdirp(path.join(dir, 'public'), function (err) {
                if (err) throw err;

                fs.copy(path.join(__dirname, 'sample', 'index.html'), index, function(err){
                  if (err) throw err;
                  return pcb();
                });
              });
            } else {
              return pcb();
            }
          } else {
            return pcb();
          }
        });
      } else {
        return pcb();
      }
    }], function(err, res) {
      return cb(err, result);
    });
  });
};