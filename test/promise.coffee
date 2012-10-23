expect = require 'expect.js'
{Promise} = require '../lib/promise'

describe 'Promise', ->
  promise = null

  beforeEach -> promise = new Promise

  it 'should fire its `then` function when fulfilled', (done) ->
    promise.then(
      -> done()
      -> expect(false).to.be true
    )
    promise.fulfill()

