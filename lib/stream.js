!function() {
  'use strict';

  /*
   * Setup.
   * ------
   */

  var root, Promise, Stream;
  if(typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') {
    root = module.exports;
    Promise = require('./promise').Promise;
    Stream = require('Stream');
  } else {
    root = window.promise;
    Promise = root.Promise;
    Stream = window.Stream;
  }


  /*
   * Stream class.
   * -------------
   */

  function PromiseStream(promises, options) {
    Stream.call(this);

    var index, curr,
        endOnError = !!options.endOnError,
        errored = false,
        count = promises.length,
        ref = this;

    this.readable = true;

    this._closed = false;
    this._paused = false;
    this._buffer = [];

    // Convenience function. Turns an ordinary emission function into an
    // emission function that uses the `count` semaphore to emit an `end` event
    // when needed.
    function counted(fn) {
      return function() {
        count--;
        fn.apply(null, arguments);
        if(count === 0) ref.emit('end');
      };
    }

    // Callback to tell `tryEmit` whether or not to stop due to an error.
    function stopError() { return endOnError && errored; }

    // Bind to each of the promises passed in.
    for(index = 0; curr = this._promises[index]; index++) {
      curr.then(counted(function() {
        var args = Array.prototype.slice.call(arguments, 0);
        tryEmit(ref, stopError, function() {
          emitData(ref, args);
        });
      }), counted(function() {
        errored = true;
        var args = Array.prototype.slice.call(arguments, 0);
        tryEmit(ref, stopError, function() {
          emitError(ref, args);
        });
      }));
    }
  }
  PromiseStream.prototype = new Stream;
  PromiseStream.prototype.constructor = Stream;


  /*
   * Stream public methods.
   * ----------------------
   */

  PromiseStream.prototype.destroy = function() {
    this._closed = true;
    this.emit('close');
  };

  PromiseStream.prototype.pause = function() {
    this._paused = true;
  };

  PromiseStream.prototype.resume = function() {
    this._paused = false;
    emitBuffer(this);
  };


  /*
   * Stream private methods.
   * -----------------------
   */

  function tryEmit(stream, stopError, callback) {
    if(!stream._closed && !stopError()) callback();
  }

  function emitData(stream, data) {
    bufferItem(stream, data, 'data');
    emitBuffer(stream);
  }

  function emitError(stream, error) {
    bufferItem(stream, error, 'error');
    emitBuffer(stream);
  }

  function bufferItem(stream, item, type) {
    item = item.slice(0);
    item.unshift(type);
    stream._buffer.push(item);
  }

  function emitBuffer(stream) {
    var curr, args,
        buffer = stream._buffer;
    while(buffer.length && !stream._paused) {
      stream.emit.apply(stream, buffer.pop());
    }
  }


  /*
   * Packaging.
   * ----------
   */

  root.Stream = PromiseStream;

}();
