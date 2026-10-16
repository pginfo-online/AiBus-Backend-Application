import { PaginatedResult } from '../admin.utils';
import { ListCitiesQuery, CreateCityInput, UpdateCityInput } from './city-management.validation';
export declare class CityManagementService {
    private static instance;
    private readonly logger;
    static getInstance(): CityManagementService;
    private invalidateCitiesCache;
    /**
     * List all cities with filtering and pagination
     */
    listCities(query: ListCitiesQuery): Promise<PaginatedResult<any>>;
    /**
     * Get city details by ID
     */
    getCityById(id: string): Promise<any>;
    /**
     * Create a new city manually
     */
    createCity(input: CreateCityInput, adminId: string): Promise<any>;
    /**
     * Update an existing city
     */
    updateCity(id: string, input: UpdateCityInput, adminId: string): Promise<any>;
    /**
     * Deactivate or soft-delete a city
     */
    deactivateCity(id: string, adminId: string): Promise<any>;
    /**
     * Trigger GDS city synchronization
     */
    syncCities(adminId: string): Promise<{
        syncedCount: number;
    }>;
}
//# sourceMappingURL=city-management.service.d.ts.map