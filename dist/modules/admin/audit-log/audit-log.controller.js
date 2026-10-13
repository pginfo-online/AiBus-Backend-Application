"use strict";
// ---------------------------------------------------------------------------
// Admin Audit Log — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogController = void 0;
const audit_log_service_1 = require("./audit-log.service");
const utils_1 = require("../../../shared/utils");
const admin_utils_1 = require("../admin.utils");
class AuditLogController {
    service = audit_log_service_1.AuditLogService.getInstance();
    listAuditLogs = async (req, res, next) => {
        try {
            const result = await this.service.listAuditLogs(req.query);
            utils_1.ApiResponse.paginated(res, result.items, result.pagination, 'Audit logs retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getAuditLogById = async (req, res, next) => {
        try {
            const id = req.params.id;
            const log = await this.service.getAuditLogById(id);
            utils_1.ApiResponse.success(res, log, 'Audit log retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    exportAuditLogs = async (req, res, next) => {
        try {
            const query = req.query;
            const logs = await this.service.getLogsForExport(query);
            if (query.format === 'json') {
                utils_1.ApiResponse.success(res, logs, 'Audit logs exported successfully');
                return;
            }
            const headers = [
                'id',
                'adminId',
                'action',
                'module',
                'resourceType',
                'resourceId',
                'ipAddress',
                'userAgent',
                'requestId',
                'createdAt',
                'details',
            ];
            (0, admin_utils_1.sendCsvResponse)(res, `audit-logs-${Date.now()}.csv`, headers, logs);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AuditLogController = AuditLogController;
//# sourceMappingURL=audit-log.controller.js.map