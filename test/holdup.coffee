expect = require 'expect.js'
holdup = require '../index.js'
{Deferred} = holdup

describe 'holdup.all', ->
  it 'should fulfill if no promises are passed', (done) ->
    composed = holdup.all []
    composed.then -> done()

  it 'should wait for one promise to run', (done) ->
    fired = false
    initial = new Deferred
    initial.then ->
      fired = true
    composed = holdup.all initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.fulfill()

  it 'should error if its one promise errors', (done) ->
    initial = new Deferred
    composed = holdup.all initial
    composed.then null, -> done()
    initial.reject()

  it 'should return the rejected promise', (done) ->
    initial = new Deferred
    composed = holdup.all initial
    composed.then null, (rejected) ->
      expect(rejected).to.be initial
      done()
    initial.reject()

  it 'should wait for multiple promises to fulfill', (done) ->
    lastFired = false
    a = new Deferred
    b = new Deferred
    b.then -> lastFired = true
    composed = holdup.all a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.fulfill()
    b.fulfill()

  it 'should immediately reject if any fail', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.all a, b
    composed.then null, -> done()
    b.reject()

  it 'should return the fulfilled promises', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.all a, b
    composed.then (fulfilled) ->
      expect(fulfilled).to.eql [a, b]
      done()
    a.fulfill()
    b.fulfill()

  it 'should return the first rejected promise', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.all a, b
    composed.then null, (rejected) ->
      expect(rejected).to.be b
      done()
    b.reject()
    a.reject()

  it 'should work for any number of promises', (done) ->
    a = new Deferred
    one = holdup.all a
    a.fulfill()

    b = new Deferred
    c = new Deferred
    d = new Deferred
    three = holdup.all b, c, d
    b.fulfill()
    c.fulfill()
    d.fulfill()

    holdup.all(one, three).then -> done()

  it 'should work for promises that are already fulfilled', (done) ->
    a = new Deferred
    b = new Deferred
    a.fulfill()
    b.fulfill()
    composed = holdup.all a, b
    composed.then -> done()

  it 'should work for promises that are already rejected', (done) ->
    a = new Deferred
    b = new Deferred
    a.reject()
    holdup.all(a, b).then null, -> done()

describe 'holdup.none', ->
  it 'should fulfill if no promises are passed', (done) ->
    composed = holdup.none []
    composed.then -> done()

  it 'should wait for one promise to be rejected', (done) ->
    fired = false
    initial = new Deferred
    initial.then null, ->
      fired = true
    composed = holdup.none initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.reject()

  it 'should error if its one promise fulfills', (done) ->
    initial = new Deferred
    composed = holdup.none initial
    composed.then null, -> done()
    initial.fulfill()

  it 'should return the rejected promises when fulfilled', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.none a, b
    composed.then (rejected) ->
      expect(rejected).to.eql [a, b]
      done()
    a.reject()
    b.reject()

  it 'should return the fulfilled promise when rejecting', (done) ->
    initial = new Deferred
    composed = holdup.none initial
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.be initial
      done()
    initial.fulfill()

  it 'should wait for multiple promises to reject', (done) ->
    lastFired = false
    a = new Deferred
    b = new Deferred
    b.then null, -> lastFired = true
    composed = holdup.none a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.reject()
    b.reject()

  it 'should immediately reject if any fulfill', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.none a, b
    composed.then null, -> done()
    b.fulfill()

  it 'should return the first fulfilled promise', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.none a, b
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.be b
      done()
    b.fulfill()
    a.fulfill()

  it 'should work for any number of promises', (done) ->
    a = new Deferred
    one = holdup.none a
    a.reject()

    b = new Deferred
    c = new Deferred
    d = new Deferred
    three = holdup.none b, c, d
    b.reject()
    c.reject()
    d.reject()

    holdup.all(one, three).then -> done()

  it 'should work for promises that are already fulfilled', (done) ->
    a = new Deferred
    b = new Deferred
    a.fulfill()
    holdup.none(a, b).then null, -> done()

  it 'should work for promises that are already rejected', (done) ->
    a = new Deferred
    b = new Deferred
    a.reject()
    b.reject()
    holdup.none(a, b).then -> done()

