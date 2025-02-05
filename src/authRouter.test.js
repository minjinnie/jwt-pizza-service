const request = require('supertest');
const app = require('./service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}


// const request = require('supertest');
// const express = require('express');
// const { authRouter, setAuthUser } = require('./routes/authRouter.js');
// const { DB, Role } = require('./database/database.js');
// const jwt = require('jsonwebtoken');
// const config = require('./config.js');

// jest.mock('./database/database.js');

// const app = express();
// app.use(express.json());
// app.use(setAuthUser);
// app.use('/api/auth', authRouter);

// describe('Authentication API Tests', () => {
//   let authToken;
//   let mockUser;

//   beforeAll(async () => {
//     mockUser = {
//       id: 1,
//       name: 'Test User',
//       email: 'test@example.com',
//       roles: [{ role: Role.Admin }],
//     };
//     authToken = jwt.sign(mockUser, config.jwtSecret);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   test('Register a new user', async () => {
//     DB.addUser.mockResolvedValue({
//       id: 2,
//       name: 'New User',
//       email: 'new@example.com',
//       roles: [{ role: Role.Diner }],
//     });

//     DB.loginUser.mockResolvedValue(authToken);

//     const response = await request(app)
//       .post('/api/auth')
//       .send({ name: 'New User', email: 'new@example.com', password: 'password123' });

//     expect(response.status).toBe(200);
//     expect(response.body.user).toHaveProperty('id', 2);
//     expect(response.body).toHaveProperty('token');
//   });

//   test('Login existing user', async () => {
//     DB.getUser.mockResolvedValue(mockUser);
//     DB.loginUser.mockResolvedValue(authToken);

//     const response = await request(app)
//       .put('/api/auth')
//       .send({ email: 'test@example.com', password: 'password123' });

//     expect(response.status).toBe(200);
//     expect(response.body.user).toHaveProperty('email', 'test@example.com');
//     expect(response.body).toHaveProperty('token');
//   });

//   test('Logout user', async () => {
//     DB.isLoggedIn.mockResolvedValue(true);
//     DB.logoutUser.mockResolvedValue(true);

//     const response = await request(app)
//       .delete('/api/auth')
//       .set('Authorization', `Bearer ${authToken}`);

//     expect(response.status).toBe(200);
//     expect(response.body.message).toBe('logout successful');
//   });

//   test('Update user information', async () => {
//     DB.isLoggedIn.mockResolvedValue(true);
//     DB.updateUser.mockResolvedValue({
//       id: 1,
//       name: 'Updated User',
//       email: 'updated@example.com',
//       roles: [{ role: Role.Admin }],
//     });

//     const response = await request(app)
//       .put('/api/auth/1')
//       .send({ email: 'updated@example.com', password: 'newpassword123' })
//       .set('Authorization', `Bearer ${authToken}`);

//     expect(response.status).toBe(200);
//     expect(response.body.email).toBe('updated@example.com');
//   });

//   test('Reject unauthorized user update', async () => {
//     DB.isLoggedIn.mockResolvedValue(true);

//     const response = await request(app)
//       .put('/api/auth/2') // Attempting to update a different user
//       .send({ email: 'hacker@example.com', password: 'hackedpassword' })
//       .set('Authorization', `Bearer ${authToken}`);

//     expect(response.status).toBe(403);
//     expect(response.body.message).toBe('unauthorized');
//   });

//   test('Reject unauthenticated logout', async () => {
//     const response = await request(app).delete('/api/auth');
//     expect(response.status).toBe(401);
//     expect(response.body.message).toBe('unauthorized');
//   });
// });
