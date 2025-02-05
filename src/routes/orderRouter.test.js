const request = require('supertest');
const express = require('express');
const orderRouter = require('./orderRouter.js'); // Adjust the path as needed
const { DB } = require('../database/database.js'); // Adjust the path as needed
const { authRouter } = require('./authRouter.js'); // Adjust the path as needed

// Mock the database and authRouter
jest.mock('../database/database');
jest.mock('./authRouter');

const app = express();
app.use(express.json());
app.use('/api/order', orderRouter);

describe('Order Router Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/order/menu', () => {
    it('should return the pizza menu', async () => {
      const mockMenu = [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      ];
      DB.getMenu.mockResolvedValue(mockMenu);

      const response = await request(app).get('/api/order/menu');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMenu);
    });
  });

  describe('PUT /api/order/menu', () => {
    it('should add a menu item if user is an admin', async () => {
      const mockMenu = [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Student', description: 'No topping, no sauce, just carbs', image: 'pizza9.png', price: 0.0001 },
      ];
      DB.addMenuItem.mockResolvedValue();
      DB.getMenu.mockResolvedValue(mockMenu);
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { isRole: jest.fn().mockReturnValue(true) }; // Mock admin user
        next();
      });

      const response = await request(app)
        .put('/api/order/menu')
        .set('Authorization', 'Bearer tttttt')
        .send({
          title: 'Student',
          description: 'No topping, no sauce, just carbs',
          image: 'pizza9.png',
          price: 0.0001,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMenu);
    });

    it('should return 403 if user is not an admin', async () => {
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { isRole: jest.fn().mockReturnValue(false) }; // Mock non-admin user
        next();
      });

      const response = await request(app)
        .put('/api/order/menu')
        .set('Authorization', 'Bearer tttttt')
        .send({
          title: 'Student',
          description: 'No topping, no sauce, just carbs',
          image: 'pizza9.png',
          price: 0.0001,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/order', () => {
    it('should return orders for the authenticated user', async () => {
      const mockOrders = {
        dinerId: 4,
        orders: [
          {
            id: 1,
            franchiseId: 1,
            storeId: 1,
            date: '2024-06-05T05:14:40.000Z',
            items: [{ id: 1, menuId: 1, description: 'Veggie', price: 0.05 }],
          },
        ],
        page: 1,
      };
      DB.getOrders.mockResolvedValue(mockOrders);
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 4 }; // Mock authenticated user
        next();
      });

      const response = await request(app)
        .get('/api/order')
        .set('Authorization', 'Bearer tttttt');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrders);
    });
  });

  describe('POST /api/order', () => {
    it('should create an order for the authenticated user', async () => {
      const mockOrder = {
        franchiseId: 1,
        storeId: 1,
        items: [{ menuId: 1, description: 'Veggie', price: 0.05 }],
        id: 1,
      };
      const mockFactoryResponse = {
        reportUrl: 'http://factory/report/123',
        jwt: '1111111111',
      };
      DB.addDinerOrder.mockResolvedValue(mockOrder);
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFactoryResponse),
        })
      );
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 4, name: 'John Doe', email: 'john@example.com' }; // Mock authenticated user
        next();
      });

      const response = await request(app)
        .post('/api/order')
        .set('Authorization', 'Bearer tttttt')
        .send({
          franchiseId: 1,
          storeId: 1,
          items: [{ menuId: 1, description: 'Veggie', price: 0.05 }],
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        order: mockOrder,
        reportSlowPizzaToFactoryUrl: mockFactoryResponse.reportUrl,
        jwt: mockFactoryResponse.jwt,
      });
    });

    it('should return 500 if the factory API fails', async () => {
      const mockOrder = {
        franchiseId: 1,
        storeId: 1,
        items: [{ menuId: 1, description: 'Veggie', price: 0.05 }],
        id: 1,
      };
      const mockFactoryResponse = {
        reportUrl: 'http://factory/report/123',
      };
      DB.addDinerOrder.mockResolvedValue(mockOrder);
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve(mockFactoryResponse),
        })
      );
      authRouter.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 4, name: 'John Doe', email: 'john@example.com' }; // Mock authenticated user
        next();
      });

      const response = await request(app)
        .post('/api/order')
        .set('Authorization', 'Bearer tttttt')
        .send({
          franchiseId: 1,
          storeId: 1,
          items: [{ menuId: 1, description: 'Veggie', price: 0.05 }],
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Failed to fulfill order at factory',
        reportPizzaCreationErrorToPizzaFactoryUrl: mockFactoryResponse.reportUrl,
      });
    });
  });
});