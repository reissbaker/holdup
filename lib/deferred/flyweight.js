/*
 * Deferred Flyweight
 * ---------------------------------------------------------------------------
 */

function Flyweight(deferred) {
  this.then = bind(deferred.then, deferred);
  this.error = bind(deferred.error, deferred);
  this.thrown = bind(deferred.thrown, deferred);
  this.inspect = bind(deferred.inspect, deferred);
  this._deferred = deferred;
}


function bind(method, scope) {
  return function() { return method.apply(scope, arguments); };
}

module.exports = Flyweight;
