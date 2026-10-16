const prisma = require("../prisma");
const { apiError } = require("../errors");

const { OrderStatus, Prisma } = require("@prisma/client");

const transitions = {
  PENDING_PAYMENT: ["QUEUED", "EXPIRED"],
  QUEUED: ["IN_PROGRESS", "DELAYED", "EXPIRED"],
  IN_PROGRESS: ["COMPLETED", "DELAYED", "FAILED", "QUEUED"],
  DELAYED: ["QUEUED", "FAILED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  FAILED: ["QUEUED", "REFUNDED"],
  EXPIRED: ["REFUNDED"],
  REFUNDED: [],
};

const currentStatuses = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.QUEUED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.DELAYED,
];

function generateOrderNo() {
  return `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
}

function assertValidOrderNo(orderNo) {
  if (!/^ORD-\d+-\d{3}$/.test(orderNo)) {
    throw apiError("INVALID_ORDER_NO", "Invalid order number format", 400);
  }
}

async function transition(tx, order, to, reason) {
  if (!transitions[order.status]?.includes(to)) {
    throw apiError(
      "INVALID_STATE_TRANSITION",
      `Cannot move ${order.status} -> ${to}`,
      400,
    );
  }

  const updated = await tx.order.update({
    where: { id: order.id },
    data: {
      status: to,
      lastError: reason || null,
    },
  });

  await tx.orderTimeline.create({
    data: {
      orderId: order.id,
      from: order.status,
      to,
      reason: reason || null,
    },
  });

  return updated;
}

async function createOrder(data, idempotencyKey) {
  if (!idempotencyKey) {
    throw apiError(
      "IDEMPOTENCY_KEY_REQUIRED",
      "Idempotency-Key header is required",
      400,
    );
  }

  const existing = await prisma.order.findUnique({
    where: { idempotencyKey },
  });

  if (existing) return existing;

  try {
    console.log(data.customerName);
    console.log(data.game);
    console.log(data.gameUid);
    console.log(data.amount);
    console.log(data.paymentMethod);

    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerName: data.customerName,
          game: data.game,
          gameUid: data.gameUid,
          amount: new Prisma.Decimal(data.amount),
          paymentMethod: data.paymentMethod,
          orderNo: generateOrderNo(),
          idempotencyKey,
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          to: OrderStatus.PENDING_PAYMENT,
          reason: "Order created",
        },
      });

      return order;
    });
  } catch (error) {
    console.log(error);

    if (error.code === "P2002") {
      return prisma.order.findUniqueOrThrow({
        where: { idempotencyKey },
      });
    }

    throw error;
  }
}

async function listOrders(tab = "current", page = 1, limit = 10) {
  const where =
    tab === "history"
      ? {
          status: {
            in: [
              OrderStatus.COMPLETED,
              OrderStatus.FAILED,
              OrderStatus.EXPIRED,
              OrderStatus.REFUNDED,
            ],
          },
        }
      : { status: { in: currentStatuses } };

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));

  const [data, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data,
    total,
    page: safePage,
    limit: safeLimit,
  };
}

async function getOrder(orderNo) {
  assertValidOrderNo(orderNo);

  const order = await prisma.order.findUnique({
    where: { orderNo },
  });

  if (!order) {
    throw apiError("ORDER_NOT_FOUND", `Order ${orderNo} not found`, 404);
  }

  return order;
}

async function getTimeline(orderNo) {
  const order = await getOrder(orderNo);

  return prisma.orderTimeline.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "asc" },
  });
}

async function reportIssue(orderNo, reason) {
  if (!reason) {
    throw apiError("INVALID_ISSUE", "Issue reason is required", 400);
  }

  const order = await getOrder(orderNo);

  return prisma.$transaction((tx) =>
    transition(tx, order, OrderStatus.DELAYED, reason),
  );
}

async function claimOrder(workerId) {
  if (!workerId) {
    throw apiError("WORKER_ID_REQUIRED", "workerId is required", 400);
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id
      FROM \`Order\`
      WHERE status = 'QUEUED'
      ORDER BY createdAt ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (!rows.length) return null;

    const id = rows[0].id;

    const order = await tx.order.findUniqueOrThrow({
      where: { id },
    });

    const leaseUntil = new Date(
      Date.now() + Number(process.env.LEASE_TIMEOUT_SECONDS || 120) * 1000,
    );

    await transition(
      tx,
      order,
      OrderStatus.IN_PROGRESS,
      `Claimed by ${workerId}`,
    );

    return tx.order.update({
      where: { id },
      data: {
        workerId,
        leaseUntil,
      },
    });
  });
}

async function heartbeat(orderNo, workerId) {
  if (!workerId) {
    throw apiError("WORKER_ID_REQUIRED", "workerId is required", 400);
  }

  const order = await getOrder(orderNo);

  if (order.status !== OrderStatus.IN_PROGRESS || order.workerId !== workerId) {
    throw apiError("INVALID_LEASE", "Worker does not own active lease", 409);
  }

  return prisma.order.update({
    where: { id: order.id },
    data: {
      leaseUntil: new Date(
        Date.now() + Number(process.env.LEASE_TIMEOUT_SECONDS || 120) * 1000,
      ),
    },
  });
}

async function queuedResult(orderNo, workerId) {
  if (!workerId) {
    throw apiError("WORKER_ID_REQUIRED", "workerId is required", 400);
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { orderNo },
    });

    console.log(order);
    await transition(tx, order, OrderStatus.QUEUED, `Claimed by ${workerId}`);

    const leaseUntil = new Date(
      Date.now() + Number(process.env.LEASE_TIMEOUT_SECONDS || 120) * 1000,
    );
    const queued = await tx.order.update({
      where: { orderNo },
      data: {
        workerId,
        leaseUntil,
        status: OrderStatus.QUEUED,
      },
    });
    console.log(queued);
  });
}

async function submitResult(orderNo, payload) {
  console.log(payload);
  const { workerId, success, transient, error, eventId } = payload;

  if (!workerId) {
    throw apiError("WORKER_ID_REQUIRED", "workerId is required", 400);
  }

  if (typeof success !== "boolean") {
    throw apiError("INVALID_RESULT", "success must be boolean", 400);
  }

  const order = await getOrder(orderNo);
  console.log(order.status);

  if (order.status !== OrderStatus.IN_PROGRESS || order.workerId !== workerId) {
    throw apiError("INVALID_LEASE", "Worker does not own active lease", 409);
  }

  if (eventId) {
    const existingEvent = await prisma.processedEvent.findUnique({
      where: { id: eventId },
    });

    if (existingEvent) return order;
  }

  return prisma.$transaction(async (tx) => {
    if (eventId) {
      try {
        await tx.processedEvent.create({
          data: {
            id: eventId,
            orderNo,
          },
        });
      } catch (e) {
        if (e.code === "P2002") {
          return order;
        }
        throw e;
      }
    }

    const nextStatus = success
      ? OrderStatus.COMPLETED
      : transient
        ? OrderStatus.DELAYED
        : OrderStatus.FAILED;

    return transition(
      tx,
      order,
      nextStatus,
      error || (success ? "Bot completed order" : "Bot failed order"),
    );
  });
}

async function maintenance() {
  const now = new Date();

  const paymentExpired = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: {
        lt: new Date(Date.now() - 15 * 60 * 1000),
      },
    },
  });

  for (const order of paymentExpired) {
    await prisma.$transaction((tx) =>
      transition(tx, order, OrderStatus.EXPIRED, "Payment timeout"),
    );
  }

  const staleOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.IN_PROGRESS,
      leaseUntil: {
        lt: now,
      },
    },
  });

  for (const order of staleOrders) {
    if (order.retryCount < 3) {
      await prisma.$transaction(async (tx) => {
        await transition(
          tx,
          order,
          OrderStatus.QUEUED,
          `Lease expired; retry ${order.retryCount + 1}`,
        );

        await tx.order.update({
          where: { id: order.id },
          data: {
            retryCount: { increment: 1 },
            workerId: null,
            leaseUntil: null,
          },
        });
      });
    } else {
      await prisma.$transaction((tx) =>
        transition(tx, order, OrderStatus.DELAYED, "Retry limit exceeded"),
      );
    }
  }
}

module.exports = {
  __testOnlyGenerateOrderNo: generateOrderNo,
  createOrder,
  listOrders,
  getOrder,
  getTimeline,
  reportIssue,
  claimOrder,
  heartbeat,
  queuedResult,
  submitResult,
  maintenance,
};
