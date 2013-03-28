/*
 * TODO: Make a `facade` function to encapsulate all this facade shit you're
 * doing. Extract each of the composition functions out into their own little
 * functions, then make facades around them.
 *
 * `facade` should take a promise and a callback, and return the output of the
 * callback. The callback should be of the form:
 *     
 *     function(promise, facade) {}
 * 
 * And it should modify the facade to do what it wants.
 *
 * Or... It should return a [ callback, errback ] tuple that gets passed to
 * the promise's `then` method. And it only recieves the facade, not the
 * actual promise.
 *
 * Or rather: `facade` takes three arguments:
 *   
 * * a promise
 * * a callback
 * * an errback
 *
 * The callback should *return* a callback, the errback should *return* an
 * errback, etc. Each takes a facade promise as its sole argument.
 *
 *
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
    var composed = composition(extract(arguments), true, false),
        facade = new Promise;

    composed.promise.then(
      function() { facade.fulfill(composed.fulfilled); },
      function() { facade.reject(composed.rejected[0]); }
    );

    return facade;
  };

  root.none = function() {
    var composed = composition(extract(arguments), false, true),
        facade = new Promise;

    composed.promise.then(
      function() { facade.fulfill(composed.rejected); },
      function() { facade.reject(composed.fulfilled[0]); }
    );

    return facade;
  };

  root.any = function() {
    var composed = composition(extract(arguments), true, true),
        facade = new Promise;

    composed.promise.then(function() {
      facade.fulfill(composed.passed, composed.rejected);
    });

    return facade;
  };


  root.firstFulfilled = function() {
    var promises = extract(arguments),
        promise = root.none(promises),
        facade = new Promise;

    promise.then(
      function() { facade.reject(promises); },
      bind(facade, facade.fulfill)
    );

    return facade;
  };

  root.firstRejected = function() {
    var promises = extract(arguments),
        promise = root.all(promises),
        facade = new Promise;

    promise.then(
      function() { facade.reject(promises); },
      bind(facade, facade.fulfill)
    );

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

  root.race = function() {
    var args = flatten(Array.prototype.slice.call(arguments, 0)),
        race = new Promise,
        count = args.length,
        errors = [];

    if(!count) race.fulfill();

    // TODO: Handle streams. Should not need to unstream -- first `data` event
    // wins the race.
    while(args.length) {
      args.pop().then(function() {
        count--;
        errors = [];
        race.fulfill.apply(race, arguments);
      }, function() {
        count--;
        errors = errors.concat(Array.prototype.slice.call(arguments, 0));
        if(count === 0) race.reject.apply(race, errors);
      });
    }

    return race;
  };

  
  root.make = function (scope, fn) {
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


  /*
   * ### composeHelper ###
   *
   * Takes two promises, the first of which should either be a previously-
   * composed promise, or a "seed" promise that gets fulfilled with an array.
   *
   * Returns the composition of those two promises.
   */

  function composeHelper(a, b) {
    var promise = new Promise(),
        data = [],
        numFulfilled = 0;

    function fulfilling(callback) {
      return function(result) {
        numFulfilled++;
        callback.call(null, result);
        if(numFulfilled === 2) promise.fulfill.call(promise, data);
      };
    };
    function errback(err) {
      promise.reject(err);
    }

    a.then(fulfilling(function(result) {
      data = result.concat(data);
    }), errback);
    b.then(fulfilling(function(result) {
      data.push(result);
    }), errback);

    return promise;
  }

  function composition(promises, decF, decR, collectF, collectR) {
    var fulfilled = [],
        rejected = [],
        collectF = function(promise) { fulfilled.push(promise); },
        collectR = function(promise) { rejected.push(promise); },
        fulfillBack = decF ? decrement(collectF) : errorOut(collectF),
        rejectBack = decR ? decrement(collectR) : errorOut(collectR);

    return {
      fulfilled: fulfilled,
      rejected: rejected,
      promise: composePromises(promises, fulfillBack, rejectBack)
    };
  }

  function composePromises(promises, callbackComposer, errbackComposer) {
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

  function decorate(scope, fn, advice) {
    return function() {
      if(advice && advice.before) advice.before();
      fn.apply(scope, arguments);
      if(advice && advice.after) advice.after();
    };
  }

  function bind(scope, fn) {
    return decorate(scope, fn);
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
