const config = require('./config.js');
const logger = require('./logging/logger.js');

// Handles communication with the pizza factory service
class FactoryService {
  async sendRequest(endpoint, method, body) {
    const url = `${config.factory.url}${endpoint}`;
    const requestBody = body ? JSON.stringify(body) : undefined;
    const logCallback = logger.factoryLogger(url, method, body);

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          authorization: `Bearer ${config.factory.apiKey}` 
        },
        body: requestBody,
      });

      const responseBody = await response.json();
      logCallback(null, responseBody, response.status);

      return {
        ok: response.ok,
        status: response.status,
        body: responseBody,
      };
    } catch (error) {
      logCallback(error, null, 0);
      throw error;
    }
  }

  // Sends a diner order to the factory

  async sendOrder(diner, order) {
    return this.sendRequest('/api/order', 'POST', { diner, order });
  }
}

module.exports = new FactoryService();
