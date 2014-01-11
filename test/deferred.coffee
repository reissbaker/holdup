expect = require 'expect.js'
{Deferred} = require '../lib/deferred'

describe 'Deferred', ->
  promise = null

  beforeEach -> promise = new Deferred

  it 'fires its `then` callback when fulfilled', (done) ->
    promise.then(
      -> done()
      -> expect(false).to.be true
    )
    promise.fulfill()

  it 'fires its `then` errback when rejected', (done) ->
    promise.then(
      -> expect(false).to.be true
      -> done()
    )
    promise.reject()

  it 'has optional errbacks', (done) ->
    promise.then -> done()
    promise.fulfill()

  it 'has optional callbacks', (done) ->
    promise.then null, -> done()
    promise.reject()

  it 'passs the data given to it in its `fulfill` call to its callback', (done) ->
    promise.then (data) ->
      expect(data).to.be 100
      done()
    promise.fulfill 100

  it 'passes the data given to it in its `reject` call to its errback', (done) ->
    promise.then null, (err) ->
      expect(err).to.be 100
      done()
    promise.reject 100

  it 'is not be able to reject after being fulfilled', (done) ->
    promise.then (-> done()), (-> done())
    promise.fulfill()
    promise.reject()
    expect(promise.rejected()).to.be false
    expect(promise.fulfilled()).to.be true

  it 'is not be able to be fulfilled after rejecting', (done) ->
    promise.then (-> done()), (-> done())
    promise.reject()
    promise.fulfill()
    expect(promise.rejected()).to.be true
    expect(promise.fulfilled()).to.be false

  it 'has its fulfill function be idempotent', (done) ->
    promise.then -> done()
    promise.fulfill()
    promise.fulfill()

  it 'has its reject function be idempotent', (done) ->
    promise.then null, -> done()
    promise.reject()
    promise.reject()

  it 'executes callbacks if already fulfilled', (done) ->
    promise.fulfill()
    promise.then -> done()

  it 'executes errbacks if already rejected', (done) ->
    promise.reject()
    promise.then null, -> done()

  it 'is unfulfilled when unfulfilled, and nothing else', ->
    expect(promise.pending()).to.be true
    expect(promise.fulfilled()).to.be false
    expect(promise.rejected()).to.be false

  it 'is fulfilled when fulfilled, and nothing else', ->
    promise.fulfill()
    expect(promise.fulfilled()).to.be true
    expect(promise.pending()).to.be false
    expect(promise.rejected()).to.be false

  it 'is rejected when rejected, and nothing else', ->
    promise.reject()
    expect(promise.rejected()).to.be true
    expect(promise.pending()).to.be false
    expect(promise.fulfilled()).to.be false

  it 'fulfills when using the public promise interface', (done) ->
    promise.promise().then -> done()
    promise.fulfill()

  it 'rejects when using the public promise interface', (done) ->
    promise.promise().then null, -> done()
    promise.reject()

  it 'won\'t fulfill twice when using the public promise interface', (done) ->
    promise.promise().then -> done()
    promise.fulfill()
    promise.fulfill()

  it 'won\'t reject twice when using the public promise interface', (done) ->
    promise.promise().then null, -> done()
    promise.reject()
    promise.reject()



  # ALSO TODO: test multiple arguments passed to a fulfill() or reject()
