```
 /$$                 /$$       /$$
| $$                | $$      | $$
| $$$$$$$   /$$$$$$ | $$  /$$$$$$$ /$$   /$$  /$$$$$$
| $$__  $$ /$$__  $$| $$ /$$__  $$| $$  | $$ /$$__  $$
| $$  \ $$| $$  \ $$| $$| $$  | $$| $$  | $$| $$  \ $$
| $$  | $$| $$  | $$| $$| $$  | $$| $$  | $$| $$  | $$
| $$  | $$|  $$$$$$/| $$|  $$$$$$$|  $$$$$$/| $$$$$$$/
|__/  |__/ \______/ |__/ \_______/ \______/ | $$____/
                                            | $$
                                            | $$
                                            |__/
```


<a href=http://promises-aplus.github.com/promises-spec>
  <img src=http://promises-aplus.github.com/promises-spec/assets/logo-small.png
       align=right
       alt='Promises/A+ logo'
  />
</a>


Holdup is a small but full-featured flow-control library that makes working with
promises or callbacks in Javascript easy. With Holdup you define the
dependencies of your functions and it executes them for you with maximal
concurrency: you don't have to explicitly state whether they're parallel or
serial, or what order each one should run in. It just works.

Holdup runs in Node, Component-spec environments, and ordinary browsers; it has
no dependencies and is extensively unit-tested. It works with any CommonJS
Promises/A or Promises/A+ compliant promise implementation; it also provides
its own Promises/A+ compliant promise implementation. It clocks in at a skinny
3.7k minified and gzipped.


Examples
================================================================================

Here's an example of how to define a task that depends on three other
Node-style async functions:

```javascript
var taskA = holdup.wrap(nodeFn);
var taskB = holdup.wrap(otherNodeFn);
var taskC = holdup.wrap(finalNodeFn, arg1, arg2);

holdup.all(taskA, taskB, taskC).then(function() {
  // do work
}, function() {
  // handle errors
});
```

In this case, `taskA`, `taskB`, and `taskC` will all immediately execute in
parallel, and the work will wait until all three finish successfully. If any of
the dependencies fail, the error callback will be called. All of the tasks are
themselves just Promises/A+ compliant promises, so they can be used with any
library that works with Promises/A or Promises/A+.

That was a simple example, though: do some work in parallel, and when it
finishes do some other work. What if we have multiple dependencies on separate
parallel workloads? Holdup handles that well too:

```javascript
var taskA = holdup.wrap(fnA);
var taskB = holdup.wrap(fnB);

var taskC = holdup.all(taskA, taskB).then(function() {
  return holdup.wrap(fnC);
});

var taskD = holdup.all(taskA).then(function() { return holdup.wrap(fnD); });

var taskE = holdup.all(taskC, taskD).then(function() {
  return holdup.wrap(fnE);
});
```

In the above, `taskE` depends both on `taskC` and `taskD`. `taskD` depends on
`taskA`, as does `taskC` -- but `taskC` has an additional dependency on
`taskB`. This might be a pain to hand-optimize with raw callbacks, but since
you just have to specify dependencies you can let Holdup take care of the work
for you.

Holdup understands more than success, though. Sometimes things break; it's
still important to handle those failures. It might also be important to take
certain actions if specific combinations of things break. With Holdup, it's
easy to define those relationships:

```javascript
var taskA = holdup.wrap(fnA),
    taskB = holdup.wrap(fnB),
    taskC = holdup.wrap(fnC),
    taskD = holdup.all(taskA, taskB),
    taskE = holdup.none(taskC, taskD);

taskE.then(function() {
  // only gets called when taskC and taskD both error out
}, function() {
  // gets called if either taskC or taskD pass, or if they both do
});
```

Similarly, Holdup has a `settled` function that fulfills once everything has
resolved -- even if everything resolved to an error state, or if some resolved
one way and others resolved another. It passes inspection objects with
`.value()` and `.error()` accessor methods to its callback:

