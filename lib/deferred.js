!function() {
  'use strict';


  /*
   * Setup
   * -----
   */


  var error = require('./error');

  var logError = function() {};
  if(typeof console !== 'undefined' && typeof console.log === 'function') {
    logError = function() { console.log.apply(console, arguments); };
  }



  /*
   * Constants
   * ---------
   */


  // Deferred state constants.
  var REJECTED = 0,
      FULFILLED = 1,
      PENDING = 2,
      THROWN = 3;


  /*
   * Deferred Flyweight
   * ---------------------------------------------------------------------------
   */

  function Flyweight(deferred) {
    this.then = bind(deferred.then, deferred);
    this.error = bind(deferred.error, deferred);
    this.thrown = bind(deferred.thrown, deferred);
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

    this._state = PENDING;
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

  Deferred.prototype.fulfill = function(value) {
    if(!isPending(this)) return;
    setState(this, FULFILLED, value);
    scheduleBufferExecution(this);
  };

  Deferred.prototype.reject = function(reason) {
    if(!isPending(this)) return;
    if(this._log) logError(reason);
    scheduleBufferExecution(this);
    setState(this, REJECTED, wrappedReason(reason, false));
  };

  Deferred.prototype.throwError = function(e) {
    if(!isPending(this)) return;
    if(this._log) logError(e);
    scheduleBufferExecution(this);
    setState(this, THROWN, wrappedReason(e, true));
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
    return scope._state === PENDING;
  }

  function isFulfilled(scope) {
    return scope._state === FULFILLED;
  }

  function isRejected(scope) {
    return scope._state === REJECTED;
  }

  function isThrown(scope) {
    return scope._state === THROWN;
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
      adoptState(child, val, FULFILLED, callback, false);
    });

    deferred._rejectedBuffer.push(function(val) {
      adoptState(child, val, REJECTED, errback, false);
    });

    deferred._thrownBuffer.push(function(val) {
      adoptState(child, val, THROWN, errback, false);
    });

    deferred._thrownBuffer.push(function(val) {
      adoptState(child, val, THROWN, thrownBack, true);
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

  function stateFunction(deferred, state) {
    if(state === FULFILLED) return deferred.fulfill;
    if(state === THROWN) return deferred.throwError;
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
    shortCircuit(deferred, x);

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

}();
