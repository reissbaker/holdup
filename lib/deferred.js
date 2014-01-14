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

    this._args = [];

    this._scheduled = false;
  }



  /*
   * Deferred Public Methods
   * ----------------------
   */


  Deferred.prototype.then = function(callback, errback) {
    var deferred = new Deferred(),
        promise = deferred.promise();

    buffer(this, deferred, promise, callback, errback);
    if(!isPending(this)) scheduleBufferExecution(this);

    return promise;
  };

  Deferred.prototype.fulfill = function() {
    if(!isPending(this)) return;
    setState(this, true, argArray(arguments));
  };

  Deferred.prototype.reject = function() {
    if(!isPending(this)) return;
    setState(this, false, argArray(arguments));
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


  function buffer(scope, deferred, promise, callback, errback) {
    scope._fulfilledBuffer.push(function() {
      resolve(scope, deferred, promise, FULFILLED, callback);
    });

    scope._rejectedBuffer.push(function() {
      resolve(scope, deferred, promise, REJECTED, errback);
    });
  }

  function setState(scope, fulfilled, args) {
    scope._state = fulfilled ? FULFILLED : REJECTED;
    scope._args = args;

    scheduleBufferExecution(scope);
  }

  function scheduleBufferExecution(scope) {
    if(!scope._scheduled) {
      scope._scheduled = true;
      later(function() {
        scope._scheduled = false;
        executeBuffer(scope);
      });
    }
  }

  function executeBuffer(scope) {
    applyFunctions(
      isFulfilled(scope) ? scope._fulfilledBuffer : scope._rejectedBuffer,
      scope._args
    );

    scope._fulfilledBuffer = [];
    scope._rejectedBuffer = [];
  }



  /*
   * ### Deferred Helpers ###
   */


  function resolve(scope, deferred, promise, state, callback) {
    var args = scope._args,
        deferredFn = state === FULFILLED ? deferred.fulfill : deferred.reject;

    if(typeof callback == 'function') {
      callbackResolve(deferred, promise, callback, args);
    } else {
      deferredFn.apply(deferred, scope._args);
    }
  }

  function callbackResolve(deferred, promise, callback, args) {
    var arg;

    try {
      arg = callback.apply(undefined, args);
    } catch(e) {
      deferred.reject(e);
      if(deferred._log && typeof console !== 'undefined') console.log(e);
      return;
    }

    aplusResolve(deferred, promise, arg);
  }

  function aplusResolve(deferred, promise, x) {
    var thenable = false;

    try {
      thenable = isThenable(x);
    } catch(e) {
      deferred.reject(e);
      if(deferred._log && typeof console !== 'undefined') console.log(e);
      return;
    }

    if(thenable) {
      if(x === promise) {
        deferred.reject(new TypeError('Promise cannot return itself.'));
      } else {
        x.then(
          function() { deferred.fulfill.apply(deferred, arguments); },
          function() { deferred.reject.apply(deferred, arguments); }
        );
      }
    } else {
      deferred.fulfill(x);
    }
  }



  /*
   * Helper Functions
   * ----------------
   */


  function isThenable(obj) {
    return obj && typeof obj.then == 'function';
  }

  function safePush(array, elem) {
    if(elem) array.push(elem);
  }

  function applyFunctions(fns, args) {
    var index, curr;
    for(index = 0; curr = fns[index]; index++) {
      curr.apply(undefined, args);
    }
  }

  function argArray(args) {
    return Array.prototype.slice.call(args, 0, args.length);
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
