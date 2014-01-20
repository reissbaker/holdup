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


  var root, later;
  if(typeof module != 'undefined' && module.exports && typeof require != 'undefined') {
    root = module.exports;
    later = require('./later').later;
  } else {
    root = window.holdup._error;
    later = window.holdup._timing.later;
  }

  var guid = 0;
  function AsyncError(err, thrown) {
    this.error = err;
    this.thrown = thrown;
    this.id = guid++;
    this.postponed = false;
  }

  var errorHandlers = [],
      thrownHandlers = [];

  root.events = {
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
        root.events.off(type, wrapped);
      };
      root.events.on(type, wrapped);
    }
  };


  var unhandled = {};

  root.wrap = function(err, thrown) {
    var asyncErr = new AsyncError(err, thrown);
    unhandled[asyncErr.id] = asyncErr;
    scheduleException();
    return asyncErr;
  };

  root.unwrap = function(asyncErr) {
    return asyncErr.error;
  };

  root.isWrapped = function(obj) {
    return obj instanceof AsyncError;
  };

  root.handle = function(asyncErr, fromThrownHandler) {
    if(asyncErr.thrown && !fromThrownHandler) return;

    if(unhandled.hasOwnProperty(asyncErr.id)) {
      delete unhandled[asyncErr.id];
    }
  };

  root.postpone = function(asyncErr) {
    asyncErr.postponed = true;
  };

  root.reset = function() {
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
      later(function() {
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
          root.handle(curr);
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
      callbacks[i](root.unwrap(asyncErr));
    }
  }

}();
