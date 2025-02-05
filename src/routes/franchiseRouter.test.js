const request = require('supertest');
const express = require('express');
const franchiseRouter = require('./franchiseRouter'); // Adjust the path as needed
const { DB } = require('../database/database'); // Adjust the path as needed
const { authRouter } = require('./authRouter'); // Adjust the path as needed

// Mock the database and authRouter
jest.mock('../database/database');
jest.mock('./authRouter');

const app = express();
app.use(express.json());
app.use('/api/franchise', franchiseRouter);

describe('Franchise Router Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/franchise', () => {
    it('should return a list of franchises', async () => {
      const mockFranchises = [{ id: 1, name: 'pizzaPocket', admins: [], stores: [] }];
      DB.getFranchises.mockResolvedValue(mockFranchises);

      const response = await request(app).get('/api/franchise');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFranchises);
    });
  });

  describe('GET /api/franchise/:userId', () => {
    it('should return franchises for a specific user if authorized', async () => {
      const mockUserFranchises = [{ id: 2, name: 'pizzaPocket', admins: [], stores: [] }];
      DB.getUserFranchises.mockResolvedValue(mockUserFranchises);
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 4, isRole: jest.fn().mockReturnValue(false) }; // Mock user
        next();
      });

      const response = await request(app).get('/api/franchise/4').set('Authorization', 'Bearer tttttt');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserFranchises);
    });

    it('should return 403 if user is not authorized', async () => {
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 5, isRole: jest.fn().mockReturnValue(false) }; // Mock unauthorized user
        next();
      });

      const response = await request(app).get('/api/franchise/4').set('Authorization', 'Bearer tttttt');
      expect(response.status).toBe(200); // Adjust based on your logic
      expect(response.body).toEqual([]); // No franchises returned for unauthorized user
    });
  });

  describe('POST /api/franchise', () => {
    it('should create a new franchise if user is an admin', async () => {
      const mockFranchise = { name: 'pizzaPocket', admins: [], id: 1 };
      DB.createFranchise.mockResolvedValue(mockFranchise);
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { isRole: jest.fn().mockReturnValue(true) }; // Mock admin user
        next();
      });

      const response = await request(app)
        .post('/api/franchise')
        .set('Authorization', 'Bearer tttttt')
        .send({ name: 'pizzaPocket', admins: [] });
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFranchise);
    });

    it('should return 403 if user is not an admin', async () => {
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { isRole: jest.fn().mockReturnValue(false) }; // Mock non-admin user
        next();
      });

      const response = await request(app)
        .post('/api/franchise')
        .set('Authorization', 'Bearer tttttt')
        .send({ name: 'pizzaPocket', admins: [] });
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/franchise/:franchiseId', () => {
    it('should delete a franchise if user is an admin', async () => {
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { isRole: jest.fn().mockReturnValue(true) }; // Mock admin user
        next();
      });

      const response = await request(app)
        .delete('/api/franchise/1')
        .set('Authorization', 'Bearer tttttt');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'franchise deleted' });
    });

    it('should return 403 if user is not an admin', async () => {
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { isRole: jest.fn().mockReturnValue(false) }; // Mock non-admin user
        next();
      });

      const response = await request(app)
        .delete('/api/franchise/1')
        .set('Authorization', 'Bearer tttttt');
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/franchise/:franchiseId/store', () => {
    it('should create a new store if user is authorized', async () => {
      const mockStore = { id: 1, name: 'SLC', totalRevenue: 0 };
      DB.createStore.mockResolvedValue(mockStore);
      DB.getFranchise.mockResolvedValue({ id: 1, admins: [{ id: 4 }] });
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 4, isRole: jest.fn().mockReturnValue(false) }; // Mock authorized user
        next();
      });

      const response = await request(app)
        .post('/api/franchise/1/store')
        .set('Authorization', 'Bearer tttttt')
        .send({ name: 'SLC' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStore);
    });

    it('should return 403 if user is not authorized', async () => {
      DB.getFranchise.mockResolvedValue({ id: 1, admins: [{ id: 5 }] }); // Mock unauthorized user
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 4, isRole: jest.fn().mockReturnValue(false) }; // Mock unauthorized user
        next();
      });

      const response = await request(app)
        .post('/api/franchise/1/store')
        .set('Authorization', 'Bearer tttttt')
        .send({ name: 'SLC' });
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/franchise/:franchiseId/store/:storeId', () => {
    it('should delete a store if user is authorized', async () => {
      DB.getFranchise.mockResolvedValue({ id: 1, admins: [{ id: 4 }] });
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 4, isRole: jest.fn().mockReturnValue(false) }; // Mock authorized user
        next();
      });

      const response = await request(app)
        .delete('/api/franchise/1/store/1')
        .set('Authorization', 'Bearer tttttt');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'store deleted' });
    });

    it('should return 403 if user is not authorized', async () => {
      DB.getFranchise.mockResolvedValue({ id: 1, admins: [{ id: 5 }] }); // Mock unauthorized user
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 4, isRole: jest.fn().mockReturnValue(false) }; // Mock unauthorized user
        next();
      });

      const response = await request(app)
        .delete('/api/franchise/1/store/1')
        .set('Authorization', 'Bearer tttttt');
      expect(response.status).toBe(403);
    });
  });
});