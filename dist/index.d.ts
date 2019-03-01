/// <reference types="node" />
import { Plugin } from 'fastify';
import * as http from 'http';
import { labelValues } from 'prom-client';
import { PluginOptions, FastifyMetrics } from './plugin';
declare module 'fastify' {
    interface FastifyInstance<HttpServer = http.Server, HttpRequest = http.IncomingMessage, HttpResponse = http.ServerResponse> {
        metrics: FastifyMetrics;
    }
    interface RouteSchema {
        hide?: boolean;
    }
}
declare module 'http' {
    interface IncomingMessage {
        metrics?: {
            hist: (labels?: labelValues) => void;
            sum: (labels?: labelValues) => void;
        };
    }
}
declare const _default: Plugin<http.Server, http.IncomingMessage, http.ServerResponse, PluginOptions>;
export = _default;
