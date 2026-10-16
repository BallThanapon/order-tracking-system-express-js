const service = require('./order.service');

describe('Order Tracking API', () => {
  test('generates a valid order number format', () => {
    const orderNo = service.__testOnlyGenerateOrderNo();
    expect(orderNo).toMatch(/^ORD-\d+-\d{3}$/);
  });

  test('exports all core services', () => {
    expect(typeof service.createOrder).toBe('function');
    expect(typeof service.claimOrder).toBe('function');
    expect(typeof service.heartbeat).toBe('function');
    expect(typeof service.submitResult).toBe('function');
    expect(typeof service.maintenance).toBe('function');
  });
});
