'use strict';

var state = require('./state'),
    stateContainer = require('./state-container'),
    error = require('./error');

function Inspection(state, value) {
  this._s = stateContainer(state, value);
}

Inspection.prototype.value = function() {
  if(!this.isFulfilled()) throw new TypeError;
  return this._s.value();
};

Inspection.prototype.error = function() {
  if(!this.isRejected()) throw new TypeError;
  var val = this._s.value();
  if(error.isWrapped(val)) return error.unwrap(val);
  return val;
};

Inspection.prototype.isThrown = function() {
  return this._s.state() === state.THROWN;
};

Inspection.prototype.isRejected = function() {
  return this._s.state() === state.REJECTED || this.isThrown();
};

Inspection.prototype.isFulfilled = function() {
  return this._s.state() === state.FULFILLED;
};

module.exports = Inspection;
