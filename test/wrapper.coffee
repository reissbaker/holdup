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


describe 'promise.make', ->
  it 'should wrap Node-style async functions with no arguments', (done) ->
    fn = (callback) -> callback(null, 10)
    wrapped = promise.make null, fn
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'should wrap Node-style async functions with one argument', (done) ->
    fn = (test, callback) ->
      expect(test).to.be 10
      callback null, test
    wrapped = promise.make null, fn, 10
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'should wrap Node-style async functions with multiple arguments', (done) ->
    fn = (a, b, callback) -> callback null, [a, b]
    wrapped = promise.make null, fn, 5, 10
    wrapped.then (data) ->
      expect(data[0]).to.be 5
      expect(data[1]).to.be 10
      done()

  it 'should reject when the async function errors out', (done) ->
    fn = (callback) -> callback 'rejecture'
    wrapped = promise.make null, fn
    wrapped.then null, (err) ->
      expect(err).to.be 'rejecture'
      done()

  it 'should call functions with the given scope', (done) ->
    test =
      a: 10
      b: (callback) -> callback null, @a
    wrapped = promise.make test, test.b
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
