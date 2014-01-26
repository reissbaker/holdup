/*
 * Error Handling
 * =============================================================================
 *
 * Tracks errors and rejections as they move through trees of promises.
 * Responsible for detecting when unhandled rejections and thrown errors occur,
 * and emitting events when they do.
 */

!function() {
  'use strict';

  /*
   * Setup
   * ---------------------------------------------------------------------------
   */


  var guid = 0;
  function AsyncError(err, thrown) {
    this.error = err;
    this.thrown = thrown;
    this.id = guid++;
    this.postponed = false;
  }

  var errorHandlers = [],
      thrownHandlers = [];

  exports.events = {
    on: function(type, callback) {
      if(type === 'error') errorHandlers.push(callback);
      else if(type === 'thrown') thrownHandlers.push(callback);
    },
    off: function(type, callback) {
      var callbacks;
      if(type === 'error') callbacks = errorHandlers;
      else if(type === 'thrown') callbacks = thrownHandlers;
      for(var i = 0, l = callbacks.length; i < l; i++) {
        if(callbacks[i] === callback) {
          callbacks.splice(i, 1);
          return true;
        }
      }
      return false;
    },
    once: function(type, callback) {
      var wrapped = function() {
        callback.apply(undefined, arguments);
        exports.events.off(type, wrapped);
      };
      exports.events.on(type, wrapped);
    }
  };


  var unhandled = {};

  exports.wrap = function(err, thrown) {
    var asyncErr = new AsyncError(err, thrown);
    unhandled[asyncErr.id] = asyncErr;
    scheduleException();
    return asyncErr;
  };

  exports.unwrap = function(asyncErr) {
    return asyncErr.error;
  };

  exports.isWrapped = function(obj) {
    return obj instanceof AsyncError;
  };

  exports.handle = function(asyncErr, fromThrownHandler) {
    if(asyncErr.thrown && !fromThrownHandler) return;

    if(unhandled.hasOwnProperty(asyncErr.id)) {
      delete unhandled[asyncErr.id];
    }
  };

  exports.postpone = function(asyncErr) {
    asyncErr.postponed = true;
  };

  exports.reset = function() {
    unhandled = {};
    errorHandlers = [];
    thrownHandlers = [];
    scheduled = false;
    stackVersion++;
  }

  var scheduled = false,
      stackVersion = 0;
  function scheduleException() {
    var version = stackVersion;
    if(!scheduled) {
      scheduled = true;
      process.nextTick(function() {
        if(version === stackVersion) {
          scheduled = false;
          announceExceptions();
        }
      });
    }
  }

  function announceExceptions() {
    var prop, curr;
    for(prop in unhandled) {
      if(unhandled.hasOwnProperty(prop)) {
        curr = unhandled[prop];
        if(curr.postponed) {
          curr.postponed = false;
          scheduleException();
        } else {
          exports.handle(curr, true);
          announceException(curr);
        }
      }
    }
  }

  function announceException(asyncErr) {
    var callbacks;
    if(asyncErr.thrown) {
      callbacks = errorHandlers.concat(thrownHandlers);
    } else {
      callbacks = errorHandlers;
    }
    for(var i = 0, l = callbacks.length; i < l; i++) {
      callbacks[i](exports.unwrap(asyncErr));
    }
  }

}();
