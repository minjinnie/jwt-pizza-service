const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'test@auth.com', password: 'password123' };
let testUserAuthToken, testUserId;

beforeAll(async () => {
  // register a new user
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;

  expect(testUserAuthToken).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test('should update user info', async () => {
  const updatedData = { email: 'updated@test.com', password: 'newpassword' };

  const updateRes = await request(app)
    .put(`/api/auth/${testUserId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(updatedData);

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.email).toBe(updatedData.email);
});

test('should prevent unauthorized user from updating another user', async () => {
  const otherUser = { name: 'other user', email: 'other@test.com', password: 'pass123' };
  const registerOtherRes = await request(app).post('/api/auth').send(otherUser);
  const otherUserAuthToken = registerOtherRes.body.token;

  const updateRes = await request(app)
    .put(`/api/auth/${testUserId}`)
    .set('Authorization', `Bearer ${otherUserAuthToken}`)
    .send({ email: 'hacked@test.com' });

  expect(updateRes.status).toBe(403);
});

test('should logout user', async () => {
  const logoutRes = await request(app)
    .delete('/api/auth')
    .set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});

test('should reject unauthorized access after logout', async () => {
  const updateRes = await request(app)
    .put(`/api/auth/${testUserId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send({ email: 'fail@test.com' });

  expect(updateRes.status).toBe(401); // should be unauthorized after logout
});