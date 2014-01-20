holdup = require '../index.js'
{Deferred} = holdup

module.exports = {
  resolved: (value) ->
    deferred = new Deferred
    deferred.fulfill(value)
    deferred
  rejected: (reason) ->
    deferred = new Deferred
    deferred.reject(reason)
    deferred
  deferred: ->
    deferred = new Deferred()
    {
      promise: deferred
      resolve: (value) -> deferred.fulfill(value)
      reject: (reason) -> deferred.reject(reason)
    }
}
