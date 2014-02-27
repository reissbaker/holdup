!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.holdup=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var Deferred = _dereq_('./lib/deferred').Deferred,
    holdup = _dereq_('./lib/holdup'),
    error = _dereq_('./lib/error');

holdup.Deferred = Deferred;
holdup.on = error.events.on;
holdup.off = error.events.off;
holdup.once = error.events.once;
holdup.resetErrors = error.reset;

module.exports = holdup;

},{"./lib/deferred":2,"./lib/error":3,"./lib/holdup":4}],2:[function(_dereq_,module,exports){
(function (process){
'use strict';

/*
 * Setup
 * -----
 */


var error = _dereq_('./error'),
    state = _dereq_('./state'),
    Inspection = _dereq_('./inspection');

var logError = function() {};
if(typeof console !== 'undefined' && typeof console.log === 'function') {
  logError = function() { console.log.apply(console, arguments); };
}



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



/*
 * Deferred Class
 * -------------
 */

function Deferred() {
  this._fulfilledBuffer = [];
  this._rejectedBuffer = [];
  this._thrownBuffer = [];

  this._state = state.PENDING;
  this._value = null;

  this._scheduled = false;
  this._log = false;
}



/*
 * Deferred Public Methods
 * ----------------------
 */


Deferred.prototype.then = function(callback, errback, thrownBack) {
  var deferred = new Deferred;

  buffer(this, deferred, callback, errback, thrownBack);
  if(!isPending(this)) scheduleBufferExecution(this);

  return new Flyweight(deferred);
};

Deferred.prototype.thrown = function(ThrownClass, thrownBack) {
  if(!thrownBack) {
    thrownBack = ThrownClass;
    ThrownClass = null;
  }
  if(!thrownBack) return this.then();

  return this.then(null, null, function(e) {
    if(ThrownClass === null) return thrownBack(e);
    if(e instanceof ThrownClass) return thrownBack(e);
  });
};

Deferred.prototype.error = function(ErrorClass, errback) {
  if(!errback) {
    errback = ErrorClass;
    ErrorClass = null;
  }
  if(!errback) return this.then();

  return this.then(null, function(reason) {
    if(ErrorClass === null) return errback(reason);
    if(reason instanceof ErrorClass) return errback(reason);
  });
};

Deferred.prototype.inspect = function() {
  return new Inspection(this);
};

Deferred.prototype.fulfill = function(value) {
  if(!isPending(this)) return;
  setState(this, state.FULFILLED, value);
  scheduleBufferExecution(this);
};

Deferred.prototype.reject = function(reason) {
  if(!isPending(this)) return;
  if(this._log) logError(reason);
  scheduleBufferExecution(this);
  setState(this, state.REJECTED, wrappedReason(reason, false));
};

Deferred.prototype.throwError = function(e) {
  if(!isPending(this)) return;
  if(this._log) logError(e);
  scheduleBufferExecution(this);
  setState(this, state.THROWN, wrappedReason(e, true));
};

Deferred.prototype.promise = function() {
  return new Flyweight(this);
};

function bind(method, scope) {
  return function() { return method.apply(scope, arguments); };
}



/*
 * Deferred Accessors
 * -----------------
 */


Deferred.prototype.fulfilled = function() {
  return isFulfilled(this);
};
Deferred.prototype.rejected = function() {
  return isRejected(this) || isThrown(this);
};
Deferred.prototype.pending = function() {
  return isPending(this);
};



/*
 * Deferred Private Methods
 * -----------------------
 */


/*
 * ### Getters ###
 */


function isPending(scope) {
  return scope._state === state.PENDING;
}

function isFulfilled(scope) {
  return scope._state === state.FULFILLED;
}

function isRejected(scope) {
  return scope._state === state.REJECTED;
}

function isThrown(scope) {
  return scope._state === state.THROWN;
}



/*
 * ### Setters ###
 */


/*
 * Adds a callback and an errback to the Deferred's buffer of functions to
 * call on `then` resolution.
 */

function buffer(deferred, child, callback, errback, thrownBack) {
  deferred._fulfilledBuffer.push(function(val) {
    adoptState(child, val, state.FULFILLED, callback, false);
  });

  deferred._rejectedBuffer.push(function(val) {
    adoptState(child, val, state.REJECTED, errback, false);
  });

  deferred._thrownBuffer.push(function(val) {
    adoptState(child, val, state.THROWN, errback, false);
  });

  deferred._thrownBuffer.push(function(val) {
    adoptState(child, val, state.THROWN, thrownBack, true);
  });
}


/*
 * Sets the state of the given deferred and stores its state arguments.
 */
function setState(deferred, state, value) {
  deferred._state = state;
  deferred._value = value;
}

/*
 * Attempts to schedule execution of a given deferred's buffer. If the
 * deferred is already scheduled for a buffer execution, returns.
 */
function scheduleBufferExecution(deferred) {
  if(deferred._scheduled) return;

  deferred._scheduled = true;
  process.nextTick(function() {
    deferred._scheduled = false;
    executeBuffer(deferred);
  });
}

/*
 * Executes the given deferred's buffer of `then` callbacks and errbacks
 * according to the deferred's resolved state.
 */
function executeBuffer(deferred) {
  var buffer = stateBuffer(deferred);

  runFunctions(buffer, deferred._value);

  clearStateBuffers(deferred);
}

/*
 * Given a deferred, returns the deferred's fulfilled (callback) buffer if the
 * deferred is fulfilled, or its rejected (errback) buffer otherwise.
 */
function stateBuffer(deferred) {
  if(isFulfilled(deferred)) return deferred._fulfilledBuffer;
  if(isThrown(deferred)) return deferred._thrownBuffer;
  return deferred._rejectedBuffer;
}

/*
 * Given a deferred, clears its callback and errback buffers.
 */
function clearStateBuffers(deferred) {
  deferred._fulfilledBuffer = [];
  deferred._rejectedBuffer = [];
  deferred._thrownBuffer = [];
}



/*
 * ### Deferred Helpers ###
 */

function wrappedReason(reason, thrown) {
  if(error.isWrapped(reason)) {
    error.postpone(reason);
    return reason;
  }
  return error.wrap(reason, thrown);
}


/*
 * Given a deferred child (returned from a `then`), attempts to make the child
 * adopt the correct state.
 */
function adoptState(child, val, state, callback, fromThrownHandler) {
  var childFn = stateFunction(child, state);

  if(typeof callback === 'function') {
    adoptFunctionState(child, callback, val, fromThrownHandler);
  } else {
    if(error.isWrapped(val)) error.postpone(val);
    process.nextTick(function() { childFn.call(child, val); });
  }
}

function stateFunction(deferred, s) {
  if(s === state.FULFILLED) return deferred.fulfill;
  if(s === state.THROWN) return deferred.throwError;
  return deferred.reject;
}

function adoptFunctionState(deferred, callback, val, fromThrownHandler) {
  var x,
      wrapped = error.isWrapped(val),
      value = wrapped ? error.unwrap(val) : val;

  try {
    x = callback(value);
    if(wrapped) error.handle(val, fromThrownHandler);
  } catch(e) {
    deferred.throwError(e);
    return;
  }

  resolve(deferred, x);
}

function resolve(deferred, x) {
  var then = null;

  // 1. If promise and x refer to the same object, reject promise with a
  // TypeError as the reason.
  if(shortCircuit(deferred, x)) return;

  // 2. If x is a promise, adopt its state.
  // 3. Otherwise, if x is an object or function,
  if(typeof x === 'function' || typeof x === 'object') {
    // i. Let then be x.then.
    then = getThen(x, deferred);

    // iii. If then is a function, call it with x as this, first argument
    // resolvePromise, and second argument rejectPromise, where:
    if(typeof then === 'function') {
      if(x instanceof Flyweight) deferredAdopt(x._deferred, then, deferred);
      else if(x instanceof Deferred) deferredAdopt(x, then, deferred);
      compatAdopt(x, then, deferred);
    } else {
      deferred.fulfill(x);
    }
    return;
  }

  // 4. If x is not an object or function, fulfill promise with x.
  deferred.fulfill(x);
}

function shortCircuit(deferred, x) {
  if(x === deferred) {
    deferred.throwError(new TypeError('Promise cannot return itself.'));
    return true;
  }

  if(x instanceof Flyweight && x._deferred === deferred) {
    deferred.throwError(new TypeError('Promise cannot return itself'));
    return true;
  }

  return false;
}

function getThen(x, deferred) {
  var then = null;
  try {
    then = thenFn(x);
  } catch(e) {
    // ii. If retrieving the property x.then results in a thrown exception
    // e, reject promise with e as the reason.
    deferred.throwError(e);
  }
  return then;
}

function deferredAdopt(x, then, deferred) {
  var fns = adoptFunctions(x, then, deferred);
  try {
    then.call(x, fns.resolve, fns.reject, fns.throwError);
  } catch(e) {
    // d. If calling then throws an exception e,
    //   a. If resolvePromise or rejectPromise have been called, ignore
    //   it.
    // b. Otherwise, reject promise with e as the reason.
    fns.throwError(e);
  }
}

function compatAdopt(x, then, deferred) {
  var fns = adoptFunctions(x, then, deferred);

  try {
    then.call(x, fns.resolve, fns.reject);
  } catch(e) {
    // d. If calling then throws an exception e,
    //   a. If resolvePromise or rejectPromise have been called, ignore
    //   it.
    // b. Otherwise, reject promise with e as the reason.
    fns.throwError(e);
  }
}

function adoptFunctions(x, then, deferred) {
  var resolveCalled, rejectCalled, thrownCalled,
      called = false;

  // a. If/when resolvePromise is called with a value y, run
  // [[Resolve]](promise, y).
  var resolvePromise = function(y) {
    if(called) return;
    called = resolveCalled = true;
    resolve(deferred, y);
  };

  // If/when rejectPromise is called with a reason r, reject promise with
  // r.
  var rejectPromise = function(r) {
    if(called) return;
    called = rejectCalled = true;
    deferred.reject(r);
  };

  // If/when throwError is called with an error e, reject promise with e.
  var throwError = function(e) {
    if(called) return;
    called = thrownCalled = true;
    deferred.throwError(e);
  };

  return {
    resolve: resolvePromise,
    reject: rejectPromise,
    throwError: throwError
  };
}



/*
 * Helper Functions
 * ----------------
 */


function thenFn(obj) {
  if(!obj) return null;
  return obj.then;
}

function runFunctions(fns, value) {
  var index, curr;
  for(index = 0; curr = fns[index]; index++) {
    curr(value);
  }
}




/*
 * Packaging
 * ---------
 */


exports.Deferred = Deferred;

}).call(this,_dereq_("/Users/mattbaker/Hack/holdup/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"./error":3,"./inspection":5,"./state":6,"/Users/mattbaker/Hack/holdup/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":7}],3:[function(_dereq_,module,exports){
(function (process){
/*
* Error Handling
* =============================================================================
*
* Tracks errors and rejections as they move through trees of promises.
* Responsible for detecting when unhandled rejections and thrown errors occur,
* and emitting events when they do.
*/

'use strict';

/*
 * Setup
 * ---------------------------------------------------------------------------
 */


var guid = 0;
function AsyncError(err, thrown) {
  this.error = err;
  this.thrown = thrown;
  this.id = guid++;
  this.postponed = false;
}

var errorHandlers = [],
    thrownHandlers = [];

exports.events = {
  on: function(type, callback) {
    if(type === 'error') errorHandlers.push(callback);
    else if(type === 'thrown') thrownHandlers.push(callback);
  },
  off: function(type, callback) {
    var callbacks;
    if(type === 'error') callbacks = errorHandlers;
    else if(type === 'thrown') callbacks = thrownHandlers;
    for(var i = 0, l = callbacks.length; i < l; i++) {
      if(callbacks[i] === callback) {
        callbacks.splice(i, 1);
        return true;
      }
    }
    return false;
  },
  once: function(type, callback) {
    var wrapped = function() {
      callback.apply(undefined, arguments);
      exports.events.off(type, wrapped);
    };
    exports.events.on(type, wrapped);
  }
};


var unhandled = {};

exports.wrap = function(err, thrown) {
  var asyncErr = new AsyncError(err, thrown);
  unhandled[asyncErr.id] = asyncErr;
  scheduleException();
  return asyncErr;
};

exports.unwrap = function(asyncErr) {
  return asyncErr.error;
};

exports.isWrapped = function(obj) {
  return obj instanceof AsyncError;
};

exports.handle = function(asyncErr, fromThrownHandler) {
  if(asyncErr.thrown && !fromThrownHandler) return;

  if(unhandled.hasOwnProperty(asyncErr.id)) {
    delete unhandled[asyncErr.id];
  }
};

exports.postpone = function(asyncErr) {
  asyncErr.postponed = true;
};

exports.reset = function() {
  unhandled = {};
  errorHandlers = [];
  thrownHandlers = [];
  scheduled = false;
  stackVersion++;
};

var scheduled = false,
    stackVersion = 0;
function scheduleException() {
  var version = stackVersion;
  if(!scheduled) {
    scheduled = true;
    process.nextTick(function() {
      if(version === stackVersion) {
        scheduled = false;
        announceExceptions();
      }
    });
  }
}

function announceExceptions() {
  var prop, curr;
  for(prop in unhandled) {
    if(unhandled.hasOwnProperty(prop)) {
      curr = unhandled[prop];
      if(curr.postponed) {
        curr.postponed = false;
        scheduleException();
      } else {
        exports.handle(curr, true);
        announceException(curr);
      }
    }
  }
}

function announceException(asyncErr) {
  var callbacks;
  if(asyncErr.thrown) {
    callbacks = errorHandlers.concat(thrownHandlers);
  } else {
    callbacks = errorHandlers;
  }
  for(var i = 0, l = callbacks.length; i < l; i++) {
    callbacks[i](exports.unwrap(asyncErr));
  }
}

}).call(this,_dereq_("/Users/mattbaker/Hack/holdup/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/Users/mattbaker/Hack/holdup/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":7}],4:[function(_dereq_,module,exports){
/*
 * TODO: remove all references to .inspect -- it's not cross-compatible. Or,
 * figure out how to wrap non-holdup promises in holdup promises.
 *
 * TODO: write a version of collect() that works more like compose() -- it
 * collects potentially only values/errors (or both), and its promise only fires
 * if all match.
 */

'use strict';

var Deferred = _dereq_('./deferred').Deferred;


/*
 * Creating Promises
 * ---------------------------------------------------------------------------
 */


/*
 * ### holdup.make
 *
 * Given a callback of form `function(fulfill, reject) {}`, returns a promise
 * that will be fulfilled when the callback calls `fulfill` or rejected
 * when the promise calls `reject`.
 *
 * The returned promise will call its `then` callback with whatever is passed
 * to the `fulfill` callback, and will call its `then` errback with whatever
 * is passed to the `reject` errback.
 */

exports.make = function(callback) {
  var deferred = new Deferred;
  try {
    callback(
      bind(deferred.fulfill, deferred),
      bind(deferred.reject, deferred)
    );
  } catch(e) {
    deferred.throwError(e);
  }
  return deferred.promise();
};


/*
 * ### holdup.fulfill
 *
 * Given a value, returns a promise that will fulfill to the value.
 *
 * Essentially a degenerate, but convenient form of `holdup.make` for
 * creating promises that you know will fulfill to a specific value.
 */

exports.fulfill = function(val) {
  return exports.make(function(fulfill) { fulfill(val); });
};


/*
 * ### holdup.fcall
 *
 * Given a function that returns a value, returns a promise that will fulfill
 * to the result of the given function.
 *
 * Essentially a degenerate, but convenient form of `holdup.make` for
 * creating promises that you know will fulfill to a specific value.
 */

exports.fcall = function(fn) {
  return exports.make(function(fulfill) { fulfill(fn()); });
};


/*
 * ### holdup.reject
 *
 * Given a reason, returns a promise that will reject with the reason.
 *
 * Essentially a degenerate but convenient form of `holdup.make` for creating
 * promises that you know will reject to a specific value.
 */

exports.reject = function(reason) {
  return exports.make(function(fulfill, reject) { reject(reason); });
};


/*
 * ### holdup.ferr
 *
 * Given a function that returns a value, returns a promise that will reject
 * with the result of the given function passed as the rejection reason.
 *
 * Essentially a degenerate but convenient form of `holdup.make` for creating
 * promises that you know will reject to a specific value.
 */

exports.ferr = function(fn) {
  return exports.make(function(fulfill, reject) { reject(fn()); });
};



/*
 * Manipulating Promises
 * ---------------------------------------------------------------------------
 */


/*
 * ### holdup.all
 *
 * Takes an arg list, array, array of arrays, arg lists of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled if all the promises fulfill, and
 * will reject as soon as any of the promises reject.
 *
 * It will call its `then` callback with the array of all fulfilled values,
 * in the order that their respective promises were passed in. It will call its
 * `then` errback with the first promise to reject.
 */

exports.all = function() {
  var promises = extract(arguments),
      composed = compose(promises, true, false);
  return exports.make(function(fulfill, reject) {
    composed.promise.then(
      function() {
        collect(promises, false).then(function(data) { fulfill(data); });
      },
      function() { composed.rejected[0].error(function(e) { reject(e); }); }
    );
  });
};


/*
 * ### holdup.none
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled if all of the promises reject,
 * and will reject as soon as any of the promises fulfill.
 *
 * The returned promise will call its `then` callback with the array of all
 * rejected promises, in the order that they rejected. It will call its
 * `then` errback with the first promise to fulfill.
 */

exports.noPromisesOrdered = function() {
  var composed = compose(extract(arguments), false, true);

  return exports.make(function(fulfill, reject) {
    composed.promise.then(
      function() { fulfill(composed.rejected); },
      function() { reject(composed.fulfilled[0]); }
    );
  });
};

exports.none = function() {
  var promises = extract(arguments);
  return exports.noPromisesOrdered(promises).then(function() {
    return collect(promises, true);
  }, function(fulfilled) {
    return fulfilled.then(function(data) { return exports.reject(data); });
  });
};


/*
 * ### holdup.resolved
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled once all of the given promises
 * are no longer in a pending state; i.e., once they've each been rejected
 * or fulfilled. The promises don't have to end in the same state: they only
 * have to leave the pending state.
 *
 * The returned promise will call its `then` callback with a hash containing
 * two keys: `fulfilled` and `rejected`. The `fulfilled` key has an array of
 * all fulfilled promises in the order that they fulfilled, and the `rejected`
 * key has an array of all rejected promises in the order that they rejected.
 * If no promises fulfilled, the `fulfilled` key will point to an empty array;
 * if no promises rejected, the `rejected` key will similarly point to an
 * empty list.
 */

exports.resolvedPromisesOrdered = function() {
  var composed = compose(extract(arguments), true, true);

  return exports.make(function(fulfill, reject) {
    composed.promise.then(function() {
      fulfill({
        fulfilled: composed.fulfilled,
        rejected: composed.rejected
      });
    });
  });
};

exports.resolved = exports.settled = exports.allSettled = function() {
  var promises = extract(arguments);
  return exports.resolvedPromisesOrdered(promises).then(function() {
    var inspections = [];
    for(var i = 0, l = promises.length; i < l; i++) {
      inspections.push(promises[i].inspect());
    }
    return inspections;
  });
};


/*
 * ### holdup.firstFulfilled
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled as soon as the first of the
 * given promises fulfills, and will reject if none of the promises fulfill.
 *
 * The returned promise will call its `then` callback with the first
 * fulfilled promise, and will call its `then` errback with the array of all
 * rejected promises in the order that they rejected.
 */

exports.firstFulfilled = exports.ff = function() {
  var promise = exports.noPromisesOrdered(extract(arguments));

  return exports.make(function(fulfill, reject) {
    promise.then(reject, fulfill);
  });
};

exports.firstValue = exports.race = function() {
  var promises = extract(arguments);

  return exports.ff(promises).then(function(first) {
    return first.inspect().value();
  }, function() {
    return collect(promises, true).then(function(errors) {
      return exports.reject(errors);
    });
  });
};


/*
 * ### holdup.firstError
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled as soon as the first of the
 * given promises rejects, and will reject if none of the promises reject.
 *
 * The returned promise will call its `then` callback with the first rejection
 * reason, and will call its `then` errback with the array of all fulfilled
 * values in the order that their respective promises were passed in.
 */

exports.firstError = function() {
  var promises = extract(arguments),
      composed = compose(promises, true, false);

  return exports.make(function(fulfill, reject) {
    composed.promise.then(
      function() {
        collect(promises, false).then(function(data) { reject(data); });
      },
      function() { fulfill(composed.rejected[0].inspect().error()); }
    );
  });
};


/*
 * ### holdup.lastFulfilled
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled once all of the promises have
 * left their pending state, and at least one has fulfilled. It will reject
 * if all given promises reject.
 *
 * The returned promise will call its `then` callback with the last
 * fulfilled promise, and will call its `then` errback with the array of all
 * rejected promises in the order that they rejected.
 */

exports.lastFulfilled = exports.lf = function() {
  var promise = exports.resolvedPromisesOrdered(extract(arguments));

  return exports.make(function(fulfill, reject) {
    promise.then(function(promises) {
      var fulfilled = promises.fulfilled,
          rejected = promises.rejected;
      if(fulfilled.length === 0) reject(rejected);
      else fulfill(fulfilled[fulfilled.length - 1]);
    });
  });
};

exports.lastValue = function() {
  var promises = extract(arguments);
  return exports.lastFulfilled(promises).then(function(last) {
    return last.inspect().value();
  }, function() {
    return collect(promises, false).then(function(data) {
      return exports.reject(data);
    });
  });
};


/*
 * ### holdup.lastRejected
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled once all of the promises have
 * left their pending state, and at least one has rejected. It will reject
 * if all given promises fulfill.
 *
 * The returned promise will call its `then` callback with the first
 * rejected promise, and will call its `then` errback with the array of all
 * fulfilled promises in the order that they fulfilled.
 */

exports.lastRejected = exports.lr = function() {
  var promise = exports.resolvedPromisesOrdered(extract(arguments));

  return exports.make(function(fulfill, reject) {
    promise.then(function(promises) {
      var fulfilled = promises.fulfilled,
          rejected = promises.rejected;
      if(rejected.length === 0) reject(fulfilled);
      else fulfill(rejected[rejected.length - 1]);
    });
  });
};

exports.lastError = function() {
  var promises = extract(arguments);
  return exports.lastRejected(promises).then(function(last) {
    return last.inspect().error();
  }, function() {
    return collect(promises, true).then(function(data) {
      return exports.reject(data);
    });
  });
};


/*
 * ### holdup.invert
 *
 * Given a promise, returns a promise that will reject when the given promise
 * fulfills and will fulfill when the given promise rejects.
 *
 * If data is passed to the callback of the given promise, it will be passed
 * as the error to the returned promise's errback. If an error is passed to
 * the errback of the given promise, it will be passed as the data to the
 * returned promises callback.
 */

exports.invert = function(promise) {
  return exports.make(function(fulfill, reject) {
    promise.then(reject, fulfill);
  });
};



/*
 * Working With Values
 * ---------------------------------------------------------------------------
 */

exports.spreadValues = exports.spread = function(promise, callback) {
  promise.then(function(arrish) { callback.apply(undefined, arrish); });
};

exports.spreadErrors = function(promise, callback) {
  promise.then(undefined, function(arrish) {
    callback.apply(undefined, arrish);
  });
};

/*
 * ### holdup.data
 *
 * Takes a list of promises (in array or arg list form) containing promises,
 * and a callback function.
 *
 * Calls the callback function with the data from the promises' `then`
 * callbacks, ordered according to the promises' ordering in the arguments.
 *
 * For example:
 *
 *     holdup.data(a, b, c, function(aData, bData, cData) {
 *       // do things with the data from a, b, and c
 *     });
 *
 * The callback will only be called once all promises have resolved. If
 * promises are resolved in a rejected state, their corresponding data will be
 * passed in as `undefined`.
 */

exports.data = function() {
  var args = argArray(arguments),
      promises = extract(args.slice(0, args.length - 1)),
      composed = collect(promises, false),
      callback = args[args.length - 1];
  composed.then(function(data) { callback.apply(null, data); });
  return composed;
};


/*
 * ### holdup.errors
 *
 * Takes a list of promises (in array or arg list form) containing promises,
 * and a callback function.
 *
 * Calls the callback function with the errors from the promises' `then`
 * errbacks, ordered according to the promises' ordering in the arguments.
 *
 * For example:
 *
 *     holdup.errors(a, b, c, function(aError, bError, cError) {
 *       // do things with the errors from a, b, and c
 *     });
 *
 * The callback will only be called once all promises have resolved. If
 * promises are resolved in a fulfilled state, their corresponding error will
 * be passed in as `undefined`.
 */

exports.errors = function() {
  var args = argArray(arguments),
      promises = extract(args.slice(0, args.length - 1)),
      composed = collect(promises, true),
      callback = args[args.length - 1];
  composed.then(function(data) { callback.apply(null, data); });
  return composed;
};



/*
 * Timing Functions
 * ---------------------------------------------------------------------------
 */


/*
 * ### holdup.wait
 *
 * Given a time in milliseconds, returns a promise that calls its `then`
 * callback after that amount of time. The returned promise will never call
 * any errback functions given to it.
 *
 * The returned promise will pass along the given timeout interval to the
 * `then` callback as its first parameter.
 */

exports.wait = function(time) {
  return exports.make(function(fulfill) {
    setTimeout(function() { fulfill(time); }, time);
  });
};


/*
 * ### holdup.delay
 *
 * Given a promise and a time in milliseconds, returns a promise that fulfills
 * when the given promise fulfills or rejects when the first one rejects, but
 * waits the given time before fulfilling or rejecting.
 */

exports.delay = function(promise, time) {
  return exports.make(function(fulfill, reject) {
    promise.then(
      function() {
        var args = argArray(arguments, 0);
        setTimeout(function() { fulfill.apply(null, args); }, time);
      },
      function() {
        var args = argArray(arguments, 0);
        setTimeout(function() { reject.apply(null, args); }, time);
      }
    );
  });
};


/*
 * ### holdup.timeout
 *
 * Given a promise and a time in milliseconds, returns a promise that fulfills
 * if the given promise fulfills before the time is up and rejects otherwise.
 */

exports.timeout = function(promise, time) {
  return exports.make(function(fulfill, reject) {
    setTimeout(function() {
      reject('Error: ' + time + 'ms timeout exceeded.');
    }, time);
    promise.then(fulfill, reject);
  });
};



/*
 * Interfacing with Node-style Async Functions
 * ---------------------------------------------------------------------------
 */

/*
 * ### holdup.napply
 *
 * Given a scope, a Node-style async function, and an array of arguments,
 * returns a promise that fulfills if the given function completes
 * successfully and rejects if it doesn't.
 *
 * The returned promise will call its `then` callback with anything passed as
 * the `data` parameter to the async function (if anything is in fact passed),
 * and will call its `then` errback with anything passed as the `err` param to
 * the async function.
 */

exports.napply = function(scope, fn, args) {
  var argCopy = args.slice(0, args.length);
  return exports.make(function(fulfill, reject) {
    argCopy.push(function(err, data) {
      if(err) reject(err);
      else fulfill(data);
    });
    fn.apply(scope, argCopy);
  });
};


/*
 * ### holdup.nfapply
 *
 * A convenient, scopeless version of `napply`, for times when it's acceptable
 * that the scope of `napply` be `null`.
 */

exports.nfapply = function(fn, args) {
  return exports.napply(null, fn, args);
};


/*
 * ### holdup.ncall
 *
 * Given a scope, a Node-style async function, and optional arguments, returns
 * a promise that fulfills if the given function completes successfully and
 * rejects if it doesn't.
 *
 * The returned promise will call its `then` callback with anything passed as
 * the `data` parameter to the async function (if anything is in fact passed),
 * and will call its `then` errback with anything passed as the `err` param to
 * the async function.
 */

exports.ncall = exports.wrapFor = function(scope, fn) {
  var args = argArray(arguments, 2);
  return exports.napply(scope, fn, args);
};


/*
 * ### holdup.nfcall
 *
 * A convenient, scopeless version of `ncall`, for times when it's acceptable
 * that the scope of `ncall` be `null`.
 */

exports.nfcall = exports.wrap = function(fn) {
  var args = argArray(arguments, 1);
  return exports.napply(null, fn, args);
};


/*
 * ### holdup.npost
 *
 * Given an object, a method name corresponding to a Node-style async
 * function, and an array of arguments, returns a promise that fulfills if the
 * given method completes successfully and rejects if it doesn't.
 *
 * The returned promise will call its `then` callback with anything passed as
 * the `data` parameter to the async function (if anything is in fact passed),
 * and will call its `then` errback with anything passed as the `err` param to
 * the async function.
 */

exports.npost = function(obj, methodName, args) {
  return exports.napply(obj, obj[methodName], args);
};


/*
 * ### holdup.ninvoke
 *
 * Given an object, a method name corresponding to a Node-style async
 * function, and an optional argument list of parameters, returns a promise
 * that fulfills if the given method completes successfully and rejects if it
 * doesn't.
 *
 * The returned promise will call its `then` callback with anything passed as
 * the `data` parameter to the async function (if anything is in fact passed),
 * and will call its `then` errback with anything passed as the `err` param to
 * the async function.
 */

exports.ninvoke = exports.nsend = function(obj, methodName) {
  var args = argArray(arguments, 2);
  return exports.napply(obj, obj[methodName], args);
};


/*
 * ### holdup.nbind
 *
 * Given a Node-style async function, a scope, and an optional argument list
 * of parameters, returns a promise-returning function bound to the scope and
 * the given parameters.
 *
 * The returned promise will call its `then` callback with anything passed as
 * the `data` parameter to the async function (if anything is in fact passed),
 * and will call its `then` errback with anything passed as the `err` param to
 * the async function.
 *
 * For example:
 *
 *     var readProust = holdup.bind(fs.readFile, fs, 'proust.txt', 'utf-8');
 *     readProust().then(function(text) {
 *       // do things with text
 *     });
 */

exports.nbind = function(fn, scope) {
  var boundArgs = argArray(arguments, 2);
  return function() {
    var args = argArray(arguments);
    return exports.napply(scope, fn, boundArgs.concat(args));
  };
};


/*
 * ### holdup.nfbind
 *
 * A convenient, scopeless version of nbind, for times when it's acceptable
 * that the scope of `nbind` be `null`.
 */

exports.nfbind = exports.denodeify = function(fn) {
  var args = ([fn, null]).concat(argArray(arguments, 1));
  return exports.nbind.apply(exports, args);
};


/*
 * ### holdup.nodeify
 *
 * Given a promise and a Node-style callback, calls the callback with the
 * correct `data` and `err` arguments when the promise fulfills or rejects.
 * Useful for creating dual promise/callback APIs, or for using promises
 * internally but exposing only a callback API.
 */

exports.nodeify = function(promise, callback) {
  promise.then(
    function(data) { callback(null, data); },
    function(err) { callback(err); }
  );
  return promise;
};



/*
 * Helper Functions
 * ---------------------------------------------------------------------------
 */

function collect(promises, inverse) {
  var curr, index, length,
      collection = new Array(promises.length),
      promise = new Deferred,
      sem = semaphore(
        promises.length,
        bind(promise.fulfill, promise),
        bind(promise.reject, promise)
      );

  function insert(index) {
    return function(el) {
      collection[index] = el;
      sem.decrement();
    };
  }

  function blank(index) {
    return function() {
      collection[index] = undefined;
      sem.decrement();
    };
  }

  var first = !inverse ? insert : blank,
      second = !inverse ? blank : insert;

  for(index = 0, length = promises.length; index < length; index++) {
    curr = promises[index];
    curr.then(first(index), second(index));
  }

  return promise.then(function() { return collection; });
}

function compose(promises, decF, decR) {
  var fulfilled = [],
      rejected = [],
      collectF = function(promise) { fulfilled.push(promise); },
      collectR = function(promise) { rejected.push(promise); },
      fulfillBack = decF ? decrement(collectF) : errorOut(collectF),
      rejectBack = decR ? decrement(collectR) : errorOut(collectR);

  return {
    fulfilled: fulfilled,
    rejected: rejected,
    promise: composeHelper(promises, fulfillBack, rejectBack)
  };
}

function composeHelper(promises, callbackComposer, errbackComposer) {
  var index, curr, sem,
      promise = new Deferred;

  if(promises.length === 0) {
    promise.fulfill([]);
    return promise;
  }

  sem = semaphore(
    promises.length,
    bind(promise.fulfill, promise),
    bind(promise.reject, promise)
  );

  for(index = 0; curr = promises[index]; index++) {
    curr.then(callbackComposer(sem, curr), errbackComposer(sem, curr));
  }

  return promise;
}

function semaphore(length, callback, errback) {
  var count = length,
      errored = false;
  var sem = {
    decrement: function() {
      if(errored) return;
      count--;
      if(count === 0) callback();
    },
    error: function() {
      if(!errored) {
        errored = true;
        errback.apply(arguments);
      }
    }
  };

  if(count === 0) callback();
  return sem;
}

function decrement(collector) {
  return function(sem, promise) {
    return function() {
      if(collector) collector(promise);
      sem.decrement();
    };
  };
}

function errorOut(collector) {
  return function(sem, promise) {
    return function() {
      if(collector) collector(promise);
      sem.error();
    };
  };
}

function bind(fn, scope) {
  return function() { fn.apply(scope, arguments); };
}

function extract(args) {
  return flatten(argArray(args));
}

function flatten(arr) {
  var index, curr,
      flattened = [];

  for(index = 0; curr = arr[index]; index++) {
    if(curr instanceof Array) flattened = flattened.concat(flatten(curr));
    else flattened.push(curr);
  }

  return flattened;
}

function argArray(args, start, end) {
  return Array.prototype.slice.call(args, start || 0, end || args.length);
}

},{"./deferred":2}],5:[function(_dereq_,module,exports){
'use strict';

var state = _dereq_('./state'),
    error = _dereq_('./error');

function Inspection(deferred) {
  this._d = deferred;
}

Inspection.prototype.value = function() {
  if(!this.isFulfilled()) throw new TypeError;
  return this._d._value;
};

Inspection.prototype.error = function() {
  if(!this.isRejected()) throw new TypeError;
  var val = this._d._value;
  if(error.isWrapped(val)) return error.unwrap(val);
  return val;
};

Inspection.prototype.isThrown = function() {
  return inState(this._d, state.THROWN);
};

Inspection.prototype.isRejected = function() {
  return inState(this._d, state.REJECTED) || this.isThrown();
};

Inspection.prototype.isFulfilled = function() {
  return inState(this._d, state.FULFILLED);
};

function inState(deferred, state) {
  return deferred._state === state;
}

module.exports = Inspection;

},{"./error":3,"./state":6}],6:[function(_dereq_,module,exports){
'use strict';

// Deferred state constants.
exports.REJECTED = 0;
exports.FULFILLED = 1;
exports.PENDING = 2;
exports.THROWN = 3;

},{}],7:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[1])
(1)
});