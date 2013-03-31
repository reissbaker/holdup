TESTS = test/
REPORTER = dot
SLOW = 600


build/package.js:
	mkdir -p build
	cat lib/client-package.js lib/promise.js lib/dependency.js > $@

build/package.min.js: build/package.js
	./node_modules/.bin/uglifyjs \
		-m sort=true \
		-c warnings=false,unsafe=true,hoist_vars=true \
		$< > $@

build/package.min.js.gz: build/package.min.js
	gzip -c $< > $@

.PHONY: build-test
build-test:
	@rm -f test/*.js
	@node_modules/.bin/coffee -c $(TESTS)

.PHONY: run-test
run-test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--slow $(SLOW) \
		$(TESTS)

.PHONY: test
test: build-test run-test

.PHONY: build
build: build/package.js build/package.min.js build/package.min.js.gz

.PHONY: clean
clean:
	rm -rf build/

.PHONY: sizes
sizes:
	ls -l build/
