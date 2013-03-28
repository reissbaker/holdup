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
   * Exported interface.
   * -------------------
   */

  root.compose = function() {
    var index, curr,
        args = flatten(Array.prototype.slice.call(arguments, 0)),
        composed = new Promise();
    composed.fulfill([]);
    for(index = 0; curr = args[index]; index++) {
      composed = composeHelper(composed, curr);
    }
    return composed;
  };

  root.wait = function() {
    var args = flatten(Array.prototype.slice.call(arguments, 0)),
        waiting = new Promise(),
        composed = root.compose(args);

    composed.then(function(data) {
      waiting.fulfill.apply(waiting, data);
    }, function(err) {
      waiting.reject(err);
    });

    return waiting;
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
    setTimeout(function() {
      promise.fulfill();
    }, time);
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

  function flatten(arr) {
    var index, curr,
        flattened = [];

    for(index = 0; curr = arr[index]; index++) {
      if(curr instanceof Array) flattened = flattened.concat(flatten(curr));
      else flattened.push(curr);
    }

    return flattened;
  }
}();