```javascript
var taskA = holdup.wrap(fnA),
    taskB = holdup.wrap(fnB),
    taskC = holdup.wrap(fnC),
    taskD = holdup.resolved(taskA, taskB, taskC);

taskD.then(function(values) {
  // this is called once taskA, taskB, and taskC are no longer in pending
  // states.
  // values is an array of Inspection objects with `.value()` and `.error()`
  // accessor methods, along with state accessors like `.isFulfilled()` and
  // `.isRejected()`.
});
```

The `all`, `none`, and `settled` primitives form much of the basis of Holdup's
API, but they're not the only methods available. Holdup provides a
full-featured functional API for working with promises, wrapping Node-style
functions, and easily making your own promises. Keep reading for the full API
documentation.


API
================================================================================

Creating Promises
--------------------------------------------------------------------------------

##### holdup.make(callback)

Given a callback of form `function(fulfill, reject) {}`, returns a promise that
will be fulfilled when the callback calls `fulfill` or rejected when the
promise calls `reject`.

The returned promise will call its `then` callback with whatever is passed to
the `fulfill` callback, and will call its `then` errback with whatever is
passed to the `reject` errback.


##### holdup.fulfill(value)

Given a value, returns a promise that will fulfill to the value.

Essentially a degenerate, but convenient form of `holdup.make` for creating
promises that you know will fulfill to a specific value.


##### holdup.fcall(fn)

Given a function that returns a value, returns a promise that will fulfill to
the result of the given function.

Essentially a degenerate, but convenient form of `holdup.make` for creating
promises that you know will fulfill to a specific value.


##### holdup.reject(fn)

Given a reason, returns a promise that will reject with the reason.

Essentially a degenerate but convenient form of `holdup.make` for creating
promises that you know will reject to a specific value.


##### holdup.ferr(fn)

Given a function that returns a value, returns a promise that will reject with
the result of the given function passed as the rejection reason.

Essentially a degenerate but convenient form of `holdup.make` for creating
promises that you know will reject to a specific value.



Manipulating Promises
--------------------------------------------------------------------------------


##### holdup.all(promises...)

Takes an arg list, array, array of arrays, arg lists of arrays... etc
containing promises.

Returns a promise that will be fulfilled if all the promises fulfill, and will
reject as soon as any of the promises reject.

It will call its `then` callback with the array of all fulfilled values, in the
order that their respective promises were passed in. It will call its `then`
errback with the first promise to reject.


##### holdup.none(promises...)

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled if all of the promises reject, and
will reject as soon as any of the promises fulfill.

The returned promise will call its `then` callback with the array of all
rejected promises, in the order that they rejected. It will call its `then`
errback with the first promise to fulfill.


##### holdup.settled(promises...)

*alias: `holdup.resolved`, `holdup.allSettled`*

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled once all of the given promises are no
longer in a pending state; i.e., once they've each been rejected or fulfilled.
The promises don't have to end in the same state: they only have to leave the
pending state. The returned promise will never reject.

The returned promise will call its `then` callback with an array of promise
Inspection instances, with each inspection in the order that its respective
promise was passed in.


##### holdup.firstValue(promises...)

*alias: `holdup.race`*

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled as soon as the first of the given
promises fulfills, and will reject if none of the promises fulfill.

The returned promise will call its `then` callback with the first fulfilled
value, and will call its `then` errback with the array of all rejected errors
in the order that their respective promises were passed in.


##### holdup.firstError(promises...)

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled as soon as the first of the given
promises rejects, and will reject if none of the promises reject.

The returned promise will call its `then` callback with the first rejection
reason, and will call its `then` errback with the array of all fulfilled values
in the order that their respective promises were passed in.


##### holdup.lastValue(promises...)

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled once all of the promises have left
their pending state, and at least one has fulfilled. It will reject if all
given promises reject.

The returned promise will call its `then` callback with the value of the last
fulfilled promise, and will call its `then` errback with the array of all
rejection reasons in the order that the respective promises were passed in.


##### holdup.lastError(promises...)

Takes an arg list, array, array of arrays, arg list of arrays... etc
containing promises.

