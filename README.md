HOLDUP
================================================================================

Holdup is a tiny but full-featured flow-control library based on the
Promises/A+ spec that makes working with callbacks in Javascript easy. With
Holdup you define the dependencies of your functions and it executes them for
you with maximal concurrency: you don't have to explicitly state whether
they're parallel or serial, or what order each one should run in. It just
works.

Holdup runs in Node, Component-spec environments, and ordinary browsers; it has
no dependencies and is extensively unit-tested. It works with any CommonJS
Promises/A or Promises/A+ compliant promise implementation; it also provides
its own Promises/A+ compliant promise implementation. It clocks in at less than
1.6k minified and gzipped.


Examples
--------------------------------------------------------------------------------

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

Holdup understands more than success, though. Sometimes, things break; it's
still important to handle those failures. It might also be important to take
certain actions if *enough* things break, or if specific combinations of things
break. With Holdup, it's easy to define those relationships:

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

Similarly, Holdup has a `resolved` function that fulfills once everything has
resolved -- even if everything resolved to an error state, or if some resolved
one way and others resolved another. It passes the fulfilled and rejected
promises in separate arrays to the `then` callback, as so:

```javascript
var taskA = holdup.wrap(fnA),
    taskB = holdup.wrap(fnB),
    taskC = holdup.wrap(fnC),
    taskD = holdup.resolved(taskA, taskB, taskC);

taskD.then(function(fulfilled, rejected) {
  // this is called once taskA, taskB, and taskC are no longer in pending
  // states.
  // fulfilled is an array of which tasks have fulfilled, and rejected is an
  // array of which tasks have rejected.
});
```

The `all`, `none`, and `resolved` functions form the basis of Holdup's API, but
they're not the only ones available. Holdup provides a full-featured functional
API for working with promises, wrapping Node-style functions, and easily making
your own promises. Keep reading for the full API documentation.


API
--------------------------------------------------------------------------------

### holdup.all(promises...)

Takes an arg list, array, array of arrays, arg lists of arrays... etc
containing promises.

Returns a promise that will be fulfilled if all the promises fulfill, and will
reject as soon as any of the promises reject.

It will call its `then` callback with the array of all fulfilled promises, in
the order that they fulfilled. It will call its `then` errback with the first
promise to reject.


### holdup.none(promises...)

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled if all of the promises reject, and
will reject as soon as any of the promises fulfill.

The returned promise will call its `then` callback with the array of all
rejected promises, in the order that they rejected. It will call its `then`
errback with the first promise to fulfill.


### holdup.resolved(promises...)

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled once all of the given promises are no
longer in a pending state; i.e., once they've each been rejected or fulfilled.
The promises don't have to end in the same state: they only have to leave the
pending state.

The returned promise will call its `then` callback with two arguments: the
first is an array of all fulfilled promises in the order that they fulfilled,
and the second is an array of all rejected promises in the order that they
rejected. If no promises fulfilled, the first argument will be an empty array;
if no promises rejected, the first argument will similarly be an empty list.


### holdup.firstFulfilled(promises...)

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled as soon as the first of the given
promises fulfills, and will reject if none of the promises fulfill.

The returned promise will call its `then` callback with the first fulfilled
promise, and will call its `then` errback with the array of all rejected
promises in the order that they rejected.


### holdup.firstRejected(promises...)

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled as soon as the first of the given
promises rejects, and will reject if none of the promises reject.

The returned promise will call its `then` callback with the first rejected
promise, and will call its `then` errback with the array of all fulfilled
promises in the order that they fulfilled.


### holdup.lastFulfilled(promises...)

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled once all of the promises have left
their pending state, and at least one has fulfilled. It will reject if all
given promises reject.

The returned promise will call its `then` callback with the last fulfilled
promise, and will call its `then` errback with the array of all rejected
promises in the order that they rejected.


### holdup.lastRejected(promises...)

Takes an arg list, array, array of arrays, arg list of arrays... etc containing
promises.

Returns a promise that will be fulfilled once all of the promises have left
their pending state, and at least one has rejected. It will reject if all given
promises fulfill.

The returned promise will call its `then` callback with the first rejected
promise, and will call its `then` errback with the array of all fulfilled
promises in the order that they fulfilled.


### holdup.invert(promise)

Given a promise, returns a promise that will reject when the given promise
fulfills and will fulfill when the given promise rejects.

If data is passed to the callback of the given promise, it will be passed as
the error to the returned promise's errback. If an error is passed to the
errback of the given promise, it will be passed as the data to the returned
promises callback.


### holdup.data(promises..., callback)

Takes a list of promises (in array or arg list form) containing promises, and a
callback function.

Calls the callback function with the data from the promises' `then` callbacks,
ordered according to the promises' ordering in the arguments.

For example:

```javascript
holdup.data(a, b, c, function(aData, bData, cData) {
  // do things with the data from a, b, and c
});
```

The callback will only be called once all promises have resolved. If promises
are resolved in a rejected state, their corresponding data will be passed in as
`undefined`.


### holdup.errors(promises..., callback)

Takes a list of promises (in array or arg list form) containing promises, and a
callback function.

Calls the callback function with the errors from the promises' `then` errbacks,
ordered according to the promises' ordering in the arguments.

For example:

```javascript
holdup.errors(a, b, c, function(aError, bError, cError) {
  // do things with the errors from a, b, and c
});
```

The callback will only be called once all promises have resolved. If promises
are resolved in a fulfilled state, their corresponding error will be passed in
as `undefined`.


### holdup.make(callback)

Given a callback of form `function(fulfill, reject) {}`, returns a promise that
will be fulfilled when the callback calls `fulfill` or rejected when the
promise calls `reject`.

The returned promise will call its `then` callback with whatever is passed to
the `fulfill` callback, and will call its `then` errback with whatever is
passed to the `reject` errback.


### holdup.wrap(nodeFn, args...)

Given a Node-style async function, and optional arguments, returns a promise
that fulfills if the given function completes successfully and rejects if it
doesn't.

The returned promise will call its `then` callback with anything passed as the
`data` parameter to the async function (if anything is in fact passed), and
will call its `then` errback with anything passed as the `err` param to the
async function.


### holdup.wrapFor(scope, nodeFn, args...)

Given a scope, a Node-style async function, and optional arguments, returns a
promise that fulfills if the given function completes successfully and rejects
if it doesn't.

The returned promise will call its `then` callback with anything passed as the
`data` parameter to the async function (if anything is in fact passed), and
will call its `then` errback with anything passed as the `err` param to the
async function.


### holdup.timeout(milliseconds)

Given a time in milliseconds, returns a promise that calls its `then` callback
after that amount of time. The returned promise will never call any errback
functions given to it.

The returned promise will pass along the given timeout interval to the `then`
callback as its first parameter.


License
--------------------------------------------------------------------------------

MIT. See LICENSE.txt for details.
