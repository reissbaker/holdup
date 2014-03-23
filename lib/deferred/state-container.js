'use strict';

function DeferredStateContainer(deferred) {
  this.d = deferred;
}
DeferredStateContainer.prototype.state = function() { return this.d._state; };
DeferredStateContainer.prototype.value = function() { return this.d._value; };


function SyncStateContainer(state, value) {
  this._s = state;
  this._v = value;
}
SyncStateContainer.prototype.state = function() { return this._s; };
SyncStateContainer.prototype.value = function() { return this._v; };

module.exports = function(state, value) {
  if(typeof state === 'number') return new SyncStateContainer(state, value);
  return new DeferredStateContainer(state);
};
