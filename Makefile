TESTS = test/
REPORTER = dot
SLOW = 600

build-test:
	@rm -f test/*.js
	@node_modules/.bin/coffee -c $(TESTS)

run-test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--slow $(SLOW) \
		$(TESTS)

test: build-test run-test

.PHONY: test
