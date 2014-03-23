'use strict';

var Deferred = require('../deferred/deferred').Deferred,
    Flyweight = require('../deferred/flyweight'),
    Semaphore = require('./semaphore'),
    state = require('../deferred/state'),
    Inspection = require('../deferred/inspection');


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
  return composeUnwrapped(extract(arguments), true, false);
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

exports.none = function() {
  return composeUnwrapped(extract(arguments), false, true);
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
 * have to leave the pending state. The returned promise will never reject.
 *
 * The returned promise will call its `then` callback with an array of promise
 * Inspection instances, with each inspection in the order that its respective
 * promise was passed in.
 */

exports.resolved = exports.settled = exports.allSettled = function() {
  var insertion, curr, capture,
      promises = extract(arguments),
      deferred = new Deferred,
      inspections = new Array(promises.length),
      sem = new Semaphore(
        promises.length,
        function() { deferred.fulfill(inspections); }
      ),
      dec = bind(sem.decrement, sem);

  for(var i = 0, l = promises.length; i < l; i++) {
    insertion = insert(inspections, i);
    curr = promises[i];
    capture = composeFns(dec, insertion);

    if(curr instanceof Deferred || curr instanceof Flyweight) {
      curr.then(inspection(state.FULFILLED, capture));
      curr.unthrownError(inspection(state.REJECTED, capture));
      curr.thrownError(inspection(state.THROWN, capture));
    } else {
      curr.then(
        inspection(state.FULFILLED, capture),
        inspection(state.REJECTED, capture)
      );
    }
  }

  return deferred;
};

function inspection(state, callback) {
  return function(val) {
    callback(new Inspection(state, val));
  };
}

function insert(array, index) {
  return function(element) {
    array[index] = element;
  };
}

function composeFns(a, b) {
  return function() {
    a(b.apply(undefined, arguments));
  };
}


/*
 * ### holdup.firstValue
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled as soon as the first of the
 * given promises fulfills, and will reject if none of the promises fulfill.
 *
 * The returned promise will call its `then` callback with the first
 * fulfilled value, and will call its `then` errback with the array of all
 * rejected errors in the order that their respective promises were passed in.
 */

exports.firstValue = exports.race = function() {
  var promises = extract(arguments);
  return exports.invert(exports.none(promises));
};


/*
 * ### holdup.firstError
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled as soon as the first of the
 * given promises rejects, and will reject if none of the promises reject.
 *
 * The returned promise will call its `then` callback with the first rejection
 * reason, and will call its `then` errback with the array of all fulfilled
 * values in the order that their respective promises were passed in.
 */

exports.firstError = function() {
  var promises = extract(arguments);
  return exports.invert(exports.all(promises));
};


/*
 * ### holdup.lastValue
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled once all of the promises have
 * left their pending state, and at least one has fulfilled. It will reject
 * if all given promises reject.
 *
 * The returned promise will call its `then` callback with the value of the last
 * fulfilled promise, and will call its `then` errback with the array of all
 * rejection reasons in the order that the respective promises were passed in.
 */

exports.lastValue = function() {
  var lastValue, i, l, settled,
      called = false,
      promises = extract(arguments);

  function updateLastValue(val) {
    called = true;
    lastValue = val;
  }
  for(var i = 0, l = promises.length; i < l; i++) {
    promises[i].then(updateLastValue);
  }

  settled = exports.settled(promises);
  return exports.make(function(fulfill, reject) {
    settled.then(function(inspections) {
      var reasons, i, l;
      if(!called) {
        reasons = [];
        for(i = 0, l = inspections.length; i < l; i++) {
          reasons.push(inspections[i].error());
        }
        reject(reasons);
        return;
      }
      fulfill(lastValue);
    });
  });
};


/*
 * ### holdup.lastError
 *
 * Takes an arg list, array, array of arrays, arg list of arrays... etc
 * containing promises.
 *
 * Returns a promise that will be fulfilled once all of the promises have
 * left their pending state, and at least one has rejected. It will reject
 * if all given promises fulfill.
 *
 * The returned promise will call its `then` callback with the rejection reason
 * of the last rejected promise, and will call its `then` errback with the array
 * of all fulfilled promise values in the order that their respective promises
 * were passed in.
 */

exports.lastError = function() {
  var last, i, l, settled,
      called = false,
      promises = extract(arguments);

  function updateLast(val) {
    called = true;
    last = val;
  }
  for(var i = 0, l = promises.length; i < l; i++) {
    promises[i].then(null, updateLast);
  }

  settled = exports.settled(promises);
  return exports.make(function(fulfill, reject) {
    settled.then(function(inspections) {
      var values, i, l;
      if(!called) {
        values = [];
        for(i = 0, l = inspections.length; i < l; i++) {
          values.push(inspections[i].value());
        }
        reject(values);
        return;
      }
      fulfill(last);
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

function composeUnwrapped(promises, decF, decR, transform) {
  var curr, index, length, err,
      collection = new Array(promises.length),
      promise = new Deferred,
      sem = new Semaphore(
        promises.length,
        function() { promise.fulfill(collection); },
        bind(promise.reject, promise)
      );
  err = function(e) {
    if(transform) sem.error(transform(e));
    else sem.error(e);
  };

  for(index = 0, length = promises.length; index < length; index++) {
    curr = promises[index];
    curr.then(
      decF ? insertUnwrapped(collection, index, sem, transform) : err,
      decR ? insertUnwrapped(collection, index, sem, transform) : err
    );
  }

  return promise;
}

function insertUnwrapped(collection, index, semaphore, transform) {
  return function(el) {
    collection[index] = transform ? transform(el) : el;
    semaphore.decrement();
  };
}

function blankUnwrapped(semaphore) {
  return function() {
    semaphore.decrement();
  };
}

function collect(promises, inverse) {
  var curr, index, length,
      collection = new Array(promises.length),
      promise = new Deferred,
      sem = new Semaphore(
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
