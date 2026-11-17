import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  passengerSchema,
  profileSchema,
  birthDateSchema,
} from "../../src/modules/users/users.validation";

const mock = vi.hoisted(() => {
  const records = new Map<string, any>();
  const db: any = {
    $queryRaw: vi.fn(async () => []),
    savedPassenger: {
      findMany: vi.fn(async ({ where, take }: any) =>
        [...records.values()]
          .filter((p) => p.userId === where.userId)
          .slice(0, take),
      ),
      findFirst: vi.fn(async ({ where }: any) => {
        const p = records.get(where.id);
        return p?.userId === where.userId ? p : null;
      }),
      findFirstOrThrow: vi.fn(async ({ where }: any) => records.get(where.id)),
      count: vi.fn(
        async ({ where }: any) =>
          [...records.values()].filter((p) => p.userId === where.userId).length,
      ),
      create: vi.fn(async ({ data }: any) => {
        const p = {
          ...data,
          age: data.age ?? null,
          id: data.id || "00000000-0000-4000-8000-000000000001",
        };
        records.set(p.id, p);
        return p;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const p = records.get(where.id);
        if (!p || p.userId !== where.userId) return { count: 0 };
        records.set(p.id, { ...p, ...data });
        return { count: 1 };
      }),
    },
  };
  db.$transaction = (callback: any) => callback(db);
  return { records, db };
});
vi.mock("../../src/infrastructure/database", () => ({
  getPrismaClient: () => mock.db,
}));
const owner = "00000000-0000-4000-8000-000000000011";
const foreignOwner = "00000000-0000-4000-8000-000000000022";
const input = {
  name: "Asha Patil",
  dateOfBirth: "1997-04-15",
  gender: "F" as const,
};
let app: express.Express;
let token: string;
beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/aibus_test");
  vi.stubEnv("JWT_ACCESS_SECRET", "a".repeat(32));
  vi.stubEnv("JWT_REFRESH_SECRET", "b".repeat(32));
  vi.stubEnv("GDS_CLIENT_ID", "1");
  vi.stubEnv("GDS_CLIENT_SECRET", "test-only");
  const { usersRouter } = await import("../../src/modules/users/users.routes");
  const { env } = await import("../../src/config/env");
  token = jwt.sign(
    { sub: owner, email: "test@example.com", role: "CUSTOMER" },
    env.JWT_ACCESS_SECRET,
    { issuer: env.JWT_ISSUER, expiresIn: "1h" },
  );
  app = express();
  app.use(express.json());
  app.use("/users", usersRouter);
  app.use((error: any, _req: any, res: any, _next: any) =>
    res.status(error.statusCode || 500).json({ error: error.code }),
  );
});
beforeEach(() => {
  mock.records.clear();
  vi.clearAllMocks();
});

describe("passenger and personal information validation", () => {
  it("accepts age-only quick entries and DOB entries in Indian scripts", () => {
    expect(
      passengerSchema.safeParse({ name: "आशा पाटील", age: 28, gender: "O" })
        .success,
    ).toBe(true);
    expect(passengerSchema.safeParse(input).success).toBe(true);
  });
  it("rejects ambiguous birth data, impossible dates, unknown genders and mass assignment", () => {
    for (const data of [
      { ...input, age: 25 },
      { name: "Asha", gender: "F" },
      { ...input, dateOfBirth: "2001-02-29" },
      { ...input, gender: "invalid" },
      { ...input, userId: foreignOwner },
      { ...input, name: "    " },
    ]) {
      expect(passengerSchema.safeParse(data).success).toBe(false);
    }
    expect(birthDateSchema.safeParse("2999-01-01").success).toBe(false);
    expect(birthDateSchema.safeParse("2000-02-29").success).toBe(true);
  });
  it("keeps login identity and privileges out of the personal information API", () => {
    expect(profileSchema.safeParse({ phone: "9876543210" }).success).toBe(
      false,
    );
    expect(profileSchema.safeParse({ role: "ADMIN" }).success).toBe(false);
    expect(
      profileSchema.safeParse({
        personalPhone: "9876543210",
        contactEmail: null,
        state: "Maharashtra",
      }).success,
    ).toBe(true);
    expect(profileSchema.safeParse({ state: "invalid" }).success).toBe(false);
  });
});
describe("authenticated owner-scoped passenger routes", () => {
  it("can edit a passenger returned by an idempotent create", async () => {
    const created = await request(app)
      .post("/users/passengers")
      .auth(token, { type: "bearer" })
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000077")
      .send(input);
    const updated = await request(app)
      .patch(`/users/passengers/${created.body.data.id}`)
      .auth(token, { type: "bearer" })
      .send({ ...input, name: "Asha More" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("Asha More");
  });

  it("rejects unauthenticated reads and writes", async () => {
    expect((await request(app).get("/users/passengers")).status).toBe(401);
    expect(
      (await request(app).post("/users/passengers").send(input)).status,
    ).toBe(401);
  });
  it("returns only the current owner’s bounded address book", async () => {
    mock.records.set("foreign", { id: "foreign", userId: foreignOwner });
    mock.records.set("owned", { id: "owned", userId: owner });
    const result = await request(app)
      .get("/users/passengers")
      .auth(token, { type: "bearer" });
    expect(result.status).toBe(200);
    expect(result.body.data.map((p: any) => p.id)).toEqual(["owned"]);
    expect(mock.db.savedPassenger.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: owner }, take: 100 }),
    );
  });
  it("does not allow changing a passenger owned by another user", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    mock.records.set(id, { id, userId: foreignOwner });
    expect(
      (
        await request(app)
          .patch(`/users/passengers/${id}`)
          .auth(token, { type: "bearer" })
          .send(input)
      ).status,
    ).toBe(404);
    expect(mock.records.get(id).name).toBeUndefined();
  });
  it("safely replays creates after a lost response and rejects a changed payload with the same key", async () => {
    const key = "00000000-0000-4000-8000-000000000099";
    const create = (body = input) =>
      request(app)
        .post("/users/passengers")
        .auth(token, { type: "bearer" })
        .set("Idempotency-Key", key)
        .send(body);
    const first = await create();
    const second = await create();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.id).toBe(second.body.data.id);
    expect(mock.records.size).toBe(1);
    expect((await create({ ...input, name: "Someone Else" })).status).toBe(409);
  });
  it("rejects invalid inputs before touching the database", async () => {
    expect(
      (
        await request(app)
          .post("/users/passengers")
          .auth(token, { type: "bearer" })
          .send({ ...input, age: -1 })
      ).status,
    ).toBe(400);
    expect(mock.db.$queryRaw).not.toHaveBeenCalled();
  });
  it("enforces the address book limit", async () => {
    for (let index = 0; index < 100; index++)
      mock.records.set(String(index), { id: String(index), userId: owner });
    expect(
      (
        await request(app)
          .post("/users/passengers")
          .auth(token, { type: "bearer" })
          .send(input)
      ).status,
    ).toBe(409);
  });
});
