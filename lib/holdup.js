'use strict';

var Deferred = require('./deferred').Deferred;


/*
 * Creating Promises
 * ---------------------------------------------------------------------------
 */


/*
 * ### holdup.make
 *
 * Given a callback of form `function(fulfill, reject) {}`, returns a promise
 * that will be fulfilled when the callback calls `fulfill` or rejected
 * when the promise calls `reject`.
 *
 * The returned promise will call its `then` callback with whatever is passed
 * to the `fulfill` callback, and will call its `then` errback with whatever
 * is passed to the `reject` errback.
 */

exports.make = function(callback) {
  var deferred = new Deferred;
  try {
    callback(
      bind(deferred.fulfill, deferred),
      bind(deferred.reject, deferred)
    );
  } catch(e) {
    deferred.throwError(e);
  }
  return deferred.promise();
};


/*
 * ### holdup.fulfill
 *
 * Given a value, returns a promise that will fulfill to the value.
 *
 * Essentially a degenerate, but convenient form of `holdup.make` for
 * creating promises that you know will fulfill to a specific value.
 */

exports.fulfill = function(val) {
  return exports.make(function(fulfill) { fulfill(val); });
};


/*
 * ### holdup.fcall
 *
 * Given a function that returns a value, returns a promise that will fulfill
 * to the result of the given function.
 *
 * Essentially a degenerate, but convenient form of `holdup.make` for
 * creating promises that you know will fulfill to a specific value.
 */

exports.fcall = function(fn) {
  return exports.make(function(fulfill) { fulfill(fn()); });
};


/*
 * ### holdup.reject
 *
 * Given a reason, returns a promise that will reject with the reason.
 *
 * Essentially a degenerate but convenient form of `holdup.make` for creating
 * promises that you know will reject to a specific value.
 */

exports.reject = function(reason) {
  return exports.make(function(fulfill, reject) { reject(reason); });
};


/*
 * ### holdup.ferr
 *
 * Given a function that returns a value, returns a promise that will reject
 * with the result of the given function passed as the rejection reason.
 *
 * Essentially a degenerate but convenient form of `holdup.make` for creating
 * promises that you know will reject to a specific value.
 */

exports.ferr = function(fn) {
  return exports.make(function(fulfill, reject) { reject(fn()); });
};



/*
 * Manipulating Promises
 * ---------------------------------------------------------------------------
 */


/*
 * ### holdup.all
 *
 * Takes an arg list, array, array of arrays, arg lists of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled if all the promises fulfill, and
 * will reject as soon as any of the promises reject.
 *
 * It will call its `then` callback with the array of all fulfilled values,
 * in the order that their respective promises were passed in. It will call its
 * `then` errback with the first promise to reject.
 */

exports.all = function() {
  var promises = extract(arguments),
      composed = compose(promises, true, false);
  return exports.make(function(fulfill, reject) {
    composed.promise.then(
      function() {
        collect(promises, false).then(function(data) { fulfill(data) });
      },
      function() { composed.rejected[0].error(function(e) { reject(e); }); }
    );
  });
};


/*
 * ### holdup.none
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

exports.noPromisesOrdered = function() {
  var composed = compose(extract(arguments), false, true);

  return exports.make(function(fulfill, reject) {
    composed.promise.then(
      function() { fulfill(composed.rejected); },
      function() { reject(composed.fulfilled[0]); }
    );
  });
};

exports.none = function() {
  var promises = extract(arguments);
  return exports.noPromisesOrdered(promises).then(function() {
    return collect(promises, true);
  }, function(fulfilled) {
    return fulfilled.then(function(data) { return exports.reject(data); });
  });
};


/*
 * ### holdup.resolved
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled once all of the given promises
 * are no longer in a pending state; i.e., once they've each been rejected
 * or fulfilled. The promises don't have to end in the same state: they only
 * have to leave the pending state.
 *
 * The returned promise will call its `then` callback with a hash containing
 * two keys: `fulfilled` and `rejected`. The `fulfilled` key has an array of
 * all fulfilled promises in the order that they fulfilled, and the `rejected`
 * key has an array of all rejected promises in the order that they rejected.
 * If no promises fulfilled, the `fulfilled` key will point to an empty array;
 * if no promises rejected, the `rejected` key will similarly point to an
 * empty list.
 */

exports.resolvedPromisesOrdered = function() {
  var composed = compose(extract(arguments), true, true);

  return exports.make(function(fulfill, reject) {
    composed.promise.then(function() {
      fulfill({
        fulfilled: composed.fulfilled,
        rejected: composed.rejected
      });
    });
  });
};

exports.resolved = exports.settled = exports.allSettled = function() {
  var promises = extract(arguments);
  return exports.resolvedPromisesOrdered(promises).then(function() {
    var inspections = [];
    for(var i = 0, l = promises.length; i < l; i++) {
      inspections.push(promises[i].inspect());
    }
    return inspections;
  });
};


