/* eslint-env node, mocha */
/* global PerformanceObserver, Metric, chai */

const assert = chai.assert;

/* eslint-disable */
function loadAnalytics() {
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m);
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
  ga('create', 'UA-XXXXX-Y', 'auto');
}
/* eslint-enable */

loadAnalytics();

describe('appmetrics.js', function() {
  const METRIC_NAME = 'test_metric';
  const metric = new Metric(METRIC_NAME);

  function isAnalyticsRequest(entry) {
    return entry.name.includes('/collect') && entry.name.includes('t=timing');
  }

  if (!window.PerformanceObserver) {
    throw Error('Cannot run tests in a browser PerformanceObserver');
  }

  before(function() {
    if (!location.origin.includes('localhost')) {
      assert.fail(false, true, 'Tests need to be run from a web server.');
    }
    // loadAnalytics();
  });

  beforeEach(function() {

  });

  describe('init', function() {
    it('constructor fails without name', function() {
      assert.throws(function test() {
        return new Metric();
      });
    });
    it('name is correct', function() {
      assert.equal(metric.name, 'test_metric');
    });
    it('.duration returns -1 before start of recording', function() {
      assert.equal(metric.duration, -1);
    });
    it('has correct feature detection', function() {
      assert.equal(Metric.supportsPerfNow, true);
      assert.equal(Metric.supportsPerfMark, true);
    });
    it('has private properties', function() {
      assert.isUndefined(metric._start);
      assert.isUndefined(metric._end);
    });
  });

  describe('start()', function() {
    it('creates a mark', function(done) {
      const observer = new PerformanceObserver(list => {
        observer.disconnect();

        const entries = list.getEntriesByName(`mark_${METRIC_NAME}_start`);
        assert.equal(entries[0].entryType, 'mark', 'not a mark entry');
        assert.equal(entries.length, 1);

        done();
      });
      observer.observe({entryTypes: ['mark']});

      assert.instanceOf(metric.start(), Metric);
    });

    it('can call again without issue', function() {
      assert.instanceOf(metric.start(), Metric, 'Attempt to call start() again');
      assert.equal(metric.duration, -1, 'duration should not be populated yet');

      // TODO: capture and test console.warn output.
    });
  });

  describe('end()', function() {
    it('creates a mark', function(done) {
      const observer = new PerformanceObserver(list => {
        observer.disconnect();

        const markEntries = list.getEntriesByName(`mark_${METRIC_NAME}_end`);
        assert.equal(markEntries.length, 1);
        assert.equal(markEntries[0].entryType, 'mark', 'not a mark entry');

        const measureEntries = list.getEntriesByName(METRIC_NAME);
        assert.equal(measureEntries[0].entryType, 'measure', 'not a measurement entry');
        assert.equal(measureEntries.length, 1);

        done();
      });
      observer.observe({entryTypes: ['mark', 'measure']});

      assert.instanceOf(metric.end(), Metric);
    });

    it('can call again without issue', function() {
      assert.instanceOf(metric.end(), Metric, 'Attempt to call end() again');
      assert.notEqual(metric.duration, -1, 'duration should be populated');

      // TODO: capture and test console.warn output.
    });
  });

  describe('log()', function() {
    it('can be chained', function() {
      assert.instanceOf(metric.log(), Metric);
    });

    // TODO: capture and test console.info output.
  });

  describe('logAll()', function() {
    it('can be chained', function() {
      assert.instanceOf(metric.logAll(), Metric);
    });

    // TODO: capture and test console.info output.
  });

  describe('sendToAnalytics()', function() {
    let spy;
    beforeEach(() => {
      spy = sinon.spy(window, 'ga');
    });
    afterEach(() => {
      spy.restore();
    });
    it('sends default request', function() {
      metric.sendToAnalytics('category_name');
      assert(spy.calledWith('send', 'timing', 'category_name', metric.name, Math.round(metric.duration)));
    });

    it('can override duration and name', function() {
      metric.sendToAnalytics('category_name', 'metric_name', 1234567890);
      assert(spy.calledWith('send', 'timing', 'category_name', 'metric_name', 1234567890));
    });

    it('can send a duration without measuring', function() {
      const duration = Date.now();
      const metric = new Metric('override_duration');
      metric.sendToAnalytics('category_name', metric.name, duration);
      assert(spy.calledWith('send', 'timing', 'category_name', metric.name, duration));
    });

    it('no requests are to GA before a measurement', function() {
      const metric = new Metric('test_metric');
      metric.sendToAnalytics('should_not_be_sent');
      assert(spy.notCalled);
    });
  });
});
