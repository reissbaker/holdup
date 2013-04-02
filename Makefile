##
# Tests
# -----

TESTS = test/
REPORTER = dot
SLOW = 300
TIMEOUT = 600

##
# Colors
# ------

NO_COLOR=\x1b[0m
OK_COLOR=\x1b[32;01m
ERROR_COLOR=\x1b[31;01m
WARN_COLOR=\x1b[33;01m

##
# Built Files
# -----------

build/package.js:
	mkdir -p build
	cat lib/client-package.js lib/promise.js lib/dependency.js > $@

build/package.min.js: build/package.js
	./node_modules/.bin/uglifyjs \
		-m \
		-c warnings=false,unsafe=true \
		$< > $@

build/package.min.js.gz: build/package.min.js
	gzip -c $< > $@


##
# Commands
# --------

.PHONY: build-test
build-test:
	@rm -f test/*.js
	@node_modules/.bin/coffee -c $(TESTS)

.PHONY: run-test
run-test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--slow $(SLOW) \
		--timeout $(TIMEOUT) \
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

.PHONY: rebuild
rebuild:
	@make clean && make build
	@echo "$(OK_COLOR)\nSuccess! Built:$(NO_COLOR)"
	@make sizes
