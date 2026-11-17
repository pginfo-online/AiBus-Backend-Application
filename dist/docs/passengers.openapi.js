"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passengerPaths = void 0;
const passengerInput = {
    type: "object",
    additionalProperties: false,
    required: ["name", "gender"],
    description: "Supply exactly one of dateOfBirth or age. Mobile is optional.",
    properties: {
        name: { type: "string", minLength: 2, maxLength: 100 },
        dateOfBirth: { type: "string", format: "date", nullable: true },
        age: { type: "integer", minimum: 1, maximum: 120, nullable: true },
        gender: { type: "string", enum: ["M", "F", "O"] },
        mobile: { type: "string", pattern: "^[6-9][0-9]{9}$", nullable: true },
    },
};
const body = {
    required: true,
    content: { "application/json": { schema: passengerInput } },
};
const security = [{ BearerAuth: [] }];
const responses = {
    "200": {
        description: "Success, in the standard success/data response envelope",
    },
    "400": { description: "Invalid fields, birthday, gender or request key" },
    "401": { description: "Authentication required" },
};
exports.passengerPaths = {
    "/api/v1/users/passengers": {
        get: {
            tags: ["Passengers"],
            summary: "List the authenticated owner’s saved passengers (at most 100)",
            security,
            responses,
        },
        post: {
            tags: ["Passengers"],
            summary: "Save a passenger",
            security,
            parameters: [
                {
                    in: "header",
                    name: "Idempotency-Key",
                    required: false,
                    schema: { type: "string", format: "uuid" },
                    description: "Reuse a UUID for retries of the same create. Keys are scoped to the authenticated user.",
                },
            ],
            requestBody: body,
            responses: {
                ...responses,
                "409": {
                    description: "Address book full or request key reused for different data",
                },
            },
        },
    },
    "/api/v1/users/passengers/{id}": {
        patch: {
            tags: ["Passengers"],
            summary: "Replace editable passenger details within the authenticated owner’s address book",
            security,
            parameters: [
                {
                    in: "path",
                    name: "id",
                    required: true,
                    schema: { type: "string", format: "uuid" },
                },
            ],
            requestBody: body,
            responses: {
                ...responses,
                "404": { description: "Passenger missing or belongs to another user" },
            },
        },
    },
    "/api/v1/users/profile": {
        get: {
            tags: ["Passengers"],
            summary: "Get personal information (excludes authentication secrets)",
            security,
            responses,
        },
        patch: {
            tags: ["Passengers"],
            summary: "Update personal information; verified sign-in identities remain unchanged",
            security,
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                firstName: { type: "string", minLength: 1, maxLength: 100 },
                                lastName: { type: "string", maxLength: 100 },
                                dateOfBirth: { type: "string", format: "date", nullable: true },
                                gender: {
                                    type: "string",
                                    enum: ["M", "F", "O"],
                                    nullable: true,
                                },
                                state: {
                                    type: "string",
                                    nullable: true,
                                    description: "Canonical English name of an Indian state or union territory",
                                },
                                personalPhone: {
                                    type: "string",
                                    nullable: true,
                                    pattern: "^[6-9][0-9]{9}$",
                                },
                                contactEmail: {
                                    type: "string",
                                    format: "email",
                                    nullable: true,
                                },
                            },
                        },
                    },
                },
            },
            responses,
        },
    },
};
//# sourceMappingURL=passengers.openapi.js.map