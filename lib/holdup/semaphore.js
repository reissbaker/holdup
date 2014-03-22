
function Semaphore(size, callback, errback) {
  this.size = size;
  this.callback = callback;
  this.errback = errback;
  this.errored = false;

  if(size === 0) callback();
}

Semaphore.prototype.decrement = function() {
  if(this.errored) return;
  this.size--;
  if(this.size === 0) this.callback();
};

Semaphore.prototype.error = function() {
  if(this.errored) return;
  this.errored = true;
  this.errback.apply(undefined, arguments);
};

module.exports = Semaphore;
