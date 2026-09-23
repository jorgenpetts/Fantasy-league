import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { createRateLimit } from "./rateLimit.middleware.js";

function createMockResponse() {
  const headers = new Map<string, unknown>();
  const mock = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: unknown) {
      headers.set(name, value);
      return mock;
    },
    status(code: number) {
      mock.statusCode = code;
      return mock;
    },
    json(body: unknown) {
      mock.body = body;
      return mock;
    },
  };

  return { mock, response: mock as unknown as Response, headers };
}

function createMockRequest(ip = "127.0.0.1") {
  return {
    id: "request-1",
    ip,
    method: "POST",
    originalUrl: "/api/auth/login",
  } as Request;
}

describe("rate limit middleware", () => {
  it("allows requests until the limit is exceeded", () => {
    const limiter = createRateLimit({
      windowMs: 60_000,
      maxRequests: 2,
      keyPrefix: "test-auth",
      keyGenerator: () => "user@example.com",
    });
    let nextCalls = 0;
    const next: NextFunction = () => {
      nextCalls += 1;
    };

    limiter(createMockRequest(), createMockResponse().response, next);
    limiter(createMockRequest(), createMockResponse().response, next);

    const { mock, response, headers } = createMockResponse();
    limiter(createMockRequest(), response, next);

    assert.equal(nextCalls, 2);
    assert.equal(mock.statusCode, 429);
    assert.deepEqual(mock.body, {
      message: "Too many requests. Please try again later.",
    });
    assert.equal(headers.get("RateLimit-Limit"), 2);
    assert.equal(headers.get("RateLimit-Remaining"), 0);
    assert.equal(typeof headers.get("Retry-After"), "number");
  });

  it("tracks different generated keys independently", () => {
    const limiter = createRateLimit({
      windowMs: 60_000,
      maxRequests: 1,
      keyPrefix: "test-email-auth",
      keyGenerator: (req) => {
        const email = req.body?.email;
        return typeof email === "string" ? email.toLowerCase() : null;
      },
    });
    let nextCalls = 0;
    const next: NextFunction = () => {
      nextCalls += 1;
    };

    limiter(
      { ...createMockRequest(), body: { email: "one@example.com" } } as Request,
      createMockResponse().response,
      next,
    );
    limiter(
      { ...createMockRequest(), body: { email: "two@example.com" } } as Request,
      createMockResponse().response,
      next,
    );

    const { mock, response } = createMockResponse();
    limiter(
      { ...createMockRequest(), body: { email: "one@example.com" } } as Request,
      response,
      next,
    );

    assert.equal(nextCalls, 2);
    assert.equal(mock.statusCode, 429);
  });
});
