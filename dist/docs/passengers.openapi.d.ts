export declare const passengerPaths: {
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
//# sourceMappingURL=passengers.openapi.d.ts.map