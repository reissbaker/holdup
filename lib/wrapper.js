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
 */

!function() {
  'use strict';

  /*
   * Setup.
   * ------
   */

  var root, Promise;
  if(typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') {
    root = module.exports;
    Promise = require('./promise').Promise;
  } else {
    root = window.promise;
    Promise = root.Promise;
  }


  /*
   * Exported Interface.
   * -------------------
   */

  root.all = function() {
    var composed = compose(extract(arguments), true, false),
        facade = new Promise;

    composed.promise.then(
      function() { facade.fulfill(composed.fulfilled); },
      function() { facade.reject(composed.rejected[0]); }
    );

    return facade;
  };

  root.none = function() {
    var composed = compose(extract(arguments), false, true),
        facade = new Promise;

    composed.promise.then(
      function() { facade.fulfill(composed.rejected); },
      function() { facade.reject(composed.fulfilled[0]); }
    );

    return facade;
  };

  root.any = function() {
    var composed = compose(extract(arguments), true, true),
        facade = new Promise;

    composed.promise.then(function() {
      facade.fulfill(composed.fulfilled, composed.rejected);
    });

    return facade;
  };


  root.firstFulfilled = function() {
    var promise = root.none(extract(arguments)),
        facade = new Promise;

    promise.then(bind(facade, facade.reject), bind(facade, facade.fulfill));

    return facade;
  };

  root.firstRejected = function() {
    var promise = root.all(extract(arguments)),
        facade = new Promise;

    promise.then(bind(facade, facade.reject), bind(facade, facade.fulfill));

    return facade;
  };

  // loop across all
  // after each fires, set yourself to last and decrement semaphore
  // when semaphore fires, fulfill the returned promise with the last promise
  // OR just use the any method, since it returns the array in order of
  // fulfillment and rejection
  root.lastFulfilled = function() {
  };

  // same as above, but for rejection
  root.lastRejected = function() {
  };


  root.wrap = function (scope, fn) {
    var args = Array.prototype.slice.call(arguments, 2),
        promise = new Promise();

    args.push(function(err, data) {
      if(err) promise.reject(err);
      else promise.fulfill(data);
    });
    fn.apply(scope, args);

    return promise;
  };


  root.timeout = function(time) {
    var promise = new Promise();
    setTimeout(function() { promise.fulfill(); }, time);
    return promise;
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
        promise = new Promise,
        sem = semaphore(
          promises.length,
          bind(promise, promise.fulfill),
          bind(promise, promise.reject)
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

  function bind(scope, fn) {
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

  function argArray(args) {
    return Array.prototype.slice.call(args, 0, args.length);
  }
}();
