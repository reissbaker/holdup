var Deferred = require('./lib/deferred').Deferred,
    holdup = require('./lib/holdup');

holdup.Deferred = Deferred;
module.exports = holdup;