/*
 * ### holdup.firstFulfilled
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

exports.firstFulfilled = exports.ff = function() {
  var promise = exports.noPromisesOrdered(extract(arguments));

  return exports.make(function(fulfill, reject) {
    promise.then(reject, fulfill);
  });
};

exports.firstValue = exports.race = function() {
  var promises = extract(arguments);

  return exports.ff(promises).then(function(first) {
    return first.inspect().value();
  }, function() {
    return collect(promises, true).then(function(errors) {
      return exports.reject(errors);
    });
  });
}


/*
 * ### holdup.firstRejected
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

exports.firstRejected = exports.fr = function() {
  var composed = compose(extract(arguments), true, false);

  return exports.make(function(fulfill, reject) {
    composed.promise.then(
      function() { reject(composed.fulfilled); },
      function() { fulfill(composed.rejected[0]); }
    );
  });
};

exports.firstError = function() {
  var promises = extract(arguments);
  return exports.fr(promises).then(function(first) {
    return first.inspect().error();
  }, function() {
    return collect(promises, false).then(function(data) {
      return exports.reject(data);
    });
  });
};


/*
 * ### holdup.lastFulfilled
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

exports.lastFulfilled = exports.lf = function() {
  var promise = exports.resolvedPromisesOrdered(extract(arguments));

  return exports.make(function(fulfill, reject) {
    promise.then(function(promises) {
      var fulfilled = promises.fulfilled,
          rejected = promises.rejected;
      if(fulfilled.length === 0) reject(rejected);
      else fulfill(fulfilled[fulfilled.length - 1]);
    });
  });
};

exports.lastValue = function() {
  var promises = extract(arguments);
  return exports.lastFulfilled(promises).then(function(last) {
    return last.inspect().value();
  }, function() {
    return collect(promises, false).then(function(data) {
      return exports.reject(data);
    });
  });
};


/*
 * ### holdup.lastRejected
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

exports.lastRejected = exports.lr = function() {
  var promise = exports.resolvedPromisesOrdered(extract(arguments));

  return exports.make(function(fulfill, reject) {
    promise.then(function(promises) {
      var fulfilled = promises.fulfilled,
          rejected = promises.rejected;
      if(rejected.length === 0) reject(fulfilled);
      else fulfill(rejected[rejected.length - 1]);
    });
  });
};

exports.lastError = function() {
  var promises = extract(arguments);
  return exports.lastRejected(promises).then(function(last) {
    return last.inspect().error();
  }, function() {
    return collect(promises, true).then(function(data) {
      return exports.reject(data);
    });
  });
};


/*
 * ### holdup.invert
 *
 * Given a promise, returns a promise that will reject when the given promise
 * fulfills and will fulfill when the given promise rejects.
 *
 * If data is passed to the callback of the given promise, it will be passed
 * as the error to the returned promise's errback. If an error is passed to
 * the errback of the given promise, it will be passed as the data to the
 * returned promises callback.
 */

exports.invert = function(promise) {
  return exports.make(function(fulfill, reject) {
    promise.then(reject, fulfill);
  });
};



/*
 * Working With Values
 * ---------------------------------------------------------------------------
 */

exports.spreadValues = exports.spread = function(promise, callback) {
  promise.then(function(arrish) { callback.apply(undefined, arrish); });
};

exports.spreadErrors = function(promise, callback) {
  promise.then(undefined, function(arrish) {
    callback.apply(undefined, arrish);
  });
};

/*
 * ### holdup.data
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

exports.data = function() {
  var args = argArray(arguments),
      promises = extract(args.slice(0, args.length - 1)),
      composed = collect(promises, false),
      callback = args[args.length - 1];
  composed.then(function(data) { callback.apply(null, data); });
  return composed;
};


/*
 * ### holdup.errors
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

exports.errors = function() {
  var args = argArray(arguments),
      promises = extract(args.slice(0, args.length - 1)),
      composed = collect(promises, true),
      callback = args[args.length - 1];
  composed.then(function(data) { callback.apply(null, data); });
  return composed;
};



/*
 * Timing Functions
 * ---------------------------------------------------------------------------
 */


/*
 * ### holdup.wait
 *
 * Given a time in milliseconds, returns a promise that calls its `then`
 * callback after that amount of time. The returned promise will never call
 * any errback functions given to it.
 *
 * The returned promise will pass along the given timeout interval to the
 * `then` callback as its first parameter.
 */

exports.wait = function(time) {
  return exports.make(function(fulfill) {
    setTimeout(function() { fulfill(time); }, time);
  });
};


/*
 * ### holdup.delay
 *
 * Given a promise and a time in milliseconds, returns a promise that fulfills
 * when the given promise fulfills or rejects when the first one rejects, but
 * waits the given time before fulfilling or rejecting.
 */

exports.delay = function(promise, time) {
  return exports.make(function(fulfill, reject) {
    promise.then(
      function() {
        var args = argArray(arguments, 0);
        setTimeout(function() { fulfill.apply(null, args); }, time);
      },
      function() {
        var args = argArray(arguments, 0);
        setTimeout(function() { reject.apply(null, args); }, time);
      }
    );
  });
};


