expect = require 'expect.js'
{Promise} = require '../lib/promise'
holdup = require '../lib/dependency'

describe 'holdup.all', ->
  it 'should wait for one promise to run', (done) ->
    fired = false
    initial = new Promise
    initial.then ->
      fired = true
    composed = holdup.all initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.fulfill()

  it 'should error if its one promise errors', (done) ->
    initial = new Promise
    composed = holdup.all initial
    composed.then null, -> done()
    initial.reject()

  it 'should return the rejected promise', (done) ->
    initial = new Promise
    composed = holdup.all initial
    composed.then null, (rejected) ->
      expect(rejected).to.be initial
      done()
    initial.reject()

  it 'should wait for multiple promises to fulfill', (done) ->
    lastFired = false
    a = new Promise
    b = new Promise
    b.then -> lastFired = true
    composed = holdup.all a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.fulfill()
    b.fulfill()

  it 'should immediately reject if any fail', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.all a, b
    composed.then null, -> done()
    b.reject()

  it 'should return the first rejected promise', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.all a, b
    composed.then null, (rejected) ->
      expect(rejected).to.be b
      done()
    b.reject()
    a.reject()

  it 'should work for any number of promises', (done) ->
    a = new Promise
    one = holdup.all a
    a.fulfill()

    b = new Promise
    c = new Promise
    d = new Promise
    three = holdup.all b, c, d
    b.fulfill()
    c.fulfill()
    d.fulfill()

    holdup.all(one, three).then -> done()

  it 'should work for promises that are already fulfilled', (done) ->
    a = new Promise
    b = new Promise
    a.fulfill()
    b.fulfill()
    composed = holdup.all a, b
    composed.then -> done()

  it 'should work for promises that are already rejected', (done) ->
    a = new Promise
    b = new Promise
    a.reject()
    holdup.all(a, b).then null, -> done()

describe 'holdup.none', ->
  it 'should wait for one promise to be rejected', (done) ->
    fired = false
    initial = new Promise
    initial.then null, ->
      fired = true
    composed = holdup.none initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.reject()

  it 'should error if its one promise fulfills', (done) ->
    initial = new Promise
    composed = holdup.none initial
    composed.then null, -> done()
    initial.fulfill()

  it 'should return the fulfilled promise when rejecting', (done) ->
    initial = new Promise
    composed = holdup.none initial
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.be initial
      done()
    initial.fulfill()

  it 'should wait for multiple promises to reject', (done) ->
    lastFired = false
    a = new Promise
    b = new Promise
    b.then null, -> lastFired = true
    composed = holdup.none a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.reject()
    b.reject()

  it 'should immediately reject if any fulfill', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.none a, b
    composed.then null, -> done()
    b.fulfill()

  it 'should return the first fulfilled promise', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.none a, b
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.be b
      done()
    b.fulfill()
    a.fulfill()

  it 'should work for any number of promises', (done) ->
    a = new Promise
    one = holdup.none a
    a.reject()

    b = new Promise
    c = new Promise
    d = new Promise
    three = holdup.none b, c, d
    b.reject()
    c.reject()
    d.reject()

    holdup.all(one, three).then -> done()

  it 'should work for promises that are already fulfilled', (done) ->
    a = new Promise
    b = new Promise
    a.fulfill()
    holdup.none(a, b).then null, -> done()

  it 'should work for promises that are already rejected', (done) ->
    a = new Promise
    b = new Promise
    a.reject()
    b.reject()
    holdup.none(a, b).then -> done()

