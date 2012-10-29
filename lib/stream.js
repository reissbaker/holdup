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
        error = false,
        count = promises.length,
        ref = this;

    this.readable = true;

    this._closed = false;
    this._paused = false;
    this._buffer = [];

    function counted(fn) {
      return function() {
        count--;
        fn.apply(null, arguments);
        if(count === 0) ref.emit('end');
      };
    }

    function stopError() { return endOnError && error; }

    for(index = 0; curr = this._promises[index]; index++) {
      curr.then(counted(function() {
        var args = Array.prototype.slice.call(arguments, 0);
        tryEmit(ref, stopError, function() {
          emitData(ref, args);
        });
      }), counted(function() {
        error = true;
        var args = arguments;
        tryEmit(ref, stopError, function() {
          ref.emit.apply(ref, 'error', args);
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
    if(stream._paused) {
      stream._buffer.push(data);
      return;
    }

    emitBuffer(stream);
    emitSingleData(stream, data);
  }

  function emitBuffer(stream) {
    var index, curr,
        buffer = stream._buffer;

    for(index = 0; curr = buffer[index]; index++) {
      emitSingleData(stream, curr);
    }
  }

  function emitSingleData(stream, data) {
    data.unshift('data');
    stream.emit.apply(stream, data);
  }


  /*
   * Packaging.
   * ----------
   */

  root.Stream = PromiseStream;

}();
