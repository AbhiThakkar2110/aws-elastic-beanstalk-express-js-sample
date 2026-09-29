const request = require('supertest');
const app = require('../app');

describe('GET /', () => {
  test('returns HTTP 200 and Hello World message', async () => {
    const response = await request(app).get('/');

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Hello World!');
  });
});
