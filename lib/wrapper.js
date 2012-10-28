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
    composed.fulfill();
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
      waiting.fail(err);
    });

    return waiting;
  };


  root.make = function (scope, fn) {
    var args = Array.prototype.slice.call(arguments, 2),
        promise = new Promise();

    args.push(function(err, data) {
      if(err) promise.fail(err);
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

  function composeHelper(a, b) {
    var promise = new Promise(),
        data = [],
        numFulfilled = 0;
    function callback(d) {
      numFulfilled++;
      data.push(d);
      if(numFulfilled === 2) promise.fulfill.call(promise, data);
    }
    function errback(err) {
      promise.fail(err);
    }

    a.then(callback, errback);
    b.then(callback, errback);

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
