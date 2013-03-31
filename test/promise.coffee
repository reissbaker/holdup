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

  it 'should fire its `then` errback when rejected', (done) ->
    promise.then(
      -> expect(false).to.be true
      -> done()
    )
    promise.reject()

  it 'should have optional errbacks', (done) ->
    promise.then -> done()
    promise.fulfill()

  it 'should have optional callbacks', (done) ->
    promise.then null, -> done()
    promise.reject()

  it 'should pass the data given to it in its `fulfill` call to its callback', (done) ->
    promise.then (data) ->
      expect(data).to.be 100
      done()
    promise.fulfill 100

  it 'should pass the data given to it in its `reject` call to its errback', (done) ->
    promise.then null, (err) ->
      expect(err).to.be 100
      done()
    promise.reject 100

  it 'should not be able to reject after being fulfilled', (done) ->
    promise.then (-> done()), (-> done())
    promise.fulfill()
    promise.reject()
    expect(promise.rejected()).to.be false
    expect(promise.fulfilled()).to.be true

  it 'should not be able to be fulfilled after rejecting', (done) ->
    promise.then (-> done()), (-> done())
    promise.reject()
    promise.fulfill()
    expect(promise.rejected()).to.be true
    expect(promise.fulfilled()).to.be false

  it 'should have its fulfill function be idempotent', (done) ->
    promise.then -> done()
    promise.fulfill()
    promise.fulfill()

  it 'should have its reject function be idempotent', (done) ->
    promise.then null, -> done()
    promise.reject()
    promise.reject()

  it 'should execute callbacks if already fulfilled', (done) ->
    promise.fulfill()
    promise.then -> done()

  it 'should execute errbacks if already rejected', (done) ->
    promise.reject()
    promise.then null, -> done()

  it 'should be unfulfilled when unfulfilled, and nothing else', ->
    expect(promise.pending()).to.be true
    expect(promise.fulfilled()).to.be false
    expect(promise.rejected()).to.be false

  it 'should be fulfilled when fulfilled, and nothing else', ->
    promise.fulfill()
    expect(promise.fulfilled()).to.be true
    expect(promise.pending()).to.be false
    expect(promise.rejected()).to.be false

  it 'should be rejected when rejected, and nothing else', ->
    promise.reject()
    expect(promise.rejected()).to.be true
    expect(promise.pending()).to.be false
    expect(promise.fulfilled()).to.be false

  # ALSO TODO: test multiple arguments passed to a fulfill() or reject()