describe 'holdup.any', ->
  it 'should wait for one promise to fulfill', (done) ->
    fired = false
    initial = new Promise
    initial.then -> fired = true
    composed = holdup.any initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.fulfill()
  
  it 'should wait for one promise to reject', (done) ->
    fired = false
    initial = new Promise
    initial.then null, -> fired = true
    composed = holdup.any initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.reject()
  
  it 'should wait for multiple promises to fulfill', (done) ->
    lastFired = false
    a = new Promise
    b = new Promise
    b.then -> lastFired = true
    composed = holdup.any a, b
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
    composed = holdup.any a, b
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
    composed = holdup.any a, b
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
    composed = holdup.any a, b, c ,d
    composed.then (fulfilled, rejected) ->
      expect(fulfilled).to.eql [a, b]
      expect(rejected).to.eql [c, d]
      done()
    a.fulfill()
    c.reject()
    b.fulfill()
    d.reject()

  it 'should work for any number of promises', (done) ->
    a = new Promise
    oneFulfill = holdup.any a
    oneFulfill.then (fulfilled, rejected) ->
      expect(fulfilled).to.eql [a]
      expect(rejected).to.eql []
    a.fulfill()

    b = new Promise
    oneReject = holdup.any b
    oneReject.then (fulfilled, rejected) ->
      expect(rejected).to.eql [b]
      expect(fulfilled).to.eql []
    b.reject()

    c = new Promise
    d = new Promise
    e = new Promise
    three = holdup.any c, d, e
    three.then (fulfilled, rejected) ->
      expect(fulfilled).to.eql [c, d]
      expect(rejected).to.eql [e]
    c.fulfill()
    d.fulfill()
    e.reject()

    holdup.all(oneFulfill, oneReject, three).then -> done()

  it 'should work for promises that are already fulfilled', (done) ->
    a = new Promise
    b = new Promise
    a.fulfill()
    b.fulfill()
    holdup.any(a, b).then -> done()

  it 'should work for promises that are already rejected', (done) ->
    a = new Promise
    b = new Promise
    a.reject()
    b.reject()
    holdup.any(a, b).then -> done()

  it 'should work for promises that are a mixture pre-fulfilled and pre-rejected', (done) ->
    a = new Promise
    b = new Promise
    a.reject()
    b.fulfill()
    holdup.any(a, b).then -> done()

describe 'holdup.firstFulfilled', ->
  it 'should fulfill as soon as any have fulfilled', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.firstFulfilled a, b
    composed.then -> done()
    a.fulfill()

  it 'should fulfill even if one rejects', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.firstFulfilled a, b
    composed.then -> done()
    a.reject()
    b.fulfill()

  it 'should reject if all reject', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.firstFulfilled a, b
    composed.then null, -> done()
    a.reject()
    b.reject()

  it 'should pass the first to fulfill to its callback', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.firstFulfilled a, b
    composed.then (winner) ->
      expect(winner).to.be a
      done()
    a.fulfill()

  it 'should pass all fulfilled promises to its errback', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.firstFulfilled a, b
    composed.then null, (rejected) ->
      expect(rejected).to.eql [a, b]
      done()
    a.reject()
    b.reject()

  it 'should work with any number of promises', (done) ->
    a = new Promise
    one = holdup.firstFulfilled a
    one.then (first) -> expect(first).to.be a
    a.fulfill()

    b = new Promise
    c = new Promise
    d = new Promise
    three = holdup.firstFulfilled b, c, d
    three.then (first) -> expect(first).to.be b
    b.fulfill()

    holdup.all(one, three).then -> done()


describe 'holdup.firstRejected', ->
  it 'should fulfill as soon as any have rejected', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.firstRejected a, b
    composed.then -> done()
    a.reject()

  it 'should fulfill even if one fulfills', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.firstRejected a, b
    composed.then -> done()
    b.fulfill()
    a.reject()

  it 'should reject if all fulfill', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.firstRejected a, b
    composed.then null, -> done()
    a.fulfill()
    b.fulfill()

  it 'should pass the first to reject to its callback', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.firstRejected a, b
    composed.then (winner) ->
      expect(winner).to.be a
      done()
    a.reject()

  it 'should pass all fulfilled promises to its errback', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.firstRejected a, b
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.eql [a, b]
      done()
    a.fulfill()
    b.fulfill()

  it 'should work with any number of promises', (done) ->
    a = new Promise
    one = holdup.firstRejected a
    one.then (first) -> expect(first).to.be a
    a.reject()

    b = new Promise
    c = new Promise
    d = new Promise
    three = holdup.firstRejected b, c, d
    three.then (first) -> expect(first).to.be b
    b.reject()

    holdup.all(one, three).then -> done()


