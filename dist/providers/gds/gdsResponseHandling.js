"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installGdsResponseHandling = installGdsResponseHandling;
const axios_1 = __importDefault(require("axios"));
const errors_1 = require("../../shared/errors");
function installGdsResponseHandling(client) {
    client.interceptors.response.use((response) => {
        if (response.data?.success === false || response.data?.Error) {
            throw new errors_1.ProviderError('GDS', 'Partner rejected the request');
        }
        return response;
    }, async (error) => {
        if (!axios_1.default.isAxiosError(error) || !error.config)
            throw error;
        const config = error.config;
        const status = error.response?.status;
        const transient = status === 502 || status === 503 || status === 504
            || error.code === 'ECONNRESET' || error.code === 'EAI_AGAIN';
        if (config.method !== 'get' || !transient || config.gdsRetry)
            throw error;
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 150));
        return client.request({ ...config, gdsRetry: true });
    });
}
//# sourceMappingURL=gdsResponseHandling.js.map