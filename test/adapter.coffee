holdup = require '../index.js'
{Deferred} = holdup

module.exports = {
  fulfilled: (value) ->
    deferred = new Deferred
    deferred.fulfill(value)
    deferred.promise()
  rejected: (reason) ->
    deferred = new Deferred
    deferred.reject(reason)
    deferred.promise()
  deferred: ->
    deferred = new Deferred
    {
      promise: deferred.promise()
      resolve: (value) -> deferred.fulfill(value)
      reject: (reason) -> deferred.reject(reason)
    }
}
