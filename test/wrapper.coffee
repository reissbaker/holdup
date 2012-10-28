expect = require 'expect.js'
{Promise} = require '../lib/promise'
promise = require '../lib/wrapper'

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

  it 'should fail when the async function errors out', (done) ->
    fn = (callback) -> callback 'failure'
    wrapped = promise.make null, fn
    wrapped.then null, (err) ->
      expect(err).to.be 'failure'
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
    expect(c.unfulfilled()).to.be true

    c.then ->
      expect(ran).to.be true
      done()
    a.fulfill()
    ran = true
    b.fulfill()

  it 'should fail as soon as any of the composed promises fail', (done) ->
    a = new Promise
    b = new Promise
    c = promise.compose a, b

    c.then null, -> done()
    a.fail()

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
