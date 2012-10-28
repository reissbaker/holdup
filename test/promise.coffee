expect = require 'expect.js'
{Promise} = require '../lib/promise'

describe 'Promise', ->
  promise = null

  beforeEach -> promise = new Promise

  it 'should fire its `then` callback when fulfilled', (done) ->
    promise.then(
      -> done()
      -> expect(false).to.be true
    )
    promise.fulfill()

  it 'should fire its `then` errback when failed', (done) ->
    promise.then(
      -> expect(false).to.be true
      -> done()
    )
    promise.fail()

  it 'should have optional errbacks', (done) ->
    promise.then -> done()
    promise.fulfill()

  it 'should have optional callbacks', (done) ->
    promise.then null, -> done()
    promise.fail()

  it 'should pass the data given to it in its `fulfill` call to its callback', (done) ->
    promise.then (data) ->
      expect(data).to.be 100
      done()
    promise.fulfill 100

  it 'should pass the data given to it in its `fail` call to its errback', (done) ->
    promise.then null, (err) ->
      expect(err).to.be 100
      done()
    promise.fail 100

  it 'should not be able to fail after being fulfilled', ->
    called = 0
    promise.then(
      -> called++
      -> called++
    )
    promise.fulfill()
    promise.fail()
    expect(called).to.be 1
    expect(promise.fulfilled()).to.be true
    expect(promise.failed()).to.be false

  it 'should not be able to be fulfilled after failing', ->
    called = 0
    promise.then(
      -> called++
      -> called++
    )
    promise.fail()
    promise.fulfill()
    expect(called).to.be 1
    expect(promise.failed()).to.be true
    expect(promise.fulfilled()).to.be false

  it 'should have its fulfill function be idempotent', (done) ->
    promise.then -> done()
    promise.fulfill()
    promise.fulfill()

  it 'should have its fail function be idempotent', (done) ->
    promise.then null, -> done()
    promise.fail()
    promise.fail()

  it 'should execute callbacks if already fulfilled', (done) ->
    promise.fulfill()
    promise.then -> done()

  it 'should execute errbacks if already failed', (done) ->
    promise.fail()
    promise.then null, -> done()

  it 'should be unfulfilled when unfulfilled, and nothing else', ->
    expect(promise.unfulfilled()).to.be true
    expect(promise.fulfilled()).to.be false
    expect(promise.failed()).to.be false

  it 'should be fulfilled when fulfilled, and nothing else', ->
    promise.fulfill()
    expect(promise.fulfilled()).to.be true
    expect(promise.unfulfilled()).to.be false
    expect(promise.failed()).to.be false

  it 'should be failed when failed, and nothing else', ->
    promise.fail()
    expect(promise.failed()).to.be true
    expect(promise.unfulfilled()).to.be false
    expect(promise.fulfilled()).to.be false

  # ALSO TODO: test multiple arguments passed to a fulfill() or fail()
