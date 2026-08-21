const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index'); // or wherever your Express app is exported from

// Generate a test token with the same secret as your middleware
const testToken = jwt.sign(
  { id: 1, email: 'test@example.com' },
  'changeme', // match with auth.js fallback secret
  { expiresIn: '1h' }
);

describe('Request Edit Validation', () => {
  it('should fail if reason is missing', async () => {
    const res = await request(app)
      .post('/api/onboarding/request-edit') // make sure this is the correct route
      .set('Authorization', `Bearer ${testToken}`)
      .send({}); // Missing reason field

    expect(res.statusCode).toBe(400); // validation should fail
    expect(res.body.errors).toBeDefined();
  });
});
