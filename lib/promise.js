!function() {
  'use strict';

  /*
   * ### Setup. ###
   */

  var root;
  if(typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') {
    root = module.exports;
  } else {
    root = window.promise;
  }


  /*
   * Promise class.
   * --------------
   */

  function Promise() {
    this._fulfilledBuffer = [];
    this._failedBuffer = [];

    this._unfulfilled = true;
    this._fulfilled = false;
    this._failed = false;

    this.args = [];
  }


  /*
   * Promise public methods.
   * -----------------------
   */

  Promise.prototype.then = function(fulfilled, failed) {
    var promise = new Promise();

    if(this._unfulfilled) {
      if(fulfilled) this._fulfilledBuffer.push(fulfilled);
      if(failed) this._failedBuffer.push(failed);
      this._fulfilledBuffer.push(function() { promise.fulfill(); });
      this._failedBuffer.push(function() { promise.fail(); });
      return promise;
    }

    if(this._failed) {
      if(failed) failed.apply(null, this.args);
      promise.fail();
    } else {
      if(fulfilled) fulfilled.apply(null, this.args);
      promise.fulfill();
    }

    return promise;
  };

  Promise.prototype.fulfill = function() {
    if(!this._unfulfilled) return;
    setState(this, true, argArray(arguments));
  };

  Promise.prototype.fail = function() {
    if(!this._unfulfilled) return;
    setState(this, false, argArray(arguments));
  };


  /*
   * Promise accessors.
   * ------------------
   */

  Promise.prototype.fulfilled = function() { return this._fulfilled; };
  Promise.prototype.failed = function() { return this._failed; };
  Promise.prototype.unfulfilled = function() { return this._unfulfilled; };

  /*
   * Promise private methods.
   * ------------------------
   */

  function setState(promise, fulfilled, args) {
    promise._unfulfilled = false;
    promise._fulfilled = fulfilled;
    promise._failed = !fulfilled;

    promise.args = args;
    applyFunctions(
      fulfilled ? promise._fulfilledBuffer : promise._failedBuffer,
      null,
      args
    );

    promise._fulfilledBuffer = [];
    promise._failedBuffer = [];
  }


  /*
   * Helper functions.
   * -----------------
   */

  function applyFunctions(fns, scope, args) {
    var index, curr;
    for(index = 0; curr = fns[index]; index++) {
      curr.apply(scope, args);
    }
  }

  function argArray(args) {
    return Array.prototype.slice.call(args, 0, args.length);
  }


  /*
   * ### Packaging. ###
   */

  root.Promise = Promise;

}();
