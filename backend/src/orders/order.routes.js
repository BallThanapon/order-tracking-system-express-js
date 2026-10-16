const express = require("express");
const service = require("./order.service");
const { apiError } = require("../errors");
const router = express.Router();

function asyncRoute(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}

function validateCreateOrder(body) {
  const required = [
    "customerName",
    "game",
    "gameUid",
    "amount",
    "paymentMethod",
  ];

  for (const field of required) {
    if (
      body[field] === undefined ||
      body[field] === null ||
      body[field] === ""
    ) {
      throw apiError("VALIDATION_ERROR", `${field} is required`, 400);
    }
  }

  if (Number.isNaN(Number(body.amount)) || Number(body.amount) <= 0) {
    throw apiError("VALIDATION_ERROR", "amount must be greater than 0", 400);
  }
}

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "order-tracking-api",
  });
});

router.post(
  "/orders",
  asyncRoute(async (req, res) => {
    console.log(req.body);

    validateCreateOrder(req.body);

    const order = await service.createOrder(
      req.body,
      req.header("Idempotency-Key"),
    );

    res.status(201).json(order);
  }),
);

router.get(
  "/orders",
  asyncRoute(async (req, res) => {
    const result = await service.listOrders(
      req.query.tab,
      req.query.page,
      req.query.limit,
    );

    res.json(result);
  }),
);

router.get(
  "/orders/:orderNo/timeline",
  asyncRoute(async (req, res) => {
    const timeline = await service.getTimeline(req.params.orderNo);
    res.json(timeline);
  }),
);

router.post(
  "/orders/:orderNo/report-issue",
  asyncRoute(async (req, res) => {
    const order = await service.reportIssue(
      req.params.orderNo,
      req.body.reason,
    );

    res.json(order);
  }),
);

router.post(
  "/orders/:orderNo/heartbeat",
  asyncRoute(async (req, res) => {
    const order = await service.heartbeat(
      req.params.orderNo,
      req.body.workerId,
    );

    res.json(order);
  }),
);

router.post(
  "/orders/:orderNo/result",
  asyncRoute(async (req, res) => {
    const order = await service.submitResult(req.params.orderNo, req.body);

    res.json(order);
  }),
);

router.get(
  "/orders/:orderNo",
  asyncRoute(async (req, res) => {
    const order = await service.getOrder(req.params.orderNo);
    res.json(order);
  }),
);

router.post(
  "/orders/:orderNo/queued",
  asyncRoute(async (req, res) => {
    const order = await service.queuedResult(
      req.params.orderNo,
      req.body.workerId,
    );

    res.json(order);
  }),
);

router.post(
  "/orders/claim",
  asyncRoute(async (req, res) => {
    const order = await service.claimOrder(req.body.workerId);

    if (!order) {
      return res.status(204).send();
    }

    res.json(order);
  }),
);

module.exports = router;