describe 'holdup.resolved', ->
  it 'should fulfill if no promises are passed', (done) ->
    composed = holdup.resolved []
    composed.then -> done()

  it 'should wait for one promise to fulfill', (done) ->
    fired = false
    initial = new Deferred
    initial.then -> fired = true
    composed = holdup.resolved initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.fulfill()

  it 'should wait for one promise to reject', (done) ->
    fired = false
    initial = new Deferred
    initial.then null, -> fired = true
    composed = holdup.resolved initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.reject()

  it 'should wait for multiple promises to fulfill', (done) ->
    lastFired = false
    a = new Deferred
    b = new Deferred
    b.then -> lastFired = true
    composed = holdup.resolved a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.fulfill()
    b.fulfill()

  it 'should wait for multiple promises to reject', (done) ->
    lastFired = false
    a = new Deferred
    b = new Deferred
    b.then null, -> lastFired = true
    composed = holdup.resolved a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.reject()
    b.reject()

  it 'should wait for a mixture of fulfillment and rejection', (done) ->
    lastFired = false
    a = new Deferred
    b = new Deferred
    b.then -> lastFired = true
    composed = holdup.resolved a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.reject()
    b.fulfill()

  it 'should pass the lists of fulfilled and rejected promises', (done) ->
    a = new Deferred
    b = new Deferred
    c = new Deferred
    d = new Deferred
    composed = holdup.resolved a, b, c ,d
    composed.then (fulfilled, rejected) ->
      expect(fulfilled).to.eql [a, b]
      expect(rejected).to.eql [c, d]
      done()
    a.fulfill()
    c.reject()
    b.fulfill()
    d.reject()

  it 'should work for any number of promises', (done) ->
    a = new Deferred
    oneFulfill = holdup.resolved a
    oneFulfill.then (fulfilled, rejected) ->
      expect(fulfilled).to.eql [a]
      expect(rejected).to.eql []
    a.fulfill()

    b = new Deferred
    oneReject = holdup.resolved b
    oneReject.then (fulfilled, rejected) ->
      expect(rejected).to.eql [b]
      expect(fulfilled).to.eql []
    b.reject()

    c = new Deferred
    d = new Deferred
    e = new Deferred
    three = holdup.resolved c, d, e
    three.then (fulfilled, rejected) ->
      expect(fulfilled).to.eql [c, d]
      expect(rejected).to.eql [e]
    c.fulfill()
    d.fulfill()
    e.reject()

    holdup.all(oneFulfill, oneReject, three).then -> done()

  it 'should work for promises that are already fulfilled', (done) ->
    a = new Deferred
    b = new Deferred
    a.fulfill()
    b.fulfill()
    holdup.resolved(a, b).then -> done()

  it 'should work for promises that are already rejected', (done) ->
    a = new Deferred
    b = new Deferred
    a.reject()
    b.reject()
    holdup.resolved(a, b).then -> done()

  it 'should work for promises that are a mixture pre-fulfilled and pre-rejected', (done) ->
    a = new Deferred
    b = new Deferred
    a.reject()
    b.fulfill()
    holdup.resolved(a, b).then -> done()

describe 'holdup.firstFulfilled', ->
  it 'should fulfill as soon as any have fulfilled', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstFulfilled a, b
    composed.then -> done()
    a.fulfill()

  it 'should fulfill even if one rejects', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstFulfilled a, b
    composed.then -> done()
    a.reject()
    b.fulfill()

  it 'should reject if all reject', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstFulfilled a, b
    composed.then null, -> done()
    a.reject()
    b.reject()

  it 'should pass the first to fulfill to its callback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstFulfilled a, b
    composed.then (winner) ->
      expect(winner).to.be a
      done()
    a.fulfill()

  it 'should pass all fulfilled promises to its errback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstFulfilled a, b
    composed.then null, (rejected) ->
      expect(rejected).to.eql [a, b]
      done()
    a.reject()
    b.reject()

  it 'should work with any number of promises', (done) ->
    a = new Deferred
    one = holdup.firstFulfilled a
    one.then (first) -> expect(first).to.be a
    a.fulfill()

    b = new Deferred
    c = new Deferred
    d = new Deferred
    three = holdup.firstFulfilled b, c, d
    three.then (first) -> expect(first).to.be b
    b.fulfill()

    holdup.all(one, three).then -> done()


describe 'holdup.firstRejected', ->
  it 'should fulfill as soon as any have rejected', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstRejected a, b
    composed.then -> done()
    a.reject()

  it 'should fulfill even if one fulfills', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstRejected a, b
    composed.then -> done()
    b.fulfill()
    a.reject()

  it 'should reject if all fulfill', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstRejected a, b
    composed.then null, -> done()
    a.fulfill()
    b.fulfill()

  it 'should pass the first to reject to its callback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstRejected a, b
    composed.then (winner) ->
      expect(winner).to.be a
      done()
    a.reject()

  it 'should pass all fulfilled promises to its errback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstRejected a, b
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.eql [a, b]
      done()
    a.fulfill()
    b.fulfill()

  it 'should work with any number of promises', (done) ->
    a = new Deferred
    one = holdup.firstRejected a
    one.then (first) -> expect(first).to.be a
    a.reject()

    b = new Deferred
    c = new Deferred
    d = new Deferred
    three = holdup.firstRejected b, c, d
    three.then (first) -> expect(first).to.be b
    b.reject()

    holdup.all(one, three).then -> done()


describe 'holdup.lastFulfilled', ->
  it 'should pass the last fulfilled promise to its callback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastFulfilled a, b
    composed.then (last) ->
      expect(last).to.be b
      done()
    a.fulfill()
    b.fulfill()

  it 'should reject if all reject', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastFulfilled a, b
    composed.then null, -> done()
    a.reject()
    b.reject()

  it 'should pass all rejected promises to its errback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastFulfilled a, b
    composed.then null, (rejected) ->
      expect(rejected).to.eql [a, b]
      done()
    a.reject()
    b.reject()

  it 'should fulfill even if some reject', (done) ->
    a = new Deferred
    b = new Deferred
    c = new Deferred
    d = new Deferred
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
    a = new Deferred
    one = holdup.lastFulfilled a
    one.then (last) -> expect(last).to.be a
    a.fulfill()

    b = new Deferred
    c = new Deferred
    d = new Deferred
    three = holdup.lastFulfilled b, c, d
    three.then (last) -> expect(last).to.be d
    b.fulfill()
    c.fulfill()
    d.fulfill()

    holdup.all(one, three).then -> done()


describe 'holdup.lastRejected', ->
  it 'should pass the last rejected promise to its callback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastRejected a, b
    composed.then (last) ->
      expect(last).to.be b
      done()
    a.reject()
    b.reject()

  it 'should reject if all fulfill', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastRejected a, b
    composed.then null, -> done()
    a.fulfill()
    b.fulfill()

  it 'should pass fulfilled callbacks to its errback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastRejected a, b
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.eql [a, b]
      done()
    a.fulfill()
    b.fulfill()

  it 'should fulfill even if some fulfill', (done) ->
    # If the promise is the first to reject
    a = new Deferred
    b = new Deferred
    first = holdup.lastRejected a, b
    first.then (last) -> expect(last).to.be a
    a.reject()
    b.fulfill()

    # If the promise isn't the first to reject
    c = new Deferred
    d = new Deferred
    second = holdup.lastRejected c, d
    second.then (last) -> expect(last).to.be d
    c.fulfill()
    d.reject()

    holdup.all(first, second).then -> done()

  it 'should work with any number of promises', (done) ->
    a = new Deferred
    one = holdup.lastRejected a
    one.then (last) -> expect(last).to.be a
    a.reject()

    b = new Deferred
    c = new Deferred
    d = new Deferred
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


describe 'holdup.nfapply', ->
  it 'should wrap Node-style functions', (done) ->
    fn = (callback) -> callback(null, 10)
    wrapped = holdup.nfapply fn, []
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'should pass its array of arguments to the Node-style function as args', (done) ->
    fn = (a, b, callback) ->
      expect(a).to.eql [10]
      expect(b).to.be 'c'
      callback(null, 100)
    wrapped = holdup.nfapply fn, [[10], 'c']
    wrapped.then (data) ->
      expect(data).to.be 100
      done()

  it 'rejects when the async function errors out', (done) ->
    fn = (callback) -> callback('reject')
    wrapped = holdup.nfapply fn, []
    wrapped.then null, (err) ->
      expect(err).to.be 'reject'
      done()



describe 'holdup.napply', ->
  it 'uses the given scope as the this arg', (done) ->
    scope = {}
    fn = (a, b, callback) ->
      expect(a).to.eql [10]
      expect(b).to.be 'b'
      expect(this).to.be scope
      callback(null, 100)

    wrapped = holdup.napply scope, fn, [[10], 'b']
    wrapped.then (data) ->
      expect(data).to.be 100
      done()



describe 'holdup.nfcall', ->
  it 'should wrap Node-style async functions with no arguments', (done) ->
    fn = (callback) -> callback(null, 10)
    wrapped = holdup.nfcall fn
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'should wrap Node-style async functions with one argument', (done) ->
    fn = (test, callback) ->
      expect(test).to.be 10
      callback null, test
    wrapped = holdup.nfcall fn, 10
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'should wrap Node-style async functions with multiple arguments', (done) ->
    fn = (a, b, callback) -> callback null, [a, b]
    wrapped = holdup.nfcall fn, 5, 10
    wrapped.then (data) ->
      expect(data[0]).to.be 5
      expect(data[1]).to.be 10
      done()

  it 'should reject when the async function errors out', (done) ->
    fn = (callback) -> callback 'rejection'
    wrapped = holdup.nfcall fn
    wrapped.then null, (err) ->
      expect(err).to.be 'rejection'
      done()



describe 'holdup.ncall', ->
  it 'should call functions with the given scope', (done) ->
    test =
      a: 10
      b: (callback) -> callback null, @a
    wrapped = holdup.ncall test, test.b
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



describe 'holdup.data', ->
  it 'should collect all the data from fulfilled promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.data a, b, (aData, bData) ->
      expect(aData).to.be 5
      expect(bData).to.be 6
      done()
    a.fulfill 5
    b.fulfill 6

  it 'should keep original ordering', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.data a, b, (aData, bData) ->
      expect(aData).to.be 5
      expect(bData).to.be 6
      done()
    b.fulfill 6
    a.fulfill 5

  it 'should leave data from rejected promises as undefined', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.data a, b, (aData, bData) ->
      expect(aData).to.be undefined
      expect(bData).to.be undefined
      done()
    a.reject 'hi'
    b.reject 'there'

  it 'should work for mixtures of fulfilled and rejected promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.data a, b, (aData, bData) ->
      expect(aData).to.be undefined
      expect(bData).to.be 5
      done()
    a.reject 'hi'
    b.fulfill 5

  it 'should work with an array of promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.data [a, b], (aData, bData) ->
      expect(aData).to.be 5
      expect(bData).to.be 6
      done()
    a.fulfill 5
    b.fulfill 6



describe 'holdup.errors', ->
  it 'should collect all the errors from rejected promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.errors a, b, (aError, bError) ->
      expect(aError).to.be 'hi'
      expect(bError).to.be 'there'
      done()
    a.reject 'hi'
    b.reject 'there'

  it 'should keep original ordering', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.errors a, b, (aError, bError) ->
      expect(aError).to.be 5
      expect(bError).to.be 6
      done()
    b.reject 6
    a.reject 5

  it 'should leave data from fulfilled promises as undefined', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.errors a, b, (aError, bError) ->
      expect(aError).to.be undefined
      expect(bError).to.be undefined
      done()
    a.fulfill 5
    b.fulfill 6

  it 'should work for a mixture of fulfilled and rejected promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.errors a, b, (aError, bError) ->
      expect(aError).to.be undefined
      expect(bError).to.be 5
      done()
    a.fulfill 6
    b.reject 5

  it 'should work with an array of promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.errors [a, b], (aError, bError) ->
      expect(aError).to.be 5
      expect(bError).to.be 6
      done()
    a.reject 5
    b.reject 6



describe 'holdup.invert', ->
  it 'should turn a fulfill into a reject', (done) ->
    a = new Deferred
    b = holdup.invert a
    b.then null, -> done()
    a.fulfill()

  it 'should turn a reject into a fulfill', (done) ->
    a = new Deferred
    b = holdup.invert a
    b.then -> done()
    a.reject()

  it 'should forward data to errors', (done) ->
    a = new Deferred
    b = holdup.invert a
    b.then null, (err) ->
      expect(err).to.be 5
      done()
    a.fulfill 5

  it 'should forward errors to data', (done) ->
    a = new Deferred
    b = holdup.invert a
    b.then (data) ->
      expect(data).to.be 5
      done()
    a.reject 5
