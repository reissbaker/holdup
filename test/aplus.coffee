adapter = require('./adapter')

describe 'Promises/A+ Tests', ->
  require('promises-aplus-tests').mocha(adapter)
