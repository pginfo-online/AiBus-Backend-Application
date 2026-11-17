"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRedirect = paymentRedirect;
const env_1 = require("../../config/env");
function paymentRedirect(value) {
    if (!value)
        return 'aibus://payment-result';
    try {
        const url = new URL(value);
        if (url.protocol === 'aibus:' && url.hostname === 'payment-result')
            return url.toString();
        const origins = env_1.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter((s) => s !== '*');
        if ((url.protocol === 'https:' || (env_1.env.NODE_ENV !== 'production' && url.protocol === 'http:')) && origins.includes(url.origin) && url.pathname === '/payment-result')
            return url.toString();
    }
    catch { /* Return to the application rather than an untrusted redirect destination. */ }
    return 'aibus://payment-result';
}
//# sourceMappingURL=paymentRedirect.js.map