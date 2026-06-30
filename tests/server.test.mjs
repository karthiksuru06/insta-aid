import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.mjs'; // server.mjs exports a *named* `app`

test('Server boots and responds to the health check', async () => {
  const response = await request(app).get('/health');
  assert.strictEqual(response.status, 200);
  // /health returns the plain text "OK" (not JSON).
  assert.strictEqual(response.text, 'OK');
});

test('Public test endpoint returns JSON', async () => {
  const response = await request(app).get('/api/test');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.success, true);
});

test('Admin endpoint rejects unauthenticated requests (401)', async () => {
  const response = await request(app).post('/api/admin/set-claim').send({});
  // verifyToken runs first and rejects the missing Bearer token.
  assert.strictEqual(response.status, 401);
});

test('Unknown route does not crash the server', async () => {
  const response = await request(app).get('/no/such/route');
  assert.ok(response.status >= 400 && response.status < 500);
});

test('Tracking relay: register requires auth (401)', async () => {
  const response = await request(app).post('/api/tracking/register').send({ token: 'abc' });
  // verifyToken rejects the missing Bearer token before any Firestore access.
  assert.strictEqual(response.status, 401);
});

test('Tracking relay: location update rejects missing token/secret (400)', async () => {
  const response = await request(app).post('/api/tracking/location').send({ latitude: 12.9, longitude: 77.6 });
  assert.strictEqual(response.status, 400);
});

test('Tracking relay: location update rejects invalid coordinates (400)', async () => {
  const response = await request(app)
    .post('/api/tracking/location')
    .send({ token: 'abc', secret: 'def', latitude: 999, longitude: 0 });
  assert.strictEqual(response.status, 400);
});

test('Tracking relay: end rejects missing fields (400)', async () => {
  const response = await request(app).post('/api/tracking/end').send({});
  assert.strictEqual(response.status, 400);
});
