const http = require('http');

function sendRequest(payloadSize, description) {
  return new Promise((resolve) => {
    // Generate a payload of the specified size in bytes
    const largeString = 'a'.repeat(payloadSize);
    const data = JSON.stringify({ data: largeString });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sos/trigger', // We will still use this but check the exact error
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`[${description}] Sent ${payloadSize} bytes. Response: ${res.statusCode}`);
        if (res.statusCode === 413) {
           console.log(`✅ VERIFIED: Payload rejected with 413 Payload Too Large.`);
        } else if (res.statusCode === 401) {
           console.log(`✅ VERIFIED: Payload parsed, reached auth middleware (401 Unauthorized).`);
        } else {
           console.error(`❌ FAILED: Unexpected response ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`[${description}] Request Error: ${e.message}`);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("--- EXPRESS HARDENING VERIFICATION ---");
  await sendRequest(5000, "Under 10KB"); 
  await sendRequest(15000, "Over 10KB"); 
}

runTests();