/*
 * ### holdup.timeout
 *
 * Given a promise and a time in milliseconds, returns a promise that fulfills
 * if the given promise fulfills before the time is up and rejects otherwise.
 */

exports.timeout = function(promise, time) {
  return exports.make(function(fulfill, reject) {
    setTimeout(function() {
      reject('Error: ' + time + 'ms timeout exceeded.');
    }, time);
    promise.then(fulfill, reject);
  });
};



/*
 * Interfacing with Node-style Async Functions
 * ---------------------------------------------------------------------------
 */

/*
 * ### holdup.napply
 *
 * Given a scope, a Node-style async function, and an array of arguments,
 * returns a promise that fulfills if the given function completes
 * successfully and rejects if it doesn't.
 *
 * The returned promise will call its `then` callback with anything passed as
 * the `data` parameter to the async function (if anything is in fact passed),
 * and will call its `then` errback with anything passed as the `err` param to
 * the async function.
 */

exports.napply = function(scope, fn, args) {
  var argCopy = args.slice(0, args.length);
  return exports.make(function(fulfill, reject) {
    argCopy.push(function(err, data) {
      if(err) reject(err);
      else fulfill(data);
    });
    fn.apply(scope, argCopy);
  });
};


/*
 * ### holdup.nfapply
 *
 * A convenient, scopeless version of `napply`, for times when it's acceptable
 * that the scope of `napply` be `null`.
 */

exports.nfapply = function(fn, args) {
  return exports.napply(null, fn, args);
};


/*
 * ### holdup.ncall
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

exports.ncall = exports.wrapFor = function(scope, fn) {
  var args = argArray(arguments, 2);
  return exports.napply(scope, fn, args);
};


/*
 * ### holdup.nfcall
 *
 * A convenient, scopeless version of `ncall`, for times when it's acceptable
 * that the scope of `ncall` be `null`.
 */

exports.nfcall = exports.wrap = function(fn) {
  var args = argArray(arguments, 1);
  return exports.napply(null, fn, args);
};


/*
 * ### holdup.npost
 *
 * Given an object, a method name corresponding to a Node-style async
 * function, and an array of arguments, returns a promise that fulfills if the
 * given method completes successfully and rejects if it doesn't.
 *
 * The returned promise will call its `then` callback with anything passed as
 * the `data` parameter to the async function (if anything is in fact passed),
 * and will call its `then` errback with anything passed as the `err` param to
 * the async function.
 */

exports.npost = function(obj, methodName, args) {
  return exports.napply(obj, obj[methodName], args);
};


/*
 * ### holdup.ninvoke
 *
 * Given an object, a method name corresponding to a Node-style async
 * function, and an optional argument list of parameters, returns a promise
 * that fulfills if the given method completes successfully and rejects if it
 * doesn't.
 *
 * The returned promise will call its `then` callback with anything passed as
 * the `data` parameter to the async function (if anything is in fact passed),
 * and will call its `then` errback with anything passed as the `err` param to
 * the async function.
 */

exports.ninvoke = exports.nsend = function(obj, methodName) {
  var args = argArray(arguments, 2);
  return exports.napply(obj, obj[methodName], args);
};


/*
 * ### holdup.nbind
 *
 * Given a Node-style async function, a scope, and an optional argument list
 * of parameters, returns a promise-returning function bound to the scope and
 * the given parameters.
 *
 * The returned promise will call its `then` callback with anything passed as
 * the `data` parameter to the async function (if anything is in fact passed),
 * and will call its `then` errback with anything passed as the `err` param to
 * the async function.
 *
 * For example:
 *
 *     var readProust = holdup.bind(fs.readFile, fs, 'proust.txt', 'utf-8');
 *     readProust().then(function(text) {
 *       // do things with text
 *     });
 */

exports.nbind = function(fn, scope) {
  var boundArgs = argArray(arguments, 2);
  return function() {
    var args = argArray(arguments);
    return exports.napply(scope, fn, boundArgs.concat(args));
  };
};


/*
 * ### holdup.nfbind
 *
 * A convenient, scopeless version of nbind, for times when it's acceptable
 * that the scope of `nbind` be `null`.
 */

exports.nfbind = exports.denodeify = function(fn) {
  var args = ([fn, null]).concat(argArray(arguments, 1));
  return exports.nbind.apply(exports, args);
};


/*
 * ### holdup.nodeify
 *
 * Given a promise and a Node-style callback, calls the callback with the
 * correct `data` and `err` arguments when the promise fulfills or rejects.
 * Useful for creating dual promise/callback APIs, or for using promises
 * internally but exposing only a callback API.
 */

exports.nodeify = function(promise, callback) {
  promise.then(
    function(data) { callback(null, data); },
    function(err) { callback(err); }
  );
  return promise;
};



/*
 * Helper Functions
 * ---------------------------------------------------------------------------
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
