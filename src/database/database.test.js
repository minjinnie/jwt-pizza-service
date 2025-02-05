const { DB } = require('../database/database.js');
const { Role } = require('../model/model.js');
const bcrypt = require('bcrypt');

// Jest setup
jest.setTimeout(10000);

// Function to generate a unique random name
function randomName() {
  return 'Franchise_' + Math.random().toString(36).substring(2, 10);
}

describe('Database Service Tests', () => {
  let adminUser;
  let testFranchise;

  beforeAll(async () => {
    adminUser = await DB.addUser({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'adminpass',
      roles: [{ role: Role.Admin }],
    });

    // Create a unique franchise name before testing users with Franchisee role
    testFranchise = await DB.createFranchise({
      name: randomName(),
      admins: [{ email: adminUser.email }],
    });
  });

  afterAll(async () => {
    await DB.logoutUser(adminUser.email);
    await DB.deleteFranchise(testFranchise.id);
  });

  test('Should add a menu item and retrieve it', async () => {
    const newItem = {
      title: 'Test Pizza',
      description: 'Delicious test pizza',
      image: 'test.jpg',
      price: 12.99,
    };
    const addedItem = await DB.addMenuItem(newItem);
    expect(addedItem).toHaveProperty('id');
    const menu = await DB.getMenu();
    expect(menu.length).toBeGreaterThan(0);
  });

  test('Should add and retrieve a user', async () => {
    const newUser = {
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      roles: [{ role: Role.Franchisee, object: testFranchise.name }], // Use existing franchise
    };
    const addedUser = await DB.addUser(newUser);
    expect(addedUser).toHaveProperty('id');

    const retrievedUser = await DB.getUser(newUser.email, newUser.password);
    expect(retrievedUser.email).toBe(newUser.email);
  });

  test('Should login and logout a user', async () => {
    const testUser = await DB.addUser({
      name: 'Login User',
      email: 'login@test.com',
      password: 'loginpass',
      roles: [{ role: Role.Admin }],
    });

    await DB.loginUser(testUser.id, 'testToken123');
    const isLoggedIn = await DB.isLoggedIn('testToken123');
    expect(isLoggedIn).toBe(true);

    await DB.logoutUser('testToken123');
    const isStillLoggedIn = await DB.isLoggedIn('testToken123');
    expect(isStillLoggedIn).toBe(false);
  });

  test('Should create and delete a franchise', async () => {
    const newFranchise = {
      name: randomName(), // Use dynamic name
      admins: [{ email: adminUser.email }],
    };
    const franchise = await DB.createFranchise(newFranchise);
    expect(franchise).toHaveProperty('id');

    await DB.deleteFranchise(franchise.id);
    const franchises = await DB.getFranchises();
    expect(franchises.some(f => f.id === franchise.id)).toBe(false);
  });

  test('Should create and delete a store', async () => {
    const franchise = await DB.createFranchise({ name: randomName(), admins: [{ email: adminUser.email }] });
    const store = await DB.createStore(franchise.id, { name: 'Test Store' });
    expect(store).toHaveProperty('id');

    // Delete the store
    await DB.deleteStore(franchise.id, store.id);

    // Retrieve the list of stores for the franchise
    const stores = await DB.getStores(franchise.id);

    // Check if the deleted store no longer exists
    expect(stores.some(s => s.id === store.id)).toBe(false);
  });

  test('Should hash passwords correctly', async () => {
    const password = 'securepassword';
    const hashedPassword = await bcrypt.hash(password, 10);
    const isMatch = await bcrypt.compare(password, hashedPassword);
    expect(isMatch).toBe(true);
  });
});