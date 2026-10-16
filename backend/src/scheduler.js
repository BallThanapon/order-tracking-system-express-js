const service = require('./orders/order.service');

function startScheduler() {
  const intervalMs = 30 * 1000;

  const run = async () => {
    try {
      await service.maintenance();
    } catch (error) {
      console.error('[scheduler]', error);
    }
  };

  run();
  return setInterval(run, intervalMs);
}

module.exports = { startScheduler };
