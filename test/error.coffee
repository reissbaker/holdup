holdup = require('../index')
expect = require('expect.js')

describe 'holdup errors', ->
  describe 'that are caught', ->
    beforeEach -> holdup.resetErrors()

    it 'do not emit an error event', (done) ->
      promise = holdup.ferr -> 'reason'
      promise.then null, ->
      holdup.once 'error', -> done()
      done()

    it 'in chains do not emit an error event', (done) ->
      promise = holdup.ferr -> 'reason'
      promise.then().then().then null, ->
      holdup.once 'error', -> done()
      done()

  describe 'that are uncaught', ->
    beforeEach -> holdup.resetErrors()

    it 'emits an error event', (done) ->
      promise = holdup.ferr -> 'reason'
      holdup.once 'error', -> done()

    it 'passes the error event to the handler', (done) ->
      promise = holdup.ferr -> 'reason'
      holdup.once 'error', (err) ->
        expect(err).to.be 'reason'
        done()

    it 'passes multiple errors to the handler', (done) ->
      holdup.ferr -> 'reason'
      holdup.ferr -> 'because'
      called = false

      holdup.on 'error', (err) ->
        expect(err).to.be('reason') unless called
        expect(err).to.be('because') if called
        done() if called
        holdup.resetErrors() if called
        called = true

    describe 'and chained', ->
      it 'emit an error event', (done) ->
        promise = holdup.ferr -> 'reason'
        promise.then().then().then()
        holdup.once 'error', -> done()


  describe 'that are thrown and caught', ->
    beforeEach -> holdup.resetErrors()

    it 'do not emit an error event', (done) ->
      promise = holdup.fcall -> throw 'reason'
      promise.thrown ->
      holdup.once 'thrown', -> done()
      done()

    it 'emit an error event if only caught by rejection handler', (done) ->
      promise = holdup.fcall -> throw 'reason'
      promise.error ->
      holdup.once 'thrown', -> done()

  describe 'that are thrown and uncaught', ->
    it 'emit an error event', (done) ->
      holdup.fcall -> throw 'reason'
      holdup.once 'thrown', -> done()

    describe 'and chained', ->
      it 'emit an error event', (done) ->
        promise = holdup.fcall -> throw 'reason'
        promise.then().then().then()
        holdup.once 'thrown', -> done()