describe 'holdup.lastFulfilled', ->
  it 'should pass the last fulfilled promise to its callback', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.lastFulfilled a, b
    composed.then (last) ->
      expect(last).to.be b
      done()
    a.fulfill()
    b.fulfill()
  
  it 'should reject if all reject', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.lastFulfilled a, b
    composed.then null, -> done()
    a.reject()
    b.reject()

  it 'should pass all rejected promises to its errback', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.lastFulfilled a, b
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
    first = holdup.lastFulfilled a, b
    first.then (last) -> expect(last).to.be a
    a.fulfill()
    b.reject()
    second = holdup.lastFulfilled c, d
    second.then (last) -> expect(last).to.be d
    c.reject()
    d.fulfill()

    holdup.all(first, second).then -> done()

  it 'should work with any number of promises', (done) ->
    a = new Promise
    one = holdup.lastFulfilled a
    one.then (last) -> expect(last).to.be a
    a.fulfill()

    b = new Promise
    c = new Promise
    d = new Promise
    three = holdup.lastFulfilled b, c, d
    three.then (last) -> expect(last).to.be d
    b.fulfill()
    c.fulfill()
    d.fulfill()

    holdup.all(one, three).then -> done()


describe 'holdup.lastRejected', ->
  it 'should pass the last rejected promise to its callback', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.lastRejected a, b
    composed.then (last) ->
      expect(last).to.be b
      done()
    a.reject()
    b.reject()

  it 'should reject if all fulfill', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.lastRejected a, b
    composed.then null, -> done()
    a.fulfill()
    b.fulfill()

  it 'should pass fulfilled callbacks to its errback', (done) ->
    a = new Promise
    b = new Promise
    composed = holdup.lastRejected a, b
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.eql [a, b]
      done()
    a.fulfill()
    b.fulfill()

  it 'should fulfill even if some fulfill', (done) ->
    # If the promise is the first to reject
    a = new Promise
    b = new Promise
    first = holdup.lastRejected a, b
    first.then (last) -> expect(last).to.be a
    a.reject()
    b.fulfill()

    # If the promise isn't the first to reject
    c = new Promise
    d = new Promise
    second = holdup.lastRejected c, d
    second.then (last) -> expect(last).to.be d
    c.fulfill()
    d.reject()

    holdup.all(first, second).then -> done()

  it 'should work with any number of promises', (done) ->
    a = new Promise
    one = holdup.lastRejected a
    one.then (last) -> expect(last).to.be a
    a.reject()

    b = new Promise
    c = new Promise
    d = new Promise
    three = holdup.lastRejected b, c, d
    three.then (last) -> expect(last).to.be d
    b.reject()
    c.reject()
    d.reject()

    holdup.all(one, three).then -> done()


describe 'holdup.make', ->
  it 'should create a promise that is fulfilled when the fulfill callback is called', (done) ->
    promise = holdup.make (fulfill) -> fulfill()
    promise.then -> done()

  it 'should create a promise that is rejected when the reject callback is called', (done) ->
    promise = holdup.make (fulfill, reject) -> reject()
    promise.then null, -> done()


describe 'holdup.wrap', ->
  it 'should wrap Node-style async functions with no arguments', (done) ->
    fn = (callback) -> callback(null, 10)
    wrapped = holdup.wrap null, fn
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'should wrap Node-style async functions with one argument', (done) ->
    fn = (test, callback) ->
      expect(test).to.be 10
      callback null, test
    wrapped = holdup.wrap null, fn, 10
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'should wrap Node-style async functions with multiple arguments', (done) ->
    fn = (a, b, callback) -> callback null, [a, b]
    wrapped = holdup.wrap null, fn, 5, 10
    wrapped.then (data) ->
      expect(data[0]).to.be 5
      expect(data[1]).to.be 10
      done()

  it 'should reject when the async function errors out', (done) ->
    fn = (callback) -> callback 'rejecture'
    wrapped = holdup.wrap null, fn
    wrapped.then null, (err) ->
      expect(err).to.be 'rejecture'
      done()

  it 'should call functions with the given scope', (done) ->
    test =
      a: 10
      b: (callback) -> callback null, @a
    wrapped = holdup.wrap test, test.b
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

describe 'holdup.timeout', ->
  it 'should fire callbacks asynchronously', (done) ->
    async = false
    timed = holdup.timeout 50
    timed.then ->
      expect(async).to.be true
      done()
    async = true

  it 'should fire timers in order', (done) ->
    called = false
    timed = holdup.timeout 100
    timed.then ->
      expect(called).to.be true
      done()
    setTimeout ->
      called = true
    , 10

  it 'should pass the time back to the callback', (done) ->
    holdup.timeout(100).then (time) ->
      expect(time).to.be 100
      done()
