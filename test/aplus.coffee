{Deferred} = require '../lib/promise'

adapter = {
  fulfilled: (value) ->
    deferred = new Deferred
    deferred.fulfill value
    deferred.promise()
  rejected: (reason) ->
    deferred = new Deferred
    deferred.reject reason
    deferred.promise()
  pending: ->
    deferred = new Deferred
    {
      promise: deferred.promise()
      fulfill: (value) -> deferred.fulfill(value)
      reject: (reason) -> deferred.reject(reason)
    }
}

describe 'Promises/A+ Tests', ->
  require('promises-aplus-tests').mocha(adapter)
