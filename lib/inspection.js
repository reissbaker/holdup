'use strict';

var state = require('./state'),
    error = require('./error');

function Inspection(deferred) {
  this._d = deferred;
}

Inspection.prototype.value = function() {
  if(!this.isFulfilled()) throw new TypeError;
  return this._d._value;
};

Inspection.prototype.error = function() {
  if(!this.isRejected()) throw new TypeError;
  var val = this._d._value;
  if(error.isWrapped(val)) return error.unwrap(val);
  return val;
}

Inspection.prototype.isThrown = function() {
  return inState(this._d, state.THROWN);
  return this._d._value;
};

Inspection.prototype.isRejected = function() {
  return inState(this._d, state.REJECTED) || this.isThrown();
};

Inspection.prototype.isFulfilled = function() {
  return inState(this._d, state.FULFILLED);
};

function inState(deferred, state) {
  return deferred._state === state;
}

module.exports = Inspection;
