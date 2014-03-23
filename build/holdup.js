!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.holdup=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var Deferred = _dereq_('./lib/deferred/deferred').Deferred,
    holdup = _dereq_('./lib/holdup/holdup'),
    error = _dereq_('./lib/deferred/error');

holdup.Deferred = Deferred;
holdup.on = error.events.on;
holdup.off = error.events.off;
holdup.once = error.events.once;
holdup.resetErrors = error.reset;

module.exports = holdup;

},{"./lib/deferred/deferred":2,"./lib/deferred/error":3,"./lib/holdup/holdup":8}],2:[function(_dereq_,module,exports){
(function (process){
'use strict';

/*
 * Setup
 * -----
 */


var error = _dereq_('./error'),
    state = _dereq_('./state'),
    Inspection = _dereq_('./inspection'),
    Flyweight = _dereq_('./flyweight');

var logError = function() {};
if(typeof console !== 'undefined' && typeof console.log === 'function') {
  logError = function() { console.log.apply(console, arguments); };
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

Deferred.prototype.thrownError = function(ThrownClass, thrownBack) {
  if(!thrownBack) {
    thrownBack = ThrownClass;
    ThrownClass = null;
  }
  if(!thrownBack) return this.then();

  return this.then(null, null, function(e) {
    if(ThrownClass === null) return thrownBack(e);
    if(e instanceof ThrownClass) return thrownBack(e);
    var t = new Deferred;
    t.throwError(e);
    return t;
  });
};

Deferred.prototype.thrown = Deferred.prototype.thrownError;

Deferred.prototype.error = function(ErrorClass, errback) {
  if(!errback) {
    errback = ErrorClass;
    ErrorClass = null;
  }
  if(!errback) return this.then();

  return this.then(null, function(reason) {
    if(ErrorClass === null) return errback(reason);
    if(reason instanceof ErrorClass) return errback(reason);
    var e = new Deferred;
    e.reject(reason);
    return e;
  });
};

Deferred.prototype.unthrownError = function(ErrorClass, errback) {
  if(!errback) {
    errback = ErrorClass;
    ErrorClass = null;
  }
  if(!errback) return this.then();

  var that = this;
  return this.error(ErrorClass, function(r) {
    var d,
        i = that.inspect();
    if(i.isThrown()) {
      d = new Deferred;
      d.throwError(r);
      return d;
    }

    return errback(r);
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
},{"./error":3,"./flyweight":4,"./inspection":5,"./state":7,"/Users/mattbaker/Hack/holdup/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":10}],3:[function(_dereq_,module,exports){
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
},{"/Users/mattbaker/Hack/holdup/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":10}],4:[function(_dereq_,module,exports){
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

},{}],5:[function(_dereq_,module,exports){
'use strict';

var state = _dereq_('./state'),
    stateContainer = _dereq_('./state-container'),
    error = _dereq_('./error');

function Inspection(state, value) {
  this._s = stateContainer(state, value);
}

Inspection.prototype.value = function() {
  if(!this.isFulfilled()) throw new TypeError;
  return this._s.value();
};

Inspection.prototype.error = function() {
  if(!this.isRejected()) throw new TypeError;
  var val = this._s.value();
  if(error.isWrapped(val)) return error.unwrap(val);
  return val;
};

Inspection.prototype.isThrown = function() {
  return this._s.state() === state.THROWN;
};

Inspection.prototype.isRejected = function() {
  return this._s.state() === state.REJECTED || this.isThrown();
};

Inspection.prototype.isFulfilled = function() {
  return this._s.state() === state.FULFILLED;
};

module.exports = Inspection;

},{"./error":3,"./state":7,"./state-container":6}],6:[function(_dereq_,module,exports){
'use strict';

function DeferredStateContainer(deferred) {
  this.d = deferred;
}
DeferredStateContainer.prototype.state = function() { return this.d._state; };
DeferredStateContainer.prototype.value = function() { return this.d._value; };


function SyncStateContainer(state, value) {
  this._s = state;
  this._v = value;
}
SyncStateContainer.prototype.state = function() { return this._s; };
SyncStateContainer.prototype.value = function() { return this._v; };

module.exports = function(state, value) {
  if(typeof state === 'number') return new SyncStateContainer(state, value);
  return new DeferredStateContainer(state);
};

},{}],7:[function(_dereq_,module,exports){
'use strict';

// Deferred state constants.
exports.REJECTED = 0;
exports.FULFILLED = 1;
exports.PENDING = 2;
exports.THROWN = 3;

},{}],8:[function(_dereq_,module,exports){
'use strict';

var Deferred = _dereq_('../deferred/deferred').Deferred,
    Flyweight = _dereq_('../deferred/flyweight'),
    Semaphore = _dereq_('./semaphore'),
    state = _dereq_('../deferred/state'),
    Inspection = _dereq_('../deferred/inspection');


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
  return composeUnwrapped(extract(arguments), true, false);
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

exports.none = function() {
  return composeUnwrapped(extract(arguments), false, true);
};


/*
 * ### holdup.settled
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled once all of the given promises
 * are no longer in a pending state; i.e., once they've each been rejected
 * or fulfilled. The promises don't have to end in the same state: they only
 * have to leave the pending state. The returned promise will never reject.
 *
 * The returned promise will call its `then` callback with an array of promise
 * Inspection instances, with each inspection in the order that its respective
 * promise was passed in.
 */

exports.resolved = exports.settled = exports.allSettled = function() {
  var insertion, curr, capture,
      promises = extract(arguments),
      deferred = new Deferred,
      inspections = new Array(promises.length),
      sem = new Semaphore(
        promises.length,
        function() { deferred.fulfill(inspections); }
      ),
      dec = bind(sem.decrement, sem);

  for(var i = 0, l = promises.length; i < l; i++) {
    insertion = insert(inspections, i);
    curr = promises[i];
    capture = composeFns(dec, insertion);

    if(curr instanceof Deferred || curr instanceof Flyweight) {
      curr.then(inspection(state.FULFILLED, capture));
      curr.unthrownError(inspection(state.REJECTED, capture));
      curr.thrownError(inspection(state.THROWN, capture));
    } else {
      curr.then(
        inspection(state.FULFILLED, capture),
        inspection(state.REJECTED, capture)
      );
    }
  }

  return deferred;
};

function inspection(state, callback) {
  return function(val) {
    callback(new Inspection(state, val));
  };
}

function insert(array, index) {
  return function(element) {
    array[index] = element;
  };
}

function composeFns(a, b) {
  return function() {
    a(b.apply(undefined, arguments));
  };
}


/*
 * ### holdup.firstValue
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled as soon as the first of the
 * given promises fulfills, and will reject if none of the promises fulfill.
 *
 * The returned promise will call its `then` callback with the first
 * fulfilled value, and will call its `then` errback with the array of all
 * rejected errors in the order that their respective promises were passed in.
 */

exports.firstValue = exports.race = function() {
  var promises = extract(arguments);
  return exports.invert(exports.none(promises));
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
  var promises = extract(arguments);
  return exports.invert(exports.all(promises));
};


/*
 * ### holdup.lastValue
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled once all of the promises have
 * left their pending state, and at least one has fulfilled. It will reject
 * if all given promises reject.
 *
 * The returned promise will call its `then` callback with the value of the last
 * fulfilled promise, and will call its `then` errback with the array of all
 * rejection reasons in the order that the respective promises were passed in.
 */

exports.lastValue = function() {
  var lastValue, i, l, settled,
      called = false,
      promises = extract(arguments);

  function updateLastValue(val) {
    called = true;
    lastValue = val;
  }
  for(var i = 0, l = promises.length; i < l; i++) {
    promises[i].then(updateLastValue);
  }

  settled = exports.settled(promises);
  return exports.make(function(fulfill, reject) {
    settled.then(function(inspections) {
      var reasons, i, l;
      if(!called) {
        reasons = [];
        for(i = 0, l = inspections.length; i < l; i++) {
          reasons.push(inspections[i].error());
        }
        reject(reasons);
        return;
      }
      fulfill(lastValue);
    });
  });
};


/*
 * ### holdup.lastError
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled once all of the promises have
 * left their pending state, and at least one has rejected. It will reject
 * if all given promises fulfill.
 *
 * The returned promise will call its `then` callback with the rejection reason
 * of the last rejected promise, and will call its `then` errback with the array
 * of all fulfilled promise values in the order that their respective promises
 * were passed in.
 */

exports.lastError = function() {
  var last, i, l, settled,
      called = false,
      promises = extract(arguments);

  function updateLast(val) {
    called = true;
    last = val;
  }
  for(var i = 0, l = promises.length; i < l; i++) {
    promises[i].then(null, updateLast);
  }

  settled = exports.settled(promises);
  return exports.make(function(fulfill, reject) {
    settled.then(function(inspections) {
      var values, i, l;
      if(!called) {
        values = [];
        for(i = 0, l = inspections.length; i < l; i++) {
          values.push(inspections[i].value());
        }
        reject(values);
        return;
      }
      fulfill(last);
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


/*
 * ### holdup.spread
 *
 * Given a promise and a callback, calls the callback by applying the fulfilled
 * value of the promise to the callback.
 *
 * For example:
 *
 *     var a = holdup.fulfill(10),
 *         b = holdup.fulfill(11),
 *         c = holdup.all(a, b);
 *
 *     holdup.spread(c, function(aValue, bValue) {
 *       // aValue is 10
 *       // bValue is 11
 *     });
 */

exports.spreadValues = exports.spread = function(promise, callback) {
  promise.then(function(arrish) { callback.apply(undefined, arrish); });
};


/*
 * ### holdup.spreadErrors
 *
 * Given a promise and a callback, calls the callback by applying the rejected
 * error of the promise to the callback.
 *
 * For example:
 *
 *     var a = holdup.reject(['nope', 'definitely not']),
 *
 *     holdup.spreadErrors(a, function(firstError, secondError) {
 *       // firstError is 'nope'
 *       // secondError is 'definitely not'
 *     });
 */

exports.spreadErrors = function(promise, callback) {
  promise.then(undefined, function(arrish) {
    callback.apply(undefined, arrish);
  });
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

function composeUnwrapped(promises, decF, decR, transform) {
  var curr, index, length, err,
      collection = new Array(promises.length),
      promise = new Deferred,
      sem = new Semaphore(
        promises.length,
        function() { promise.fulfill(collection); },
        bind(promise.reject, promise)
      );
  err = function(e) {
    if(transform) sem.error(transform(e));
    else sem.error(e);
  };

  for(index = 0, length = promises.length; index < length; index++) {
    curr = promises[index];
    curr.then(
      decF ? insertUnwrapped(collection, index, sem, transform) : err,
      decR ? insertUnwrapped(collection, index, sem, transform) : err
    );
  }

  return promise;
}

function insertUnwrapped(collection, index, semaphore, transform) {
  return function(el) {
    collection[index] = transform ? transform(el) : el;
    semaphore.decrement();
  };
}

function blankUnwrapped(semaphore) {
  return function() {
    semaphore.decrement();
  };
}

function collect(promises, inverse) {
  var curr, index, length,
      collection = new Array(promises.length),
      promise = new Deferred,
      sem = new Semaphore(
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

},{"../deferred/deferred":2,"../deferred/flyweight":4,"../deferred/inspection":5,"../deferred/state":7,"./semaphore":9}],9:[function(_dereq_,module,exports){

function Semaphore(size, callback, errback) {
  this.size = size;
  this.callback = callback;
  this.errback = errback;
  this.errored = false;

  if(size === 0) callback();
}

Semaphore.prototype.decrement = function() {
  if(this.errored) return;
  this.size--;
  if(this.size === 0) this.callback();
};

Semaphore.prototype.error = function() {
  if(this.errored) return;
  this.errored = true;
  this.errback.apply(undefined, arguments);
};

module.exports = Semaphore;

},{}],10:[function(_dereq_,module,exports){
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