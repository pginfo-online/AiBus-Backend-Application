"use strict";
// ---------------------------------------------------------------------------
// Admin Module — Shared Utilities
// Pagination builder, filter parser, CSV export, ticket number generator
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPagination = buildPagination;
exports.buildPaginationMeta = buildPaginationMeta;
exports.buildDateRangeFilter = buildDateRangeFilter;
exports.buildDateFilter = buildDateFilter;
exports.buildSearchFilter = buildSearchFilter;
exports.buildSortOrder = buildSortOrder;
exports.sendCsvResponse = sendCsvResponse;
exports.generateTicketNumber = generateTicketNumber;
exports.generateCouponCode = generateCouponCode;
exports.isValidEnumValue = isValidEnumValue;
exports.sendAdminPaginated = sendAdminPaginated;
/**
 * Build Prisma-compatible pagination parameters from query input.
 * Enforces sane defaults and max limits for security.
 */
function buildPagination(input) {
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(Math.max(1, input.limit || 20), 100); // Max 100 per page
    const skip = (page - 1) * limit;
    return { skip, take: limit, page, limit };
}
/**
 * Build pagination meta from total count and pagination result.
 */
function buildPaginationMeta(total, pagination) {
    const totalPages = Math.ceil(total / pagination.limit);
    return {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
    };
}
/**
 * Build a Prisma date range filter.
 * Returns undefined if neither date is provided.
 */
function buildDateRangeFilter(input) {
    if (!input.startDate && !input.endDate)
        return undefined;
    const filter = {};
    if (input.startDate) {
        filter.gte = new Date(input.startDate);
    }
    if (input.endDate) {
        // Set to end of day
        const end = new Date(input.endDate);
        end.setHours(23, 59, 59, 999);
        filter.lte = end;
    }
    return filter;
}
/**
 * Build a field-targeted Prisma date filter object.
 */
function buildDateFilter(startDate, endDate, field = 'createdAt') {
    if (!startDate && !endDate)
        return undefined;
    const filter = {};
    if (startDate) {
        filter.gte = new Date(startDate);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.lte = end;
    }
    return { [field]: filter };
}
// ---------------------------------------------------------------------------
// Search filter
// ---------------------------------------------------------------------------
/**
 * Build a Prisma case-insensitive search filter for a given field.
 */
function buildSearchFilter(search, fields) {
    if (!search || !search.trim())
        return undefined;
    const term = search.trim();
    return fields.map((field) => ({
        [field]: { contains: term, mode: 'insensitive' },
    }));
}
/**
 * Build a Prisma orderBy clause.
 * Only allows sorting on fields explicitly in allowedFields for security.
 */
function buildSortOrder(input, allowedFields, defaultField = 'createdAt', defaultOrder = 'desc') {
    const sortBy = input.sortBy && allowedFields.includes(input.sortBy)
        ? input.sortBy
        : defaultField;
    const sortOrder = input.sortOrder === 'asc' ? 'asc' : defaultOrder;
    return { [sortBy]: sortOrder };
}
// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------
/**
 * Stream CSV data directly to the response.
 * Efficient for large datasets — doesn't buffer entire content in memory.
 */
function sendCsvResponse(res, filename, headers, rows) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    // BOM for Excel UTF-8 compatibility
    res.write('\uFEFF');
    // Header row
    res.write(headers.map(escapeCsvValue).join(',') + '\n');
    // Data rows
    for (const row of rows) {
        const values = headers.map((header) => {
            const value = row[header];
            return escapeCsvValue(formatCsvValue(value));
        });
        res.write(values.join(',') + '\n');
    }
    res.end();
}
/**
 * Escape a CSV value (double-quote wrapping and escaping).
 */
function escapeCsvValue(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
/**
 * Format a value for CSV output.
 */
function formatCsvValue(value) {
    if (value === null || value === undefined)
        return '';
    if (value instanceof Date)
        return value.toISOString();
    if (typeof value === 'object')
        return JSON.stringify(value);
    return String(value);
}
// ---------------------------------------------------------------------------
// Ticket / Reference number generators
// ---------------------------------------------------------------------------
/**
 * Generate a unique support ticket number.
 * Format: TKT-YYYYMMDD-XXXXX (where XXXXX is random alphanumeric)
 */
function generateTicketNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TKT-${datePart}-${randomPart}`;
}
/**
 * Generate a unique coupon code.
 * Format: AIB-XXXXXXXXX (9 char random alphanumeric, uppercase)
 */
function generateCouponCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 9; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `AIB-${code}`;
}
// ---------------------------------------------------------------------------
// Enum helpers
// ---------------------------------------------------------------------------
/**
 * Safe enum value check — validates that a string is a valid member of an enum-like object.
 */
function isValidEnumValue(enumObj, value) {
    return Object.values(enumObj).includes(value);
}
// ---------------------------------------------------------------------------
// Admin response wrapper
// ---------------------------------------------------------------------------
/**
 * Standard admin paginated response helper.
 */
function sendAdminPaginated(res, data, pagination, message) {
    res.status(200).json({
        success: true,
        data,
        meta: { pagination },
        ...(message ? { message } : {}),
    });
}
//# sourceMappingURL=admin.utils.js.map