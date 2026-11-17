export declare const swaggerDocument: {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
        contact: {
            name: string;
            email: string;
        };
    };
    servers: {
        url: string;
        description: string;
    }[];
    components: {
        securitySchemes: {
            BearerAuth: {
                type: string;
                scheme: string;
                bearerFormat: string;
                description: string;
            };
            IdempotencyHeader: {
                type: string;
                in: string;
                name: string;
                description: string;
            };
        };
        schemas: {
            ApiResponse: {
                type: string;
                properties: {
                    success: {
                        type: string;
                    };
                    data: {
                        type: string;
                    };
                    message: {
                        type: string;
                    };
                    meta: {
                        type: string;
                    };
                };
            };
            ApiError: {
                type: string;
                properties: {
                    success: {
                        type: string;
                        example: boolean;
                    };
                    error: {
                        type: string;
                        properties: {
                            code: {
                                type: string;
                            };
                            message: {
                                type: string;
                            };
                            details: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
    paths: {
        '/health/live': {
            get: {
                summary: string;
                description: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/health/ready': {
            get: {
                summary: string;
                description: string;
                responses: {
                    '200': {
                        description: string;
                    };
                    '503': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/auth/register': {
            post: {
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    email: {
                                        type: string;
                                        format: string;
                                    };
                                    password: {
                                        type: string;
                                        minLength: number;
                                    };
                                    firstName: {
                                        type: string;
                                    };
                                    lastName: {
                                        type: string;
                                    };
                                    phone: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                    };
                    '409': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/auth/login': {
            post: {
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    email: {
                                        type: string;
                                    };
                                    password: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                    };
                    '401': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/search': {
            get: {
                summary: string;
                description: string;
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format?: undefined;
                        enum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                        enum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format?: undefined;
                        enum?: undefined;
                    };
                    required?: undefined;
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        enum: string[];
                        format?: undefined;
                    };
                    required?: undefined;
                })[];
                responses: {
                    '200': {
                        description: string;
                    };
                    '400': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/buses/{busId}/chart': {
            get: {
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/holds': {
            post: {
                summary: string;
                description: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    fromCityId: {
                                        type: string;
                                    };
                                    toCityId: {
                                        type: string;
                                    };
                                    journeyDate: {
                                        type: string;
                                    };
                                    busId: {
                                        type: string;
                                    };
                                    pickupId: {
                                        type: string;
                                    };
                                    dropoffId: {
                                        type: string;
                                    };
                                    passengers: {
                                        type: string;
                                        items: {
                                            type: string;
                                            properties: {
                                                seatNo: {
                                                    type: string;
                                                };
                                                seatTypeId: {
                                                    type: string;
                                                };
                                                fare: {
                                                    type: string;
                                                };
                                                gender: {
                                                    type: string;
                                                    enum: string[];
                                                };
                                                age: {
                                                    type: string;
                                                };
                                                name: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                    };
                    '409': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/bookings': {
            post: {
                summary: string;
                description: string;
                responses: {
                    '201': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/bookings/checkout-session': {
            post: {
                summary: string;
                description: string;
                responses: {
                    '201': {
                        description: string;
                    };
                    '409': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/bookings/my-bookings': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                description: string;
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        minimum: number;
                        maximum: number;
                        format?: undefined;
                        enum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format: string;
                        minimum?: undefined;
                        maximum?: undefined;
                        enum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        enum: string[];
                        minimum?: undefined;
                        maximum?: undefined;
                        format?: undefined;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/payments/intent': {
            post: {
                summary: string;
                description: string;
                responses: {
                    '201': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/payments/verify': {
            post: {
                summary: string;
                description: string;
                responses: {
                    '200': {
                        description: string;
                    };
                    '400': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/tickets/booking/{bookingId}': {
            get: {
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/cancellations/{bookingId}/check': {
            get: {
                summary: string;
                description: string;
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description?: undefined;
                } | {
                    name: string;
                    in: string;
                    description: string;
                    schema: {
                        type: string;
                        format?: undefined;
                    };
                    required?: undefined;
                })[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/api/v1/cancellations/{bookingId}': {
            post: {
                summary: string;
                description: string;
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    seatNos: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                        minItems: number;
                                        maxItems: number;
                                    };
                                    reason: {
                                        type: string;
                                        maxLength: number;
                                    };
                                    refundToWallet: {
                                        type: string;
                                        default: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                    '202': {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/passengers": {
            get: {
                tags: string[];
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    "200": {
                        description: string;
                    };
                    "400": {
                        description: string;
                    };
                    "401": {
                        description: string;
                    };
                };
            };
            post: {
                tags: string[];
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                additionalProperties: boolean;
                                required: string[];
                                description: string;
                                properties: {
                                    name: {
                                        type: string;
                                        minLength: number;
                                        maxLength: number;
                                    };
                                    dateOfBirth: {
                                        type: string;
                                        format: string;
                                        nullable: boolean;
                                    };
                                    age: {
                                        type: string;
                                        minimum: number;
                                        maximum: number;
                                        nullable: boolean;
                                    };
                                    gender: {
                                        type: string;
                                        enum: string[];
                                    };
                                    mobile: {
                                        type: string;
                                        pattern: string;
                                        nullable: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    "409": {
                        description: string;
                    };
                    "200": {
                        description: string;
                    };
                    "400": {
                        description: string;
                    };
                    "401": {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/passengers/{id}": {
            patch: {
                tags: string[];
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    in: string;
                    name: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                additionalProperties: boolean;
                                required: string[];
                                description: string;
                                properties: {
                                    name: {
                                        type: string;
                                        minLength: number;
                                        maxLength: number;
                                    };
                                    dateOfBirth: {
                                        type: string;
                                        format: string;
                                        nullable: boolean;
                                    };
                                    age: {
                                        type: string;
                                        minimum: number;
                                        maximum: number;
                                        nullable: boolean;
                                    };
                                    gender: {
                                        type: string;
                                        enum: string[];
                                    };
                                    mobile: {
                                        type: string;
                                        pattern: string;
                                        nullable: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    "404": {
                        description: string;
                    };
                    "200": {
                        description: string;
                    };
                    "400": {
                        description: string;
                    };
                    "401": {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/profile": {
            get: {
                tags: string[];
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    "200": {
                        description: string;
                    };
                    "400": {
                        description: string;
                    };
                    "401": {
                        description: string;
                    };
                };
            };
            patch: {
                tags: string[];
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                additionalProperties: boolean;
                                properties: {
                                    firstName: {
                                        type: string;
                                        minLength: number;
                                        maxLength: number;
                                    };
                                    lastName: {
                                        type: string;
                                        maxLength: number;
                                    };
                                    dateOfBirth: {
                                        type: string;
                                        format: string;
                                        nullable: boolean;
                                    };
                                    gender: {
                                        type: string;
                                        enum: string[];
                                        nullable: boolean;
                                    };
                                    state: {
                                        type: string;
                                        nullable: boolean;
                                        description: string;
                                    };
                                    personalPhone: {
                                        type: string;
                                        nullable: boolean;
                                        pattern: string;
                                    };
                                    contactEmail: {
                                        type: string;
                                        format: string;
                                        nullable: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    "200": {
                        description: string;
                    };
                    "400": {
                        description: string;
                    };
                    "401": {
                        description: string;
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=swaggerSpec.d.ts.map