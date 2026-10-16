const express = require("express");
const { apiError } = require("../errors");
const service = require("./slip.service");
const router = express.Router();

function asyncRoute(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "slip-api-OK",
  });
});

router.get(
  "/slipcheck",
  asyncRoute(async (req, res) => {
    const result = await service.slipCheck();
    res.json(result);
  }),
);

router.get(
  "/fuck",
  asyncRoute(async (req, res) => {
    res.json({code:123,status:"ควยไรไอสัส"})
  }),
);

module.exports = router;
