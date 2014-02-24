expect = require 'expect.js'
{Deferred} = require '../lib/deferred'
holdup = require('../index')

describe 'Deferred', ->
  promise = null
  holdup.resetErrors()

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

  it 'adopts a thrown state when a then throws', (done) ->
    e = new Error
    promise = new Deferred
    child = promise.then -> throw e
    promise.fulfill(10)
    child.thrown (error) ->
      expect(error).to.be e
      done()

  it 'chains thrown errors', (done) ->
    e = new Error
    promise = new Deferred
    chained = promise.then(-> throw e).then().then()
    promise.fulfill(10)
    chained.thrown (error) ->
      expect(error).to.be e
      done()

  it 'filters classes for .error', (done) ->
    class Other
    class Test
    e = new Test
    promise = new Deferred
    child = promise.then -> throw e
    promise.fulfill(10)
    child.thrown Other, -> done()
    child.thrown Test, -> done()

  it 'filters classes for .thrown', (done) ->
    class Other
    class Test
    e = new Test
    promise = new Deferred
    child = promise.then -> throw e
    promise.fulfill(10)
    child.thrown Other, -> done()
    child.thrown Test, -> done()

  it 'correctly chains on .error', (done) ->
    e = new Error
    promise = new Deferred
    chained = promise.then(-> throw e).error().then().then()
    promise.fulfill(10)
    chained.error (error) ->
      expect(error).to.be e
      done()

  it 'chains through on the .then errback if a rejection is returned', (done) ->
    e = new Error
    promise = new Deferred
    failed = new Deferred
    failed.reject(10)
    chained = promise.then(-> throw e).then(null, -> failed)
    promise.fulfill(10)
    chained.then null, (error) ->
      expect(error).to.be 10
      done()

  it 'chains errors through on .error if a rejection is returned', (done) ->
    e = new Error
    promise = new Deferred
    failed = new Deferred
    failed.reject(10)
    chained = promise.then(-> throw e).error(-> failed)
    promise.fulfill(10)
    chained.error (error) ->
      expect(error).to.be 10
      done()

  describe '.inspect', ->
    describe '.value', ->
      it 'returns an object that contains the synchronous value of the deferred', ->
        promise.fulfill(10)
        inspection = promise.inspect()
        expect(inspection.value()).to.be 10
      it 'throws if there was an error', (done) ->
        promise.reject(1)
        try
          promise.inspect().value()
        catch e
          done()

    describe '.error', ->
      it 'contains the error if the promise rejected', ->
        promise.reject(10)
        inspection = promise.inspect()
        expect(inspection.error()).to.be 10
      it 'throws if the promise fulfilled', (done) ->
        promise.fulfill(1)
        try
          promise.inspect().error()
        catch e
          done()

    describe '.isFulfilled', ->
      it 'returns true if the deferred fulfilled', ->
        promise.fulfill(10)
        expect(promise.inspect().isFulfilled()).to.be true
      it 'returns false if the deferred rejected', ->
        promise.reject(10)
        expect(promise.inspect().isFulfilled()).to.be false
      it 'returns false if the deferred is still pending', ->
        expect(promise.inspect().isFulfilled()).to.be false

    describe '.isRejected', ->
      it 'returns true if the deferred rejected', ->
        promise.reject(10)
        expect(promise.inspect().isRejected()).to.be true
      it 'returns false if the deferred fulfilled', ->
        promise.fulfill(10)
        expect(promise.inspect().isRejected()).to.be false
      it 'returns false if the deferred is still pending', ->
        expect(promise.inspect().isFulfilled()).to.be false

    describe '.isThrown', ->
      it 'returns true if the deferred threw', (done) ->
        child = promise.then -> throw new Error
        promise.fulfill(10)
        child.thrown ->
          expect(child.inspect().isThrown()).to.be true
          done()
      it 'returns false if the deferred fulfilled', ->
        promise.fulfill(10)
        expect(promise.inspect().isThrown()).to.be false
      it 'returns false if the deferred is still pending', ->
        child = promise.then ->
        expect(child.inspect().isThrown()).to.be false
