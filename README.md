HOLDUP
======

Holdup is a promise-based flow-control library that makes working with
asynchronous callbacks in Javascript easy. With Holdup you define the
dependencies of your functions and it executes them for you with maximal
parallelism; you don't have to explicitly state whether they're `parallel` or
`serial`, unlike with other, similar libraries. This makes maximal parallelism
both easier to achieve and easier to maintain: rather than thinking about
function ordering or race conditions, you just define dependencies and Holdup
takes care of the rest.

Holdup runs in Node, Component-spec environments, and ordinary browsers.  It
has no dependencies and is extensively unit-tested. It works with any CommonJS
Promises/A or Promises/A+ compliant promise implementation, including jQuery
Deferreds; it also provides its own Promises/A and Promises/A+ compliant
promise implementation that it uses internally and that you may use yourself if
you so choose.

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
parallel, and the work will wait until all three finish successfully. If any
of the dependencies fail, the error callback will be called. All of the
tasks are themselves just Promises/A+ compliant promises, so they can be used
with any library that works with Promises/A or Promises/A+.

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
`taskB`. This might be tricky to hand-optimize! Since you just have to specify
dependencies, though, you can let Holdup take care of the work for you.

Holdup understands more than success, though. Sometimes, things break: and
we still need to handle those failures. What's more, we might only need to take
certain precautions if *enough* things break, or if specific combinations of
things break. With Holdup, it's easy to define those relationships:
