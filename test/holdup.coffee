expect = require 'expect.js'
holdup = require '../index.js'
{Deferred} = holdup

describe 'holdup.all', ->
  holdup.resetErrors()

  it 'fulfills if no promises are passed', (done) ->
    composed = holdup.all []
    composed.then -> done()

  it 'waits for one promise to run', (done) ->
    fired = false
    initial = new Deferred
    initial.then ->
      fired = true
    composed = holdup.all initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.fulfill()

  it 'errors if its one promise errors', (done) ->
    initial = new Deferred
    composed = holdup.all initial
    composed.then null, -> done()
    initial.reject()

  it 'returns the rejected error', (done) ->
    initial = new Deferred
    composed = holdup.all initial
    err = new Error
    composed.then null, (e) ->
      expect(e).to.be err
      done()
    initial.reject(err)

  it 'waits for multiple promises to fulfill', (done) ->
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

  it 'immediately rejects if any fail', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.all a, b
    composed.then null, -> done()
    b.reject()

  it 'returns the fulfilled data', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.all a, b
    composed.then (fulfilled) ->
      expect(fulfilled).to.eql [10, 11]
      done()
    a.fulfill(10)
    b.fulfill(11)

  it 'returns the first rejected error', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.all a, b
    composed.then null, (err) ->
      expect(err).to.be 10
      done()
    b.reject(10)
    a.reject(11)

  it 'works for any number of promises', (done) ->
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

  it 'works for promises that are already fulfilled', (done) ->
    a = new Deferred
    b = new Deferred
    a.fulfill()
    b.fulfill()
    composed = holdup.all a, b
    composed.then -> done()

  it 'works for promises that are already rejected', (done) ->
    a = new Deferred
    b = new Deferred
    a.reject()
    holdup.all(a, b).then null, -> done()



describe 'holdup.none', ->
  it 'fulfills if no promises are passed', (done) ->
    composed = holdup.none []
    composed.then -> done()

  it 'waits for one promise to be rejected', (done) ->
    fired = false
    initial = new Deferred
    initial.then null, ->
      fired = true
    composed = holdup.none initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.reject()

  it 'errors if its one promise fulfills', (done) ->
    initial = new Deferred
    composed = holdup.none initial
    composed.then null, -> done()
    initial.fulfill()

  it 'returns the rejected error when fulfilled', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.none a, b
    composed.then (errs) ->
      expect(errs).to.eql [10, 11]
      done()
    a.reject(10)
    b.reject(11)

  it 'returns the errors in the order that the original promises were passed', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.none b, a
    composed.then (errs) ->
      expect(errs).to.eql [11, 10]
      done()
    a.reject(10)
    b.reject(11)

  it 'returns the fulfilled data when rejecting', (done) ->
    initial = new Deferred
    composed = holdup.none initial
    composed.then null, (data) ->
      expect(data).to.be 10
      done()
    initial.fulfill(10)

  it 'waits for multiple promises to reject', (done) ->
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

  it 'immediately rejects if any fulfill', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.none a, b
    composed.then null, -> done()
    b.fulfill()

  it 'returns the first fulfilled data', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.none a, b
    composed.then null, (data) ->
      expect(data).to.be 10
      done()
    b.fulfill(10)
    a.fulfill(11)

  it 'works for any number of promises', (done) ->
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

    holdup.none(one, three).error -> done()

  it 'works for promises that are already fulfilled', (done) ->
    a = new Deferred
    b = new Deferred
    a.fulfill()
    holdup.none(a, b).then null, -> done()

  it 'works for promises that are already rejected', (done) ->
    a = new Deferred
    b = new Deferred
    a.reject()
    b.reject()
    holdup.none(a, b).then -> done()



describe 'holdup.settled', ->
  it 'fulfills if no promises are passed', (done) ->
    composed = holdup.settled []
    composed.then -> done()

  it 'waits for one promise to fulfill', (done) ->
    fired = false
    initial = new Deferred
    initial.then -> fired = true
    composed = holdup.settled initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.fulfill()

  it 'waits for one promise to reject', (done) ->
    fired = false
    initial = new Deferred
    initial.then null, -> fired = true
    composed = holdup.settled initial
    composed.then ->
      expect(fired).to.be.ok()
      done()
    initial.reject()

  it 'waits for multiple promises to fulfill', (done) ->
    lastFired = false
    a = new Deferred
    b = new Deferred
    b.then -> lastFired = true
    composed = holdup.settled a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.fulfill()
    b.fulfill()

  it 'waits for multiple promises to reject', (done) ->
    lastFired = false
    a = new Deferred
    b = new Deferred
    b.then null, -> lastFired = true
    composed = holdup.settled a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.reject()
    b.reject()

  it 'waits for a mixture of fulfillment and rejection', (done) ->
    lastFired = false
    a = new Deferred
    b = new Deferred
    b.then -> lastFired = true
    composed = holdup.settled a, b
    composed.then ->
      expect(lastFired).to.be.ok()
      done()
    a.reject()
    b.fulfill()

  it 'passes the lists of fulfilled and rejected inspections', (done) ->
    a = new Deferred
    b = new Deferred
    c = new Deferred
    d = new Deferred
    composed = holdup.settled a, b, c ,d
    composed.then (inspections) ->
      expect(inspections[0].value()).to.be a.inspect().value()
      expect(inspections[1].value()).to.be b.inspect().value()
      expect(inspections[2].error()).to.be c.inspect().error()
      expect(inspections[3].error()).to.be d.inspect().error()
      done()
    a.fulfill(10)
    b.fulfill(12)
    c.reject(11)
    d.reject(13)

  it 'passes the inspections in the order the promises were passed in', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.settled(b,a)
    composed.then (inspections) ->
      expect(inspections[0].value()).to.be b.inspect().value()
      expect(inspections[1].value()).to.be a.inspect().value()
      done()
    a.fulfill(5)
    b.fulfill(10)

  it 'works for any number of promises', (done) ->
    a = new Deferred
    oneFulfill = holdup.settled a
    oneFulfill.then (inspections) ->
      expect(inspections[0].value()).to.be a.inspect().value()
    a.fulfill()

    b = new Deferred
    oneReject = holdup.settled b
    oneReject.then (inspections) ->
      expect(inspections[0].error()).to.be b.inspect().value()
    b.reject()

    c = new Deferred
    d = new Deferred
    e = new Deferred
    three = holdup.settled c, d, e
    three.then (inspections) ->
      expect(inspections[0].value()).to.be c.inspect().value()
      expect(inspections[1].value()).to.be d.inspect().value()
      expect(inspections[2].error()).to.be e.inspect().error()
    c.fulfill()
    d.fulfill()
    e.reject()

    holdup.all(oneFulfill, oneReject, three).then -> done()

  it 'works for promises that are already fulfilled', (done) ->
    a = new Deferred
    b = new Deferred
    a.fulfill()
    b.fulfill()
    holdup.settled(a, b).then -> done()

  it 'works for promises that are already rejected', (done) ->
    a = new Deferred
    b = new Deferred
    a.reject()
    b.reject()
    holdup.settled(a, b).then -> done()

  it 'works for promises that are a mixture pre-fulfilled and pre-rejected', (done) ->
    a = new Deferred
    b = new Deferred
    a.reject()
    b.fulfill()
    holdup.settled(a, b).then -> done()



describe 'holdup.firstValue', ->
  it 'fulfills as soon as any have fulfilled', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstValue a, b
    composed.then -> done()
    a.fulfill()

  it 'fulfills even if one rejects', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstValue a, b
    composed.then -> done()
    a.reject()
    b.fulfill()

  it 'rejects if all reject', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstValue a, b
    composed.then null, -> done()
    a.reject()
    b.reject()

  it 'passes the first value to fulfill to its callback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstValue a, b
    composed.then (winner) ->
      expect(winner).to.be a.inspect().value()
      done()
    a.fulfill(10)

  it 'passes all errors to its errback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstValue a, b
    composed.then null, (errs) ->
      expect(errs).to.eql [a.inspect().error(), b.inspect().error()]
      done()
    a.reject()
    b.reject()

  it 'works with any number of promises', (done) ->
    a = new Deferred
    one = holdup.firstValue a
    one.then (first) -> expect(first).to.be a.inspect().value()
    a.fulfill()

    b = new Deferred
    c = new Deferred
    d = new Deferred
    three = holdup.firstValue b, c, d
    three.then (first) -> expect(first).to.be b.inspect().value()
    b.fulfill()

    holdup.all(one, three).then -> done()



describe 'holdup.firstError', ->
  it 'fulfills as soon as any have rejected', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstError a, b
    composed.then -> done()
    a.reject()

  it 'fulfills even if one fulfills', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstError a, b
    composed.then -> done()
    b.fulfill()
    a.reject()

  it 'rejects if all fulfill', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstError a, b
    composed.then null, -> done()
    a.fulfill()
    b.fulfill()

  it 'passes the first error to its callback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstError a, b
    composed.then (winner) ->
      expect(winner).to.be a.inspect().error()
      done()
    a.reject()

  it 'passes all fulfilled values to its errback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.firstError a, b
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.eql [a.inspect().value(), b.inspect().value()]
      done()
    a.fulfill()
    b.fulfill()

  it 'works with any number of promises', (done) ->
    a = new Deferred
    one = holdup.firstError a
    one.then (first) -> expect(first).to.be a.inspect().error()
    a.reject()

    b = new Deferred
    c = new Deferred
    d = new Deferred
    three = holdup.firstError b, c, d
    three.then (first) -> expect(first).to.be b.inspect().error()
    b.reject()

    holdup.all(one, three).then -> done()



describe 'holdup.lastValue', ->
  it 'passes the last fulfilled value to its callback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastValue a, b
    composed.then (last) ->
      expect(last).to.be b.inspect().value()
      done()
    a.fulfill()
    b.fulfill()

  it 'rejects if all reject', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastValue a, b
    composed.then null, -> done()
    a.reject()
    b.reject()

  it 'passes all errors to its errback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastValue a, b
    composed.then null, (errs) ->
      expect(errs).to.eql [a.inspect().error(), b.inspect().error()]
      done()
    a.reject()
    b.reject()

  it 'fulfills even if some reject', (done) ->
    a = new Deferred
    b = new Deferred
    c = new Deferred
    d = new Deferred
    first = holdup.lastValue a, b
    first.then (last) -> expect(last).to.be a.inspect().value()
    a.fulfill()
    b.reject()
    second = holdup.lastValue c, d
    second.then (last) -> expect(last).to.be d.inspect().value()
    c.reject()
    d.fulfill()

    holdup.all(first, second).then -> done()

  it 'works with any number of promises', (done) ->
    a = new Deferred
    one = holdup.lastValue a
    one.then (last) -> expect(last).to.be a.inspect().value()
    a.fulfill()

    b = new Deferred
    c = new Deferred
    d = new Deferred
    three = holdup.lastValue b, c, d
    three.then (last) -> expect(last).to.be d.inspect().value()
    b.fulfill()
    c.fulfill()
    d.fulfill()

    holdup.all(one, three).then -> done()



describe 'holdup.lastError', ->
  it 'passes the last error to occur to its callback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastError a, b
    composed.then (last) ->
      expect(last).to.be b.inspect().error()
      done()
    a.reject()
    b.reject()

  it 'rejects if all fulfill', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastError a, b
    composed.then null, -> done()
    a.fulfill()
    b.fulfill()

  it 'passes fulfilled values to its errback', (done) ->
    a = new Deferred
    b = new Deferred
    composed = holdup.lastError a, b
    composed.then null, (fulfilled) ->
      expect(fulfilled).to.eql [a.inspect().value(), b.inspect().value()]
      done()
    a.fulfill()
    b.fulfill()

  it 'fulfills even if some fulfill', (done) ->
    # If the promise is the first to reject
    a = new Deferred
    b = new Deferred
    first = holdup.lastError a, b
    first.then (last) -> expect(last).to.be a.inspect().error()
    a.reject()
    b.fulfill()

    # If the promise isn't the first to reject
    c = new Deferred
    d = new Deferred
    second = holdup.lastError c, d
    second.then (last) -> expect(last).to.be d.inspect().error()
    c.fulfill()
    d.reject()

    holdup.all(first, second).then -> done()

  it 'works with any number of promises', (done) ->
    a = new Deferred
    one = holdup.lastError a
    one.then (last) -> expect(last).to.be a.inspect().error()
    a.reject()

    b = new Deferred
    c = new Deferred
    d = new Deferred
    three = holdup.lastError b, c, d
    three.then (last) -> expect(last).to.be d.inspect().error()
    b.reject()
    c.reject()
    d.reject()

    holdup.all(one, three).then -> done()



describe 'holdup.make', ->
  it 'creates a promise that is fulfilled when the fulfill callback is called', (done) ->
    promise = holdup.make (fulfill) -> fulfill()
    promise.then -> done()

  it 'passes the argument to fulfill to the then callback', (done) ->
    promise = holdup.make (fulfill) -> fulfill(10)
    promise.then (val) ->
      expect(val).to.be 10
      done()

  it 'creates a promise that is rejected when the reject callback is called', (done) ->
    promise = holdup.make (fulfill, reject) -> reject()
    promise.then null, -> done()

  it 'passes the argument to reject to the then errback', (done) ->
    promise = holdup.make (fulfill, reject) -> reject('because')
    promise.then null, (err) ->
      expect(err).to.be 'because'
      done()


describe 'holdup.fulfill', ->
  it 'creates a promise that fulfills to the given value', (done) ->
    promise = holdup.fulfill 10
    promise.then (val) ->
      expect(val).to.be 10
      done()



describe 'holdup.reject', ->
  it 'creates a promise that rejects with the given reason', (done) ->
    promise = holdup.reject 'because'
    promise.then null, (reason) ->
      expect(reason).to.be 'because'
      done()



describe 'holdup.fcall', ->
  it 'creates a promise that will fulfill to the given fn return value', (done) ->
    promise = holdup.fcall -> 10
    promise.then (val) ->
      expect(val).to.be 10
      done()


describe 'holdup.ferr', ->
  it 'creates a promise that will reject with the given fn return value', (done) ->
    promise = holdup.ferr -> 'because reasons'
    promise.then null, (err) ->
      expect(err).to.be 'because reasons'
      done()



describe 'holdup.nfapply', ->
  it 'wraps Node-style functions', (done) ->
    fn = (callback) -> callback(null, 10)
    wrapped = holdup.nfapply fn, []
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'passes its array of arguments to the Node-style function as args', (done) ->
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
  it 'wraps Node-style async functions with no arguments', (done) ->
    fn = (callback) -> callback(null, 10)
    wrapped = holdup.nfcall fn
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'wraps Node-style async functions with one argument', (done) ->
    fn = (test, callback) ->
      expect(test).to.be 10
      callback null, test
    wrapped = holdup.nfcall fn, 10
    wrapped.then (data) ->
      expect(data).to.be 10
      done()

  it 'wraps Node-style async functions with multiple arguments', (done) ->
    fn = (a, b, callback) -> callback null, [a, b]
    wrapped = holdup.nfcall fn, 5, 10
    wrapped.then (data) ->
      expect(data[0]).to.be 5
      expect(data[1]).to.be 10
      done()

  it 'rejects when the async function errors out', (done) ->
    fn = (callback) -> callback 'rejection'
    wrapped = holdup.nfcall fn
    wrapped.then null, (err) ->
      expect(err).to.be 'rejection'
      done()



describe 'holdup.ncall', ->
  it 'calls functions with the given scope', (done) ->
    test =
      a: 10
      b: (callback) -> callback null, @a
    wrapped = holdup.ncall test, test.b
    wrapped.then (data) ->
      expect(data).to.be 10
      done()



describe 'holdup.wait', ->
  it 'fires callbacks asynchronously', (done) ->
    async = false
    timed = holdup.wait 50
    timed.then ->
      expect(async).to.be true
      done()
    async = true

  it 'fires timers in order', (done) ->
    called = false
    timed = holdup.wait 100
    timed.then ->
      expect(called).to.be true
      done()
    setTimeout ->
      called = true
    , 10

  it 'passes the time back to the callback', (done) ->
    holdup.wait(100).then (time) ->
      expect(time).to.be 100
      done()



describe 'holdup.delay', ->
  it 'fires callbacks after a delay', (done) ->
    called = false
    promise = holdup.make (fulfill) -> fulfill(100)
    delayed = holdup.delay promise, 60
    delayed.then (data) ->
      called = true
      expect(data).to.eql 100
      done()
    promise.then ->
      expect(called).to.be false

  it 'rejects after a delay', (done) ->
    called = false
    promise = holdup.make (fulfill, reject) -> reject('err')
    delayed = holdup.delay promise, 60
    delayed.then null, (err) ->
      called = true
      expect(err).to.eql 'err'
      done()
    promise.then null, ->
      expect(called).to.be false



describe 'holdup.timeout', ->
  it 'fulfills as normal if the promise fulfills in time', (done) ->
    promise = holdup.make (fulfill) -> setTimeout (-> fulfill(100)), 50
    safe = holdup.timeout promise, 100
    safe.then (data) ->
      expect(data).to.be 100
      done()

  it 'rejects if the promise does not fulfill in time', (done) ->
    promise = holdup.make (fulfill) -> setTimeout (-> fulfill(100)), 100
    safe = holdup.timeout promise, 50
    safe.then null, (err) ->
      expect(err).to.be 'Error: 50ms timeout exceeded.'
      done()

  it 'rejects if the promise rejects', (done) ->
    promise = holdup.make (fulfill, reject) -> setTimeout (-> reject('err')), 50
    safe = holdup.timeout promise, 100
    safe.then null, (err) ->
      expect(err).to.be 'err'
      done()



describe 'holdup.spreadValues', ->
  it 'calls the callback by applying the promise\'s fulfilled value', (done) ->
    a = new Deferred
    a.fulfill([1, 2, 3])
    holdup.spreadValues a, (one, two, three) ->
      expect(one).to.be 1
      expect(two).to.be 2
      expect(three).to.be 3
      done()



describe 'holdup.spreadErrors', ->
  it 'calls the callback by applying the promise\'s rejection error', (done) ->
    a = new Deferred
    a.reject([1, 2, 3])
    holdup.spreadErrors a, (one, two, three) ->
      expect(one).to.be 1
      expect(two).to.be 2
      expect(three).to.be 3
      done()



describe 'holdup.data', ->
  it 'collects all the data from fulfilled promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.data a, b, (aData, bData) ->
      expect(aData).to.be 5
      expect(bData).to.be 6
      done()
    a.fulfill 5
    b.fulfill 6

  it 'keeps original ordering', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.data a, b, (aData, bData) ->
      expect(aData).to.be 5
      expect(bData).to.be 6
      done()
    b.fulfill 6
    a.fulfill 5

  it 'leaves data from rejected promises as undefined', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.data a, b, (aData, bData) ->
      expect(aData).to.be undefined
      expect(bData).to.be undefined
      done()
    a.reject 'hi'
    b.reject 'there'

  it 'works for mixtures of fulfilled and rejected promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.data a, b, (aData, bData) ->
      expect(aData).to.be undefined
      expect(bData).to.be 5
      done()
    a.reject 'hi'
    b.fulfill 5

  it 'works with an array of promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.data [a, b], (aData, bData) ->
      expect(aData).to.be 5
      expect(bData).to.be 6
      done()
    a.fulfill 5
    b.fulfill 6



describe 'holdup.errors', ->
  it 'collects all the errors from rejected promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.errors a, b, (aError, bError) ->
      expect(aError).to.be 'hi'
      expect(bError).to.be 'there'
      done()
    a.reject 'hi'
    b.reject 'there'

  it 'keeps original ordering', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.errors a, b, (aError, bError) ->
      expect(aError).to.be 5
      expect(bError).to.be 6
      done()
    b.reject 6
    a.reject 5

  it 'leaves data from fulfilled promises as undefined', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.errors a, b, (aError, bError) ->
      expect(aError).to.be undefined
      expect(bError).to.be undefined
      done()
    a.fulfill 5
    b.fulfill 6

  it 'works for a mixture of fulfilled and rejected promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.errors a, b, (aError, bError) ->
      expect(aError).to.be undefined
      expect(bError).to.be 5
      done()
    a.fulfill 6
    b.reject 5

  it 'works with an array of promises', (done) ->
    a = new Deferred
    b = new Deferred
    holdup.errors [a, b], (aError, bError) ->
      expect(aError).to.be 5
      expect(bError).to.be 6
      done()
    a.reject 5
    b.reject 6



describe 'holdup.invert', ->
  it 'turns a fulfill into a reject', (done) ->
    a = new Deferred
    b = holdup.invert a
    b.then null, -> done()
    a.fulfill()

  it 'turns a reject into a fulfill', (done) ->
    a = new Deferred
    b = holdup.invert a
    b.then -> done()
    a.reject()

  it 'forwards data to errors', (done) ->
    a = new Deferred
    b = holdup.invert a
    b.then null, (err) ->
      expect(err).to.be 5
      done()
    a.fulfill 5

  it 'forwards errors to data', (done) ->
    a = new Deferred
    b = holdup.invert a
    b.then (data) ->
      expect(data).to.be 5
      done()
    a.reject 5


describe 'holdup.npost', ->
  it 'calls the given Node-style method on the object', (done) ->
    obj =
      fn: (callback) -> callback(null, 10)
    promise = holdup.npost obj, 'fn', []
    promise.then (data) ->
      expect(data).to.be 10
      done()

  it 'passes the given array of arguments as the arg list', (done) ->
    obj =
      fn: (a, b, callback) ->
        expect(a).to.eql [10]
        expect(b).to.be 'b'
        callback(null, 100)
    promise = holdup.npost obj, 'fn', [[10], 'b']
    promise.then (data) ->
      expect(data).to.be 100
      done()

  it 'rejects when the method rejects', (done) ->
    obj =
      fn: (callback) -> callback('reject')
    promise = holdup.npost obj, 'fn', []
    promise.then null, (err) ->
      expect(err).to.be 'reject'
      done()

describe 'holdup.ninvoke', ->
  it 'calls the given Node-style method on the object', (done) ->
    obj =
      fn: (callback) -> callback(null, 10)
    promise = holdup.ninvoke obj, 'fn'
    promise.then (data) ->
      expect(data).to.be 10
      done()

  it 'passes the given args to the method', (done) ->
    obj =
      fn: (a, b, callback) ->
        expect(a).to.eql [10]
        expect(b).to.eql 'b'
        callback(null, 100)
    promise = holdup.ninvoke obj, 'fn', [10], 'b'
    promise.then (data) ->
      expect(data).to.be 100
      done()

  it 'rejects when the method errors out', (done) ->
    obj = fn: (callback) -> callback('reject')
    promise = holdup.ninvoke obj, 'fn'
    promise.then null, (err) ->
      expect(err).to.be 'reject'
      done()


describe 'holdup.nbind', ->
  it 'binds the Node-style function to the given scope', (done) ->
    scope = {}
    fn = (callback) ->
      expect(this).to.be scope
      callback(null, 100)
    converted = holdup.nbind fn, scope
    promise = converted()
    promise.then (data) ->
      expect(data).to.be 100
      done()

  it 'binds the given arguments', (done) ->
    scope = {}
    fn = (a, b, callback) ->
      expect(this).to.be scope
      expect(a).to.eql [10]
      expect(b).to.be 'b'
      callback(null, 100)
    converted = holdup.nbind fn, scope, [10], 'b'
    promise = converted()
    promise.then (data) ->
      expect(data).to.be 100
      done()

  it 'allows for currying', (done) ->
    scope = {}
    fn = (a, b, callback) ->
      expect(this).to.be scope
      expect(a).to.eql [10]
      expect(b).to.be 'b'
      callback(null, 100)

    converted = holdup.nbind fn, scope, [10]
    promise = converted('b')
    promise.then (data) ->
      expect(data).to.be 100
      done()

  it 'rejects when the function errors out', (done) ->
    fn = (callback) -> callback('reject')
    converted = holdup.nbind fn, null
    promise = converted()
    promise.then null, (err) ->
      expect(err).to.be 'reject'
      done()



describe 'holdup.nfbind', ->
  it 'binds arguments using currying, and doesn\'t need a scope', (done) ->
    fn = (a, b, callback) ->
      expect(a).to.eql [10]
      expect(b).to.be 'b'
      callback(null, 100)

    converted = holdup.nfbind fn, [10]
    promise = converted('b')
    promise.then (data) ->
      expect(data).to.be 100
      done()



describe 'holdup.nodeify', ->
  it 'calls the callback with the data when the promise fulfills', (done) ->
    promise = holdup.make (finish) -> finish(100)
    holdup.nodeify promise, (err, data) ->
      expect(data).to.be 100
      expect(err).to.be null
      done()

  it 'calls the callback the err when the promise rejects', (done) ->
    promise = holdup.make (fulfill, reject) -> reject('err')
    holdup.nodeify promise, (err, data) ->
      expect(err).to.be 'err'
      expect(data).to.be undefined
      done()
