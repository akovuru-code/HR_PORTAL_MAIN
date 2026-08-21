const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

const testToken = jwt.sign({ id: 1, email: 'test@example.com' }, 'changeme', { expiresIn: '1h' });

describe('Onboarding Submission Validation', () => {
    it('should return 400 if required fields are missing', async () => {
        const res = await request(app)
            .post('/api/onboarding/submit/1') // adjust ID if needed
            .set('Authorization', `Bearer ${testToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors.length).toBeGreaterThan(0);
    });
});
