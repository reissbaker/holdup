var Deferred = require('./lib/deferred/deferred').Deferred,
    holdup = require('./lib/holdup/holdup'),
    error = require('./lib/deferred/error');

holdup.Deferred = Deferred;
holdup.on = error.events.on;
holdup.off = error.events.off;
holdup.once = error.events.once;
holdup.resetErrors = error.reset;

module.exports = holdup;