Returns a promise that will be fulfilled once all of the promises have
left their pending state, and at least one has rejected. It will reject
if all given promises fulfill.

The returned promise will call its `then` callback with the rejection reason
of the last rejected promise, and will call its `then` errback with the array
of all fulfilled promise values in the order that their respective promises
were passed in.


##### holdup.invert(promise)

Given a promise, returns a promise that will reject when the given promise
fulfills and will fulfill when the given promise rejects.

If data is passed to the callback of the given promise, it will be passed as
the error to the returned promise's errback. If an error is passed to the
errback of the given promise, it will be passed as the data to the returned
promises callback.



Working With Values
--------------------------------------------------------------------------------

##### holdup.spread

*alias: `holdup.spreadValues`*

Given a promise and a callback, calls the callback by applying the fulfilled
value of the promise to the callback.

For example:

```javascript
var a = holdup.fulfill(10),
    b = holdup.fulfill(11),
    c = holdup.all(a, b);

holdup.spread(c, function(aValue, bValue) {
  // aValue is 10
  // bValue is 11
});
```


##### holdup.spreadErrors

Given a promise and a callback, calls the callback by applying the rejected
error of the promise to the callback.

For example:

```javascript
var a = holdup.reject(['nope', 'definitely not']),

holdup.spreadErrors(a, function(firstError, secondError) {
  // firstError is 'nope'
  // secondError is 'definitely not'
});
```



Timing Functions
--------------------------------------------------------------------------------

##### holdup.wait(milliseconds)

Given a time in milliseconds, returns a promise that calls its `then` callback
after that amount of time. The returned promise will never call any errback
functions given to it.

The returned promise will pass along the given timeout interval to the `then`
callback as its first parameter.


##### holdup.delay(promise, milliseconds)

Given a promise and a time in milliseconds, returns a promise that fulfills
when the given promise fulfills or rejects when the first one rejects, but
waits the given time before fulfilling or rejecting.


##### holdup.timeout(promise, milliseconds)

Given a promise and a time in milliseconds, returns a promise that fulfills if
the given promise fulfills before the time is up and rejects otherwise.



Integrating With Node-style Callback APIs
--------------------------------------------------------------------------------

##### holdup.napply(scope, nodeFn, args)

Given a scope, a Node-style async function, and an array of arguments, returns
a promise that fulfills if the given function completes successfully and
rejects if it doesn't.

The returned promise will call its `then` callback with anything passed as the
`data` parameter to the async function (if anything is in fact passed), and
will call its `then` errback with anything passed as the `err` param to the
async function.


##### holdup.nfapply(nodeFn, args)

A convenient, scopeless version of `napply`, for times when it's acceptable
that the scope of `napply` be `null`.


##### holdup.ncall(scope, nodeFn, args...)

*alias: `holdup.wrapFor`*

Given a scope, a Node-style async function, and optional arguments, returns a
promise that fulfills if the given function completes successfully and rejects
if it doesn't.

The returned promise will call its `then` callback with anything passed as the
`data` parameter to the async function (if anything is in fact passed), and
will call its `then` errback with anything passed as the `err` param to the
async function.


##### holdup.nfcall

*alias: `holdup.wrap`*

A convenient, scopeless version of `ncall`, for times when it's acceptable that
the scope of `ncall` be `null`.


##### holdup.npost(obj, methodName, args)

Given an object, a method name corresponding to a Node-style async function,
and an array of arguments, returns a promise that fulfills if the given method
completes successfully and rejects if it doesn't.

The returned promise will call its `then` callback with anything passed as the
`data` parameter to the async function (if anything is in fact passed), and
will call its `then` errback with anything passed as the `err` param to the
async function.


##### holdup.ninvoke(obj, methodName, args...)

*alias: `holdup.send`*

Given an object, a method name corresponding to a Node-style async function,
and an optional argument list of parameters, returns a promise that fulfills if
the given method completes successfully and rejects if it doesn't.

