!function() {
  'use strict';


  /*
   * Setup
   * -----
   */


  var root;
  if(typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') {
    root = module.exports;
  } else {
    root = window.promise;
  }



  /*
   * State Constants
   * ---------------
   */


  var REJECTED = -1,
      FULFILLED = 1,
      PENDING = 0;



  /*
   * Promise Class
   * -------------
   */


  function Promise() {
    this._fulfilledBuffer = [];
    this._rejectedBuffer = [];

    this._state = PENDING;

    this._args = [];
  }



  /*
   * Promise Public Methods
   * ----------------------
   */


  Promise.prototype.then = function(callback, errback) {
    var promise = new Promise();
    
    if(isPending(this)) buffer(this, promise, callback, errback);
    else if(isFulfilled(this)) resolve(this, promise, FULFILLED, callback);
    else resolve(this, promise, REJECTED, errback);

    return promise;
  };

  Promise.prototype.fulfill = function() {
    if(!isPending(this)) return;
    setState(this, true, argArray(arguments));
  };

  Promise.prototype.reject = function() {
    if(!isPending(this)) return;
    setState(this, false, argArray(arguments));
  };



  /*
   * Promise Accessors
   * -----------------
   */


  Promise.prototype.fulfilled = function() { return isFulfilled(this); };
  Promise.prototype.rejected = function() { return isRejected(this); };
  Promise.prototype.pending = function() { return isPending(this); };



  /*
   * Promise Private Methods
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


  function setState(scope, fulfilled, args) {
    scope._state = fulfilled ? FULFILLED : REJECTED;

    scope._args = args;
    applyFunctions(
      fulfilled ? scope._fulfilledBuffer : scope._rejectedBuffer,
      null,
      args
    );

    scope._fulfilledBuffer = [];
    scope._rejectedBuffer = [];
  }



  /*
   * ### Promise Helpers ###
   */


  function resolve(scope, promise, state, callback) {
    var promiseFn = state === FULFILLED ? promise.fulfill : promise.reject,
        args = callback ? callback.apply(null, scope._args) : scope._args;

    promiseFn.apply(promise, args);
  }

  function buffer(scope, promise, fulfilled, rejected) {
    bufferCallbacks(scope, promise, fulfilled, rejected);
    bufferPromise(scope, promise);
  }

  function bufferCallbacks(scope, promise, fulfilled, rejected) {
    safePush(scope._fulfilledBuffer, fulfilled);
    safePush(scope._rejectedBuffer, rejected);
  }

  function bufferPromise(scope, promise) {
    scope._fulfilledBuffer.push(function() {
      resolve(scope, promise, FULFILLED);
    });

    scope._rejectedBuffer.push(function() {
      resolve(scope, promise, REJECTED);
    });
  }



  /*
   * Helper Functions
   * ----------------
   */


  /*
   * ### Generic Helper Functions ###
   */


  function safePush(array, elem) {
    if(elem) array.push(elem);
  }

  function applyFunctions(fns, scope, args) {
    var index, curr;
    for(index = 0; curr = fns[index]; index++) {
      curr.apply(scope, args);
    }
  }

  function argArray(args) {
    return Array.prototype.slice.call(args, 0, args.length);
  }



  /*
   * Packaging
   * ---------
   */


  root.Promise = Promise;

}();
