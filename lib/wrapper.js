!function() {
  'use strict';

  /*
   * ### Setup. ###
   */

  var root, Promise;
  if(typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') {
    root = module.exports;
    Promise = require('./promise');
  } else {
    root = window.promise;
    Promise = root.Promise;
  }


  root.make = function (scope, fn) {
    var args = Array.prototype.slice.call(arguments, 2),
        promise = new Promise();

    args.push(function(err, data) {
      if(err) promise.fail(err);
      else promise.fulfill(data);
    });
    fn.apply(scope, args);

    return promise;
  };


  root.timeout = function(time) {
    var promise = new Promise();
    setTimeout(function() {
      promise.fulfill();
    }, time);
    return promise;
  };

}();