The returned promise will call its `then` callback with anything passed as the
`data` parameter to the async function (if anything is in fact passed), and
will call its `then` errback with anything passed as the `err` param to the
async function.


##### holdup.nbind(nodeFn, scope, args...)

Given a Node-style async function, a scope, and an optional argument list of
parameters, returns a promise-returning function bound to the scope and the
given parameters.

The returned promise will call its `then` callback with anything passed as the
`data` parameter to the async function (if anything is in fact passed), and
will call its `then` errback with anything passed as the `err` param to the
async function.

For example:

```javascript
var readProust = holdup.bind(fs.readFile, fs, 'proust.txt', 'utf-8');
readProust().then(function(text) {
  // do things with text
});
```


##### holdup.nfbind(nodeFn, args...)

*alias: `holdup.denodeify`*

A convenient, scopeless version of nbind, for times when it's acceptable that
the scope of `nbind` be `null`.


##### holdup.nodeify(promise, callback)

Given a promise and a Node-style callback, calls the callback with the correct
`data` and `err` arguments when the promise fulfills or rejects.  Useful for
creating dual promise/callback APIs, or for using promises internally but
exposing only a callback API.



Promise Methods
--------------------------------------------------------------------------------

Promises created by Holdup are Promises/A+ compliant and expose the following
methods:

##### promise.then(onFulfilled, onRejected)

Given optional callbacks to be called on promise fulfillment or rejection,
returns a new promise that will adopt the state of the `onFulfilled` callback
if `promise` fulfills, or will adopt the state of `promise` otherwise.


##### promise.error(onRejected)

An alias for `promise.then(null, onRejected)`.


##### promise.error(ErrorClass, onRejected)

Similar to a call to `promise.error(onRejected)`, except that `onRejected` will
only be called if the given rejection reason is an instance of `ErrorClass`.


##### promise.thrown(onThrown)

*:warning: Warning: `promise.thrown` is not interoperable with other
Promises/A+ spec libraries; the Promises/A+ spec doesn't make it possible in a
general case to tell whether a promise has rejected due to a thrown error, or
whether it rejected for a different reason. If you need the functionality of
`promise.thrown` — for example, if you're running in Node and follow the [Node
core team's recommendation to shutdown on thrown errors to avoid memory
leaks][guide] — it's recommended that you not use Holdup in conjunction with
other Promise libraries.*

[guide]: http://nodejs.org/api/domain.html#domain_warning_don_t_ignore_errors

Similar to a call to `promise.then(null, onThrown)`, except that `onThrown`
will be called only if the promise rejects due to a thrown error.


##### promise.thrown(ThrownClass, onThrown)

Similar to a call to `promise.thrown(onThrown)`, except that `onThrown` will be
called only if the given rejection reason is an instance of `ThrownClass`.



Handling Uncaught Errors
--------------------------------------------------------------------------------

The Promises/A+ spec dictates that errors should never "leak" synchronously out
of a promise: if you reject or throw an error, you'll never know unless you've
attached an error handler (with `.then`, or the Holdup-specific `.error` or
`.thrown` methods).

Since often you'll want to take some action if an error occurs and is never
caught (for example, report it to your error logger, or gracefully restart your
server), Holdup provides events that fire when uncaught errors occur.

##### holdup.on('error', fn)

Calls `fn` if an uncaught rejection or thrown error occurs.


##### holdup.on('thrown', fn)

Calls `fn` if an uncaught thrown error occurs. Note that "catching" the error
by handling it with an `onRejected` callback isn't enough: to prevent this from
firing, you must use a `.thrown` callback. Like `.thrown` and other
thrown-error-specific code in Holdup, this is not compatible with other promise
libraries.


##### holdup.off(type, fn)

Removes the given callback from listening to the type (`'error'` or `'thrown'`)
of event.


##### holdup.once(type, fn)

Calls `holdup.on(type, fn)`, and then after the callback fires calls
`holdup.off(type, fn)`.



License
================================================================================

Copyright 2013-2014 Matt Baker. Licensed under the MIT License: see LICENSE.txt
for details.
