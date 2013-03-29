expect = require 'expect.js'
{Promise} = require '../lib/promise'
promise = require '../lib/wrapper'

describe 'promise.all', ->
  it 'should wait for one promise to run', (done) ->
    fired = false
    initial = new Promise
    initial.then ->
      fired = true
    composed = promise.all initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.fulfill()

  it 'should error if it\'s one promise errors', (done) ->
    initial = new Promise
    composed = promise.all initial
    composed.then null, -> done()
    initial.reject()

  it 'should return the rejected promise', (done) ->
    initial = new Promise
    composed = promise.all initial
    composed.then null, (rejected) ->
      expect(rejected).to.be initial
      done()
    initial.reject()

  it 'should wait for multiple promises to fulfill', (done) ->
    lastFired = false
    a = new Promise
    b = new Promise
    b.then -> lastFired = true
    composed = promise.all a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.fulfill()
    b.fulfill()

  it 'should immediately reject if any fail', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.all a, b
    composed.then null, -> done()
    b.reject()

  it 'should return the first rejected promise', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.all a, b
    composed.then null, (rejected) ->
      expect(rejected).to.be b
      done()
    b.reject()
    a.reject()

describe 'promise.none', ->
  it 'should wait for one promise to be rejected', (done) ->
    fired = false
    initial = new Promise
    initial.then null, ->
      fired = true
    composed = promise.none initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.reject()

  it 'should error if it\'s one promise fulfills', (done) ->
    initial = new Promise
    composed = promise.none initial
    composed.then null, -> done()
    initial.fulfill()

  it 'should return the fulfilled promise when rejecting', (done) ->
    initial = new Promise
    composed = promise.none initial
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.be initial
      done()
    initial.fulfill()

  it 'should wait for multiple promises to reject', (done) ->
    lastFired = false
    a = new Promise
    b = new Promise
    b.then null, -> lastFired = true
    composed = promise.none a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.reject()
    b.reject()

  it 'should immediately reject if any fulfill', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.none a, b
    composed.then null, -> done()
    b.fulfill()

  it 'should return the first fulfilled promise', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.none a, b
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.be b
      done()
    b.fulfill()
    a.fulfill()


describe 'promise.any', ->
  it 'should wait for one promise to fulfill', (done) ->
    fired = false
    initial = new Promise
    initial.then -> fired = true
    composed = promise.any initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.fulfill()
  
  it 'should wait for one promise to reject', (done) ->
    fired = false
    initial = new Promise
    initial.then null, -> fired = true
    composed = promise.any initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.reject()
  
  it 'should wait for multiple promises to fulfill', (done) ->
    lastFired = false
    a = new Promise
    b = new Promise
    b.then -> lastFired = true
    composed = promise.any a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.fulfill()
    b.fulfill()

  it 'should wait for multiple promises to reject', (done) ->
    lastFired = false
    a = new Promise
    b = new Promise
    b.then null, -> lastFired = true
    composed = promise.any a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.reject()
    b.reject()

  it 'should wait for a mixture of fulfillment and rejection', (done) ->
    lastFired = false
    a = new Promise
    b = new Promise
    b.then -> lastFired = true
    composed = promise.any a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.reject()
    b.fulfill()
  
  it 'should pass the lists of fulfilled and rejected promises', (done) ->
    a = new Promise
    b = new Promise
    c = new Promise
    d = new Promise
    composed = promise.any a, b, c ,d
    composed.then (fulfilled, rejected) ->
      expect(fulfilled).to.eql [a, b]
      expect(rejected).to.eql [c, d]
      done()
    a.fulfill()
    c.reject()
    b.fulfill()
    d.reject()


