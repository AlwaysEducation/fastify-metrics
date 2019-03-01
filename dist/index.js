"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const client = __importStar(require("prom-client"));
const fastifyMetricsPlugin = function fastifyMetrics(fastify, { enableDefaultMetrics = true, groupStatusCodes = false, pluginName = 'metrics', interval = 5000, blacklist, register, prefix, endpoint, metrics = {}, } = {}, next) {
    const plugin = { client };
    if (enableDefaultMetrics) {
        const collectMetricsForUrl = (url) => {
            const queryIndex = url.indexOf('?');
            url = queryIndex === -1 ? url : url.substring(0, queryIndex);
            if (!blacklist) {
                return true;
            }
            if (Array.isArray(blacklist)) {
                return blacklist.indexOf(url) === -1;
            }
            if (typeof blacklist === 'string') {
                return blacklist !== url;
            }
            if (typeof blacklist.test === 'function') {
                return !blacklist.test(url);
            }
            return false;
        };
        const defaultOpts = {
            timeout: interval,
        };
        const opts = {
            histogram: {
                name: 'http_request_duration_seconds',
                help: 'request duration in seconds',
                labelNames: ['status_code', 'method', 'route'],
                buckets: [0.05, 0.1, 0.5, 1, 3, 5, 10],
            },
            summary: {
                name: 'http_request_summary_seconds',
                help: 'request duration in seconds summary',
                labelNames: ['status_code', 'method', 'route'],
                percentiles: [0.5, 0.9, 0.95, 0.99],
            },
        };
        if (register) {
            plugin.clearRegister = register.clear;
            defaultOpts.register = register;
            opts.histogram.registers = [register];
            opts.summary.registers = [register];
        }
        if (prefix) {
            defaultOpts.prefix = prefix;
            opts.histogram.name = `${prefix}${opts.histogram.name}`;
            opts.summary.name = `${prefix}${opts.summary.name}`;
        }
        Object.keys(metrics)
            .filter(opts.hasOwnProperty)
            .forEach((key) => {
            Object.assign(opts[key], metrics[key]);
        });
        client.collectDefaultMetrics(defaultOpts);
        const routeHist = new client.Histogram(opts.histogram);
        const routeSum = new client.Summary(opts.summary);
        if (endpoint) {
            fastify.route({
                url: endpoint,
                method: 'GET',
                schema: { hide: true },
                handler: (_, reply) => {
                    const data = register
                        ? register.metrics()
                        : client.register.metrics();
                    reply.type('text/plain').send(data);
                },
            });
        }
        fastify.addHook('onRequest', (request, _, next) => {
            if (request.url && collectMetricsForUrl(request.url)) {
                request.metrics = {
                    hist: routeHist.startTimer(),
                    sum: routeSum.startTimer(),
                };
            }
            next();
        });
        fastify.addHook('onSend', function (request, reply, _, next) {
            if (request.raw.metrics) {
                let routeId = reply.context.config.url || request.raw.url;
                if (reply.context.config.statsId) {
                    routeId = reply.context.config.statsId;
                }
                const method = request.raw.method;
                const statusCode = groupStatusCodes
                    ? `${Math.floor(reply.res.statusCode / 100)}xx`
                    : reply.res.statusCode;
                request.raw.metrics.sum({
                    method: method || 'UNKNOWN',
                    route: routeId,
                    status_code: statusCode,
                });
                request.raw.metrics.hist({
                    method: method || 'UNKNOWN',
                    route: routeId,
                    status_code: statusCode,
                });
            }
            next();
        });
    }
    fastify.decorate(pluginName, plugin);
    next();
};
module.exports = fastify_plugin_1.default(fastifyMetricsPlugin, {
    fastify: '>=1.0.0',
    name: 'fastify-metrics',
});
//# sourceMappingURL=index.js.map