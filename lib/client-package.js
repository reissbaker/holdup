!function(window) {
  'use strict';

  var oldPromise = window.promise;

  window.promise = {
    noConflict: function() {
      window.promise = oldPromise;
      return this;
    }
  };

}(window);