describe 'promise.firstFulfilled', ->
  it 'should fulfill as soon as any have fulfilled', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.firstFulfilled a, b
    composed.then -> done()
    a.fulfill()

  it 'should fulfill even if one rejects', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.firstFulfilled a, b
    composed.then -> done()
    a.reject()
    b.fulfill()

  it 'should reject if all reject', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.firstFulfilled a, b
    composed.then null, -> done()
    a.reject()
    b.reject()

  it 'should pass the first to fulfill to its callback', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.firstFulfilled a, b
    composed.then (winner) ->
      expect(winner).to.be a
      done()
    a.fulfill()

  it 'should pass all fulfilled promises to its errback', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.firstFulfilled a, b
    composed.then null, (rejected) ->
      expect(rejected).to.eql [a, b]
      done()
    a.reject()
    b.reject()


describe 'promise.firstRejected', ->
  it 'should fulfill as soon as any have rejected', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.firstRejected a, b
    composed.then -> done()
    a.reject()

  it 'should fulfill even if one fulfills', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.firstRejected a, b
    composed.then -> done()
    b.fulfill()
    a.reject()

  it 'should reject if all fulfill', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.firstRejected a, b
    composed.then null, -> done()
    a.fulfill()
    b.fulfill()

  it 'should pass the first to reject to its callback', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.firstRejected a, b
    composed.then (winner) ->
      expect(winner).to.be a
      done()
    a.reject()

  it 'should pass all fulfilled promises to its errback', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.firstRejected a, b
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.eql [a, b]
      done()
    a.fulfill()
    b.fulfill()

describe 'promise.lastFulfilled', ->
  it 'should pass the last fulfilled promise to its callback', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.lastFulfilled a, b
    composed.then (last) ->
      expect(last).to.be b
      done()
    a.fulfill()
    b.fulfill()
  
  it 'should reject if all reject', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.lastFulfilled a, b
    composed.then null, -> done()
    a.reject()
    b.reject()

  it 'should pass all rejected promises to its errback', (done) ->
    a = new Promise
    b = new Promise
    composed = promise.lastFulfilled a, b
    composed.then null, (rejected) ->
      expect(rejected).to.eql [a, b]
      done()
    a.reject()
    b.reject()

  it 'should fulfill even if some reject', (done) ->
    a = new Promise
    b = new Promise
    c = new Promise
    d = new Promise
    first = promise.lastFulfilled a, b
    first.then (last) -> expect(last).to.be a
    a.fulfill()
    b.reject()
    second = promise.lastFulfilled c, d
    second.then (last) -> expect(last).to.be d
    c.reject()
    d.fulfill()

    promise.all(first, second).then -> done()



describe 'promise.lastRejected', ->



describe 'promise.wrap', ->
  it 'should wrap Node-style async functions with no arguments', (done) ->
    fn = (callback) -> callback(null, 10)
    wrapped = promise.wrap null, fn
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'should wrap Node-style async functions with one argument', (done) ->
    fn = (test, callback) ->
      expect(test).to.be 10
      callback null, test
    wrapped = promise.wrap null, fn, 10
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'should wrap Node-style async functions with multiple arguments', (done) ->
    fn = (a, b, callback) -> callback null, [a, b]
    wrapped = promise.wrap null, fn, 5, 10
    wrapped.then (data) ->
      expect(data[0]).to.be 5
      expect(data[1]).to.be 10
      done()

  it 'should reject when the async function errors out', (done) ->
    fn = (callback) -> callback 'rejecture'
    wrapped = promise.wrap null, fn
    wrapped.then null, (err) ->
      expect(err).to.be 'rejecture'
      done()

  it 'should call functions with the given scope', (done) ->
    test =
      a: 10
      b: (callback) -> callback null, @a
    wrapped = promise.wrap test, test.b
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

describe 'promise.timeout', ->
  it 'should fire callbacks asynchronously', (done) ->
    async = false
    timed = promise.timeout 50
    timed.then ->
      expect(async).to.be true
      done()
    async = true

  it 'should fire timers in order', (done) ->
    called = false
    timed = promise.timeout 100
    timed.then ->
      expect(called).to.be true
      done()
    setTimeout ->
      called = true
    , 10
