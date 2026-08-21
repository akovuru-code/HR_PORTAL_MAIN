const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

const testToken = jwt.sign({ id: 1, email: 'test@example.com' }, 'changeme', { expiresIn: '1h' });

describe('Partial Save', () => {
  it('should return 200 on valid partial save', async () => {
    const res = await request(app)
      .post('/api/onboarding/save') // adjust if needed
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        payload: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Saved');
  });
});
