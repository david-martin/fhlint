#!/usr/bin/env node

if (process.argv[2] == null) {
  console.log(require('../package.json').version + '\nUsage: fhlint <path> e.g. fhlint ., fhlint /home/user/repo');
  process.exit(0);
} 

if (process.argv[2] === '-v') {
  console.log(require('../package.json').version);
  process.exit(0);
}

require('../index.js')(process.argv[2], function(err, res) {
  if (err) {
    console.error('ERR', err);
    process.exit(1);
  }
  console.log(JSON.stringify(res, true, 2));
  process.exit(0);
});