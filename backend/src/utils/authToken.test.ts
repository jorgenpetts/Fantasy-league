import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { signAuthToken, verifyAuthToken } from "./authToken.js";

describe("stateless auth token", () => {
  it("signs finite JWTs with only minimal application claims", () => {
    const token = signAuthToken({
      sub: "user-1",
      role: "ADMIN",
    });
    const decoded = jwt.decode(token);

    assert.equal(typeof token, "string");
    assert.equal(verifyAuthToken(token).sub, "user-1");
    assert.equal(verifyAuthToken(token).role, "ADMIN");
    assert.equal(typeof decoded, "object");
    assert.notEqual(decoded, null);

    if (typeof decoded === "object" && decoded !== null) {
      assert.equal(decoded.sub, "user-1");
      assert.equal(decoded.role, "ADMIN");
      assert.equal("email" in decoded, false);
      assert.equal(typeof decoded.iat, "number");
      assert.equal(typeof decoded.exp, "number");
    }
  });

  it("rejects expired JWTs", () => {
    const expiredToken = jwt.sign(
      {
        sub: "user-1",
        role: "USER",
      },
      env.JWT_SECRET,
      { expiresIn: -1 },
    );

    assert.throws(() => verifyAuthToken(expiredToken));
  });
});
