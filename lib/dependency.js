/*
 * Note: promises probably shouldn't forward data. It seems useful at first,
 * but it isn't. Instead have a `resolve` function that takes a hash of keys
 * to promises, and fires its `then` callback with a hash of keys to values.
 *
 * No: fuck that. Make all of the existing functions take either a map or a
 * series of nested arrays. If map -> call `then` with map. If array -> call
 * `then` with nothing.
 *
 * Also: map can be first arg, but there can be other anonymous args as well.
 *
 * That means can't use arg lists, though: hav to use arrays.
 *
 * Alright, fuck that. Just have `resolveData` and `resolveErrors`, then. Arg
 * lists are awesome and maps are stupid.
 *
 * NOTE: `make` and `wrap` should take optional arrays of dependencies that
 * prevent the given function from firing until some future point.
 *
 * Probably get rid of arg lists... Just use arrays. Annoying, but more
 * consistent.
 *
 * NO! You don't need to do that. If you use the promise resolution step in
 * Deferreds/A+, your promises can forward returned promises -- allowing
 * chaining without this complex bullshit.
 *
 * Also `wrap` should be able to be called without a scope, brah.
 */

!function() {
  'use strict';


  /*
   * Setup.
   * ------
   */

  var root, Deferred;
  if(typeof module != 'undefined' && module.exports && typeof require != 'undefined') {
    root = module.exports;
    Deferred = require('./promise').Deferred;
  } else {
    root = window.promise;
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
   * ### holdup.any ###
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

  root.any = function() {
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

  root.firstFulfilled = function() {
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

  root.firstRejected = function() {
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

  root.lastFulfilled = function() {
    var promise = root.any(extract(arguments));

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

  root.lastRejected = function() {
    var promise = root.any(extract(arguments));

    return root.make(function(fulfill, reject) {
      promise.then(function(fulfilled, rejected) {
        if(rejected.length === 0) reject(fulfilled);
        else fulfill(rejected[rejected.length - 1]);
      });
    });
  };


  /*
   * ### holdup.wrap ###
   *
   * Given an optional scope, a Node-style async function, and optional
   * arguments, returns a promise that fulfills if the given function
   * completes successfully and rejects if it doesn't.
   *
   * The returned promise will call its `then` callback with anything passed
   * as the `data` parameter to the async function (if anything is in fact
   * passed), and will call its `then` errback with anything passed as the
   * `err` param to the async function.
   */

  root.wrap = function (scope, fn) {
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


  function compose(promises, decF, decR, collectF, collectR) {
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
    var index, curr,
        promise = new Deferred,
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
    return {
      init: function() {
        if(count === 0) callback();
      },
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
