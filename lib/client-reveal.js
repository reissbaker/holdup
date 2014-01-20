!function() {
  'use strict';

  var holdup = window.holdup;
  holdup.on = holdup._error.events.on;
  holdup.off = holdup._error.events.off;
  holdup.once = holdup._error.events.once;
  holdup.resetErrors = holdup._error.reset;
}();
