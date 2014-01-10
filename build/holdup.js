!function(window) {
  'use strict';

  var oldHoldup = window.holdup;

  window.holdup = {
    noConflict: function() {
      window.holdup = oldHoldup;
      return this;
    }
  };

}(window);
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
    var deferred = new Deferred();

    buffer(this, deferred, callback, errback);
    if(!isPending(this)) scheduleBufferExecution(this);

    return deferred.promise();
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


  function buffer(scope, deferred, callback, errback) {
    scope._fulfilledBuffer.push(function() {
      resolve(scope, deferred, FULFILLED, callback);
    });

    scope._rejectedBuffer.push(function() {
      resolve(scope, deferred, REJECTED, errback);
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
      null,
      scope._args
    );

    scope._fulfilledBuffer = [];
    scope._rejectedBuffer = [];
  }



  /*
   * ### Deferred Helpers ###
   */


  function resolve(scope, deferred, state, callback) {
    var args = scope._args,
        deferredFn = state === FULFILLED ? deferred.fulfill : deferred.reject;

    if(typeof callback == 'function') callbackResolve(deferred, callback, args);
    else deferredFn.apply(deferred, scope._args);
  }

  function callbackResolve(deferred, callback, args) {
    var arg;

    try {
      arg = callback.apply(null, args);
    } catch(e) {
      deferred.reject(e);
      if(deferred._log && typeof console !== 'undefined') console.log(e);
      return;
    }

    aplusResolve(deferred, arg);
  }

  function aplusResolve(deferred, x) {
    var thenable = false;

    try {
      thenable = isThenable(x);
    } catch(e) {
      deferred.reject(e);
      if(deferred._log && typeof console !== 'undefined') console.log(e);
      return;
    }

    if(thenable) {
      x.then(
        function() { deferred.fulfill.apply(deferred, arguments); },
        function() { deferred.reject.apply(deferred, arguments); }
      );
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

  function applyFunctions(fns, scope, args) {
    var index, curr;
    for(index = 0; curr = fns[index]; index++) {
      curr.apply(scope, args);
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
!function() {
  'use strict';


  /*
   * Setup.
   * ------
   */

  var root, Deferred;
  if(typeof module != 'undefined' && module.exports && typeof require != 'undefined') {
    root = module.exports;
    Deferred = require('./deferred').Deferred;
  } else {
    root = window.holdup;
    Deferred = root.Deferred;
  }



  /*
   * Exported Interface.
   * -------------------
   */


  /*
   * ### holdup.all ###
   *
   * Takes an arg list, array, array of arrays, arg lists of arrays... etc
   * containing promises.
   *
   * Returns a promise that will be fulfilled if all the promises fulfill, and
   * will reject as soon as any of the promises reject.
   *
   * It will call its `then` callback with the array of all fulfilled promises,
   * in the order that they fulfilled. It will call its `then` errback with the
   * first promise to reject.
   */

  root.all = function() {
    var composed = compose(extract(arguments), true, false);

    return root.make(function(fulfill, reject) {
      composed.promise.then(
        function() { fulfill(composed.fulfilled); },
        function() { reject(composed.rejected[0]); }
      );
    });
  };


  /*
   * ### holdup.none ###
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

  root.none = function() {
    var composed = compose(extract(arguments), false, true);

    return root.make(function(fulfill, reject) {
      composed.promise.then(
        function() { fulfill(composed.rejected); },
        function() { reject(composed.fulfilled[0]); }
      );
    });
  };


  /*
   * ### holdup.resolved ###
   *
   * Takes an arg list, array, array of arrays, arg list of arrays... etc
   * containing promises.
   *
   * Returns a promise that will be fulfilled once all of the given promises
   * are no longer in a pending state; i.e., once they've each been rejected
   * or fulfilled. The promises don't have to end in the same state: they only
   * have to leave the pending state.
   *
   * The returned promise will call its `then` callback with two arguments: the
   * first is an array of all fulfilled promises in the order that they
   * fulfilled, and the second is an array of all rejected promises in the
   * order that they rejected. If no promises fulfilled, the first argument
   * will be an empty array; if no promises rejected, the first argument will
   * similarly be an empty list.
   */

  root.resolved = function() {
    var composed = compose(extract(arguments), true, true);

    return root.make(function(fulfill, reject) {
      composed.promise.then(function() {
        fulfill(composed.fulfilled, composed.rejected);
      });
    });
  };


  /*
   * ### holdup.firstFulfilled ###
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

  root.firstFulfilled = root.ff = function() {
    var promise = root.none(extract(arguments));

    return root.make(function(fulfill, reject) {
      promise.then(reject, fulfill);
    });
  };


  /*
   * ### holdup.firstRejected ###
   *
   * Takes an arg list, array, array of arrays, arg list of arrays... etc
   * containing promises.
   *
   * Returns a promise that will be fulfilled as soon as the first of the
   * given promises rejects, and will reject if none of the promises reject.
   *
   * The returned promise will call its `then` callback with the first
   * rejected promise, and will call its `then` errback with the array of all
   * fulfilled promises in the order that they fulfilled.
   */

  root.firstRejected = root.fr = function() {
    var promise = root.all(extract(arguments));

    return root.make(function(fulfill, reject) {
      promise.then(reject, fulfill);
    });
  };


  /*
   * ### holdup.lastFulfilled ###
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

  root.lastFulfilled = root.lf = function() {
    var promise = root.resolved(extract(arguments));

    return root.make(function(fulfill, reject) {
      promise.then(function(fulfilled, rejected) {
        if(fulfilled.length === 0) reject(rejected);
        else fulfill(fulfilled[fulfilled.length - 1]);
      });
    });
  };


  /*
   * ### holdup.lastRejected ###
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

  root.lastRejected = root.lr = function() {
    var promise = root.resolved(extract(arguments));

    return root.make(function(fulfill, reject) {
      promise.then(function(fulfilled, rejected) {
        if(rejected.length === 0) reject(fulfilled);
        else fulfill(rejected[rejected.length - 1]);
      });
    });
  };


  /*
   * ### holdup.data ###
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

  root.data = function() {
    var args = argArray(arguments),
        promises = extract(args.slice(0, args.length - 1)),
        composed = collect(promises, false),
        callback = args[args.length - 1];
    composed.then(function(data) { callback.apply(null, data); });
    return composed;
  };


  /*
   * ### holdup.errors ###
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

  root.errors = function() {
    var args = argArray(arguments),
        promises = extract(args.slice(0, args.length - 1)),
        composed = collect(promises, true),
        callback = args[args.length - 1];
    composed.then(function(data) { callback.apply(null, data); });
    return composed;
  };


  /*
   * ### holdup.wrap ###
   *
   * Given a Node-style async function, and optional arguments, returns a
   * promise that fulfills if the given function completes successfully and
   * rejects if it doesn't.
   *
   * The returned promise will call its `then` callback with anything passed as
   * the `data` parameter to the async function (if anything is in fact passed),
   * and will call its `then` errback with anything passed as the `err` param to
   * the async function.
   */

  root.wrap = function(fn) {
    var args = argArray(arguments, 1);
    return root.wrapFor.apply(root, ([null, fn]).concat(args));
  };


  /*
   * ### holdup.wrapFor ###
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

  root.wrapFor = function(scope, fn) {
    var args = argArray(arguments, 2);
    return root.make(function(fulfill, reject) {
      args.push(function(err, data) {
        if(err) reject(err);
        else fulfill(data);
      });
      fn.apply(scope, args);
    });
  };


  /*
   * ### holdup.make ###
   *
   * Given a callback of form `function(fulfill, reject) {}`, returns a promise
   * that will be fulfilled when the callback calls `fulfill` or rejected
   * when the promise calls `reject`.
   *
   * The returned promise will call its `then` callback with whatever is passed
   * to the `fulfill` callback, and will call its `then` errback with whatever
   * is passed to the `reject` errback.
   */

  root.make = function(callback) {
    var deferred = new Deferred;
    callback(bind(deferred.fulfill, deferred), bind(deferred.reject, deferred));
    return deferred.promise();
  };


  /*
   * ### holdup.invert ###
   *
   * Given a promise, returns a promise that will reject when the given promise
   * fulfills and will fulfill when the given promise rejects.
   *
   * If data is passed to the callback of the given promise, it will be passed
   * as the error to the returned promise's errback. If an error is passed to
   * the errback of the given promise, it will be passed as the data to the
   * returned promises callback.
   */

  root.invert = function(promise) {
    return root.make(function(fulfill, reject) {
      promise.then(reject, fulfill);
    });
  };


  /*
   * ### holdup.timeout ###
   *
   * Given a time in milliseconds, returns a promise that calls its `then`
   * callback after that amount of time. The returned promise will never call
   * any errback functions given to it.
   *
   * The returned promise will pass along the given timeout interval to the
   * `then` callback as its first parameter.
   */

  root.timeout = function(time) {
    return root.make(function(fulfill) {
      setTimeout(function() { fulfill(time); }, time);
    });
  };



  /*
   * Helper functions.
   * -----------------
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
}();
