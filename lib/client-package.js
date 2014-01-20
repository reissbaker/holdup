!function(window) {
  'use strict';

  var oldHoldup = window.holdup;

  window.holdup = {
    noConflict: function() {
      window.holdup = oldHoldup;
      return this;
    },
    _timing: {},
    _error: {}
  };

}(window);
