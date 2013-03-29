HOLDUP
======

Holdup is a library for defining dependency graphs for promises. Once you've
defined the graphs, your promises will be executed with maximal parallelism:
you don't have to explicitly state `parallel` or `serial`, you just let the
promises run. This makes maximal parallelism both easier to achieve and easier
to maintain: rather than thinking about ordering or race conditions, just
define dependencies and Holdup will take care of the rest.

Holdup runs in Node, Component-spec environments, and ordinary browsers.  It
has no dependencies, and is extensively unit-tested. It works with any CommonJS
Promises/A or Promises/A+ compliant promise implementation, including jQuery
Deferreds; it also provides its own Promises/A+ compliant Promise
implementation that it uses internally and that you may use yourself if you so
choose.

Here's an example of how to define a task that depends on three other
Node-style async functions:

```javascript
taskA = holdup.wrap(nodeFn);
taskB = holdup.wrap(otherNodeFn);
taskC = holdup.wrap(finalNodeFn, arg1, arg2);

taskD = holdup.all([taskA, taskB, taskC]);

taskD.then(function() {
  // do work
}, function() {
  // handle errors
});
```

In this case, `taskA`, `taskB`, and `taskC` will all immediately execute in
parallel, and `taskD` will wait until all three finish successfully. If any
of the dependencies fail, the `taskD` promise will fail as well. All of the
tasks are themselves just Promises/A+ compliant promises, so they can be used
with any library that works with Promises/A or Promises/A+.
