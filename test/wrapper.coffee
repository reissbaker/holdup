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

describe 'promise.compose', ->
  it 'should compose two promises into a single one', (done) ->
    ran = false
    a = new Promise
    b = new Promise
    c = promise.compose a, b
    expect(c.pending()).to.be true

    c.then ->
      expect(ran).to.be true
      done()
    a.fulfill()
    ran = true
    b.fulfill()

  it 'should reject as soon as any of the composed promises reject', (done) ->
    a = new Promise
    b = new Promise
    c = promise.compose a, b

    c.then null, -> done()
    a.reject()

  it 'should compose more than two promises into one', (done) ->
    ran = false
    a = new Promise
    b = new Promise
    c = new Promise
    d = promise.compose a, b, c

    d.then ->
      expect(ran).to.be true
      done()

    a.fulfill()
    b.fulfill()
    ran = true
    c.fulfill()

  it 'should flatten any arrays of promises passed into it', (done) ->
    ran = false
    a = [new Promise, new Promise]
    b = [new Promise]
    c = new Promise
    d = promise.compose a, b, c
    d.then ->
      expect(ran).to.be true
      done()

    c.fulfill()
    a[0].fulfill()
    a[1].fulfill()
    ran = true
    b[0].fulfill()

  it 'should pass the first error given to it to the composed errback', (done) ->
    a = new Promise
    b = new Promise
    c = promise.compose a, b
    c.then null, (err) ->
      expect(err).to.be 'error'
      done()
    a.reject 'error'

  it 'should pass the data the promises receive into the composed callback as an array', (done) ->
    a = new Promise
    b = new Promise
    c = promise.compose a, b
    c.then (data) ->
      expect(data[0]).to.be 1
      expect(data[1]).to.be 10
      done()
    a.fulfill 1
    b.fulfill 10

  it 'should pass the data the promises receive in order of the promises', (done) ->
    a = new Promise
    b = new Promise
    c = promise.compose a, b
    c.then (data) ->
      expect(data[0]).to.be 1
      expect(data[1]).to.be 10
      done()

    b.fulfill 10
    a.fulfill 1


describe 'promise.wait', ->
  it 'should pass the first error given to it to the composed errback', (done) ->
    a = new Promise
    b = new Promise
    c = promise.wait a, b
    c.then null, (err) ->
      expect(err).to.be 'err'
      done()
    a.reject 'err'

  it 'should pass the composed arguments as an argument list to the callback', (done) ->
    a = new Promise
    b = new Promise
    c = new Promise
    d = promise.wait a, b, c
    d.then (a, b, c) ->
      expect(a).to.be 1
      expect(b).to.be 10
      expect(c).to.be 50
      done()
    a.fulfill 1
    b.fulfill 10
    c.fulfill 50

  it 'should pass the composed arguments in the order of the promises', (done) ->
    a = new Promise
    b = new Promise
    c = promise.wait a, b
    c.then (a, b) ->
      expect(a).to.be 1
      expect(b).to.be 10
      done()
    b.fulfill 10
    a.fulfill 1
