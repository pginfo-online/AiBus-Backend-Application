/**
 * PhonePe Webhook Simulator for Testing
 *
 * Usage:
 *   node scripts/simulateWebhook.js --status success --txn TXN-AI-123456
 *   node scripts/simulateWebhook.js --status reject  --txn TXN-AI-123456
 */

require('dotenv').config();
const crypto = require('crypto');
const http = require('http');

// Configuration (defaults match backend .env)
const PORT = process.env.PORT || 3009;
const HOST = process.env.HOST || 'localhost';
const SALT_KEY = process.env.PHONEPE_CLIENT_SECRET || 'OTNhYTFlNjYtNjY1Mi00YzlmLWJiZDQtZDg5YmVhMWQyNWQz';
const SALT_INDEX = process.env.PHONEPE_CLIENT_VERSION || '1';

// Parse command line arguments
const args = process.argv.slice(2);
let status = 'success';
let merchantTxnId = '';
let amount = 1050; // In INR

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--status' && args[i + 1]) {
    status = args[i + 1].toLowerCase();
    i++;
  } else if (args[i] === '--txn' && args[i + 1]) {
    merchantTxnId = args[i + 1];
    i++;
  } else if (args[i] === '--amount' && args[i + 1]) {
    amount = parseFloat(args[i + 1]);
    i++;
  }
}

if (!merchantTxnId) {
  console.log('⚠️  No --txn provided. Using dummy transaction ID: TXN-TEST-123456');
  merchantTxnId = 'TXN-TEST-123456';
}

const isSuccess = status === 'success';

// 1. Construct raw PhonePe response object
const payload = {
  success: isSuccess,
  code: isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_DECLINED',
  message: isSuccess ? 'Payment Successful' : 'Payment Declined by Bank',
  data: {
    merchantId: 'PGTESTPAYUAT',
    merchantTransactionId: merchantTxnId,
    transactionId: `GATEWAY-${Date.now()}`,
    amount: Math.round(amount * 100), // In paise
    state: isSuccess ? 'COMPLETED' : 'FAILED',
    responseCode: isSuccess ? 'SUCCESS' : 'PAYMENT_DECLINED',
    paymentInstrument: {
      type: 'UPI',
      utr: `UTR${Date.now()}`,
    },
  },
};

// 2. Base64 encode payload
const jsonString = JSON.stringify(payload);
const base64Response = Buffer.from(jsonString).toString('base64');

// 3. Compute X-VERIFY signature: SHA256(base64Response + saltKey) + "###" + saltIndex
const hash = crypto.createHash('sha256').update(base64Response + SALT_KEY).digest('hex');
const xVerify = `${hash}###${SALT_INDEX}`;

// 4. Request body
const requestBody = JSON.stringify({
  response: base64Response,
});

console.log('====================================================');
console.log(`🚀 Sending PhonePe Webhook [${isSuccess ? 'SUCCESS' : 'REJECT'}]`);
console.log('====================================================');
console.log(`URL: http://${HOST}:${PORT}/api/v1/payments/webhook`);
console.log(`Merchant Transaction ID: ${merchantTxnId}`);
console.log(`Event Code: ${payload.code}`);
console.log(`X-VERIFY Header: ${xVerify}`);
console.log('----------------------------------------------------');

const options = {
  hostname: HOST,
  port: PORT,
  path: '/api/v1/payments/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody),
    'X-VERIFY': xVerify,
  },
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log(`Response Status: ${res.statusCode} ${res.statusMessage}`);
    try {
      const parsed = JSON.parse(responseData);
      console.log('Response Body:', JSON.stringify(parsed, null, 2));
    } catch {
      console.log('Response Body:', responseData);
    }
    console.log('====================================================');
    if (res.statusCode === 200) {
      console.log('✅ Webhook processed successfully!');
      if (isSuccess) {
        console.log('👉 Booking should now be CONFIRMED with digital ticket issued.');
      } else {
        console.log('👉 Payment and booking should now be marked FAILED.');
      }
    } else {
      console.log('❌ Webhook was rejected or encountered an error.');
    }
  });
});

req.on('error', (err) => {
  console.error(`❌ Connection error: ${err.message}`);
  console.log('Make sure backend server is running on port ' + PORT);
});

req.write(requestBody);
req.end();
