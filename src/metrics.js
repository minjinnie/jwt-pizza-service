const config = require('./config');
const os = require('os');

class MetricBuilder {
  constructor() {
    this.metrics = [];
  }

  addMetrics(metricName, source, type, unit) {
    Object.keys(source).forEach((key) => {
      this.addNewMetric(metricName, source[key], type, unit, { key });
    });
  }

  addNewMetric(metricName, metricValue, type, unit, attributes) {
    const value = (!metricValue || isNaN(metricValue)) ? 0 : metricValue;
    this.metrics.push(getSingleMetric(metricName, value, type, unit, attributes));
  }

  getAllMetrics() {
    return getMetricsBody(...this.metrics);
  }
}

const requests = {};
const authentication = {};
const pizzas = {};
const latency = {};
const chaos = {};

function track(endpoint) {
  return (req, res, next) => {
    updateMetric(requests, endpoint);
    next();
  };
}

function trackFail() {
  return (err, req, res, next) => {
    updateMetric(authentication, 'fail');
    next(err);
  }
}

function trackSuccess() {
  updateMetric(authentication, 'success');
  console.log(`[METRICS] Authentication SUCCESS`);
}

function trackActive(active) {
  updateMetric(authentication, 'active', (active ? 1 : -1));
}

function trackPizza(metric, value) {
  updateMetric(pizzas, metric, value);
}

function trackLatency(key, time) {
  latency[key] = [...(latency[key] ?? []), time];
}

function updateMetric(metric, key, value) {
  metric[key] = (metric[key] || 0) + (value ?? 1);
}

function trackChaosFail() {
  updateMetric(chaos, 'fail');
}


function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const builder = new MetricBuilder();

    builder.addMetrics('requests', requests, 'sum', '1');
    builder.addMetrics('authentication', authentication, 'sum', '1');
    builder.addNewMetric('cpu', getCpuUsagePercentage(), 'gauge', '%');
    builder.addNewMetric('memory', getMemoryUsagePercentage(), 'gauge', '%');
    builder.addMetrics('pizzas', pizzas, 'sum', '1');
    builder.addMetrics('chaos_failures_total', chaos, 'sum', '1');

    Object.keys(latency).forEach((key) => {
      const list = latency[key] ?? [];
      const avg = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : 0;
      builder.addNewMetric('latency_milliseconds_total', avg, 'sum', 'ms', { key });
      latency[key] = [];
    });

    sendToGrafana(builder.getAllMetrics(), 'all');
  }, 1000);
}

function getMetricsBody(...allMetrics) {
  return {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: allMetrics
          },
        ],
      },
    ],
  };
}

function getSingleMetric(metricName, metricValue, type, unit, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    name: metricName,
    unit: unit,
    [type]: {
      dataPoints: [
        {
          asDouble: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: Object.entries(attributes).map(([key, value]) => ({
            key,
            value: { stringValue: value }
          })),
        },
      ]
    },
  };

  if (type === 'sum') {
    metric[type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric[type].isMonotonic = true;
  }

  return metric;
}

function sendToGrafana(metric, metricName) {
  const body = JSON.stringify(metric);

  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body,
    headers: {
      Authorization: `Bearer ${config.metrics.apiKey}`,
      'Content-Type': 'application/json'
    },
  })
    .then((response) => {
      if (!response.ok) {
        if (typeof response.text === 'function') {
          response.text().then((text) => {
            console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
          });
        } else {
          console.error('Failed to push metrics data to Grafana: Unknown error');
        }
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = {
  track,
  trackSuccess,
  trackFail,
  trackActive,
  trackPizza,
  trackLatency,
  trackChaosFail
};
