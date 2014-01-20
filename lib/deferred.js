!function() {
  'use strict';


  /*
   * Setup
   * -----
   */


  var root;
  if(typeof module != 'undefined' && module.exports && typeof require != 'undefined') {
    root = module.exports;
  } else {
    root = window.holdup;
  }

  var logError = function() {};
  if(typeof console !== 'undefined' && typeof console.log === 'function') {
    logError = function() { console.log.apply(console, arguments); };
  }



  /*
   * Constants
   * ---------
   */


  // Deferred state constants.
  var REJECTED = -1,
      FULFILLED = 1,
      PENDING = 0;



  /*
   * Deferred Class
   * -------------
   */


  function Deferred() {
    this._fulfilledBuffer = [];
    this._rejectedBuffer = [];
    this._log = false;

    this._state = PENDING;

    this._value = null;

    this._scheduled = false;
  }



  /*
   * Deferred Public Methods
   * ----------------------
   */


  Deferred.prototype.then = function(callback, errback) {
    var deferred = new Deferred;

    buffer(this, deferred, callback, errback);
    if(!isPending(this)) scheduleBufferExecution(this);

    return deferred;
  };

  Deferred.prototype.fulfill = function(value) {
    if(!isPending(this)) return;
    setState(this, FULFILLED, value);
    scheduleBufferExecution(this);
  };

  Deferred.prototype.reject = function(reason) {
    if(!isPending(this)) return;
    if(this._log) logError(reason);
    setState(this, REJECTED, reason);
    scheduleBufferExecution(this);
  };

  Deferred.prototype.promise = function() {
    return { then: bind(this.then, this) };
  };

  function bind(method, scope) {
    return function() { return method.apply(scope, arguments); };
  }



  /*
   * Deferred Accessors
   * -----------------
   */


  Deferred.prototype.fulfilled = function() { return isFulfilled(this); };
  Deferred.prototype.rejected = function() { return isRejected(this); };
  Deferred.prototype.pending = function() { return isPending(this); };



  /*
   * Deferred Private Methods
   * -----------------------
   */


  /*
   * ### Getters ###
   */


  function isPending(scope) {
    return scope._state === PENDING;
  }

  function isFulfilled(scope) {
    return scope._state === FULFILLED;
  }

  function isRejected(scope) {
    return scope._state === REJECTED;
  }



  /*
   * ### Setters ###
   */


  /*
   * Adds a callback and an errback to the Deferred's buffer of functions to
   * call on `then` resolution.
   */

  function buffer(deferred, child, callback, errback) {
    deferred._fulfilledBuffer.push(function(val) {
      adoptState(child, val, FULFILLED, callback);
    });

    deferred._rejectedBuffer.push(function(val) {
      adoptState(child, val, REJECTED, errback);
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
    later(function() {
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
    return deferred._rejectedBuffer;
  }

  /*
   * Given a deferred, clears its callback and errback buffers.
   */
  function clearStateBuffers(deferred) {
    deferred._fulfilledBuffer = [];
    deferred._rejectedBuffer = [];
  }



  /*
   * ### Deferred Helpers ###
   */


  /*
   * Given a deferred child (returned from a `then`), attempts to make the child
   * adopt the correct state.
   */
  function adoptState(child, val, state, callback) {
    var childFn = state === FULFILLED ? child.fulfill : child.reject;

    if(typeof callback === 'function') {
      adoptFunctionState(child, callback, val);
    } else {
      childFn.call(child, val);
    }
  }

  function adoptFunctionState(deferred, callback, val) {
    var x;

    try {
      x = callback(val);
    } catch(e) {
      deferred.reject(e);
      return;
    }

    resolve(deferred, x);
  }

  function resolve(deferred, x) {
    var resolveCalled, rejectCalled, called,
        then = null;

    // 1. If promise and x refer to the same object, reject promise with a
    // TypeError as the reason.
    if(x === deferred) {
      deferred.reject(new TypeError('Promise cannot return itself.'));
      return;
    }

    // 2. If x is a promise, adopt its state.
    // 3. Otherwise, if x is an object or function,
    if(typeof x === 'function' || typeof x === 'object') {
      // i. Let then be x.then.
      try {
        then = thenFn(x);
      } catch(e) {
        // ii. If retrieving the property x.then results in a thrown exception
        // e, reject promise with e as the reason.
        deferred.reject(e);
        return;
      }

      // iii. If then is a function, call it with x as this, first argument
      // resolvePromise, and second argument rejectPromise, where:
      if(typeof then === 'function') {
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


        try {
          then.call(x, resolvePromise, rejectPromise);
        } catch(e) {
          // d. If calling then throws an exception e,
          //   a. If resolvePromise or rejectPromise have been called, ignore
          //   it.
          if(called) return;
          // b. Otherwise, reject promise with e as the reason.
          deferred.reject(e);
        }
      } else {
        deferred.fulfill(x);
      }
      return;
    }

    // 4. If x is not an object or function, fulfill promise with x.
    deferred.fulfill(x);
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

  function later(callback) {
    var next = setTimeout;

    if(typeof setImmediate != 'undefined') next = setImmediate;
    if(typeof process != 'undefined' && process.nextTick) {
      next = process.nextTick;
    }

    next(callback, 0);
  }



  /*
   * Packaging
   * ---------
   */


  root.Deferred = Deferred;

}();
