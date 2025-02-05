const request = require('supertest');
const express = require('express');
const { DB } = require('../database/database.js');
const orderRouter = require('./orderRouter.js');

// Mock the database module
jest.mock('../database/database.js', () => ({
  DB: {
    getMenu: jest.fn(),
    addMenuItem: jest.fn(),
    getOrders: jest.fn(),
    addDinerOrder: jest.fn(),
  },
  Role: {
    Admin: 'Admin',
    User: 'User',
  },
}));

// Mock the authRouter
jest.mock('./authRouter.js', () => ({
  authRouter: {
    authenticateToken: jest.fn((req, res, next) => {
      req.user = { id: 1, name: 'Test User', email: 'test@example.com', isRole: jest.fn() };
      next();
    }),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/order', orderRouter);

describe('Order Router', () => {
  let req;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the req object for authenticated routes
    req = {
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        isRole: jest.fn(),
      },
      body: {},
      query: {},
    };
  });

  describe('GET /api/order/menu', () => {
    it('should return the menu', async () => {
      const mockMenu = [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }];
      DB.getMenu.mockResolvedValue(mockMenu);

      const res = await request(app).get('/api/order/menu');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockMenu);
      expect(DB.getMenu).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /api/order/menu', () => {
    it('should add a menu item if user is admin', async () => {
      const mockMenu = [{ id: 1, title: 'Student', description: 'No topping, no sauce, just carbs', image: 'pizza9.png', price: 0.0001 }];
      const newItem = { title: 'Student', description: 'No topping, no sauce, just carbs', image: 'pizza9.png', price: 0.0001 };

      req.user.isRole.mockReturnValue(true); // Mock user as admin
      DB.addMenuItem.mockResolvedValue();
      DB.getMenu.mockResolvedValue(mockMenu);

      const res = await request(app)
        .put('/api/order/menu')
        .send(newItem)
        .set('Authorization', 'Bearer tttttt');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockMenu);
      expect(DB.addMenuItem).toHaveBeenCalledWith(newItem);
      expect(DB.getMenu).toHaveBeenCalledTimes(1);
    });

    it('should return 403 if user is not admin', async () => {
      req.user.isRole.mockReturnValue(false); // Mock user as non-admin

      const res = await request(app)
        .put('/api/order/menu')
        .send({ title: 'Student', description: 'No topping, no sauce, just carbs', image: 'pizza9.png', price: 0.0001 })
        .set('Authorization', 'Bearer tttttt');

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: 'unable to add menu item' });
    });
  });

  describe('GET /api/order', () => {
    it('should return orders for the authenticated user', async () => {
      const mockOrders = { dinerId: 4, orders: [{ id: 1, franchiseId: 1, storeId: 1, date: '2024-06-05T05:14:40.000Z', items: [{ id: 1, menuId: 1, description: 'Veggie', price: 0.05 }] }], page: 1 };
      DB.getOrders.mockResolvedValue(mockOrders);

      const res = await request(app)
        .get('/api/order')
        .set('Authorization', 'Bearer tttttt');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockOrders);
      expect(DB.getOrders).toHaveBeenCalledWith(req.user, undefined);
    });
  });

  describe('POST /api/order', () => {
    it('should create an order and return the order details', async () => {
      const mockOrder = { franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }], id: 1 };
      const mockResponse = { order: mockOrder, reportSlowPizzaToFactoryUrl: 'http://factory/report', jwt: '1111111111' };

      DB.addDinerOrder.mockResolvedValue(mockOrder);
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ reportUrl: 'http://factory/report', jwt: '1111111111' }),
        })
      );

      const res = await request(app)
        .post('/api/order')
        .send({ franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }] })
        .set('Authorization', 'Bearer tttttt');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockResponse);
      expect(DB.addDinerOrder).toHaveBeenCalledWith(req.user, { franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }] });
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: 'Bearer factoryApiKey' },
        body: JSON.stringify({ diner: { id: 1, name: 'Test User', email: 'test@example.com' }, order: mockOrder }),
      });
    });

    it('should return 500 if factory order creation fails', async () => {
      const mockOrder = { franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }], id: 1 };

      DB.addDinerOrder.mockResolvedValue(mockOrder);
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ reportUrl: 'http://factory/report' }),
        })
      );

      const res = await request(app)
        .post('/api/order')
        .send({ franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }] })
        .set('Authorization', 'Bearer tttttt');

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: 'Failed to fulfill order at factory', reportPizzaCreationErrorToPizzaFactoryUrl: 'http://factory/report' });
    });
  });
});