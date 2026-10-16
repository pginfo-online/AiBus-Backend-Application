import { CreateConfigInput, UpdateConfigInput, CreateFeatureFlagInput, ToggleFeatureFlagInput } from './system-config.validation';
export declare class SystemConfigService {
    private static instance;
    private readonly logger;
    static getInstance(): SystemConfigService;
    /**
     * Get all configuration entries, optionally filtered by group
     */
    getConfigs(group?: string): Promise<any[]>;
    /**
     * Get single config entry by key
     */
    getConfigByKey(key: string): Promise<any>;
    /**
     * Create new system config
     */
    createConfig(input: CreateConfigInput, adminId: string): Promise<any>;
    /**
     * Update existing system config
     */
    updateConfig(key: string, input: UpdateConfigInput, adminId: string): Promise<any>;
    /**
     * Delete a system config entry
     */
    deleteConfig(key: string, adminId: string): Promise<any>;
    /**
     * Get all feature flags
     */
    getFeatureFlags(): Promise<any[]>;
    /**
     * Create a new feature flag
     */
    createFeatureFlag(input: CreateFeatureFlagInput, adminId: string): Promise<any>;
    /**
     * Toggle or update a feature flag
     */
    toggleFeatureFlag(key: string, input: ToggleFeatureFlagInput, adminId: string): Promise<any>;
    /**
     * Comprehensive system health diagnostics
     */
    getDetailedSystemHealth(): Promise<any>;
}
//# sourceMappingURL=system-config.service.d.ts.map