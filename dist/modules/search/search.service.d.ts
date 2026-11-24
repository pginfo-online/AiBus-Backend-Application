import { SearchBusesQuery } from './search.validation';
import { GdsBusSearchResult } from '../../providers/types';
export declare class SearchService {
    private static instance;
    private gdsAdapter;
    private searchLogger;
    private constructor();
    static getInstance(): SearchService;
    private resolveCityNames;
    searchBuses(query: SearchBusesQuery): Promise<{
        results: GdsBusSearchResult[];
        total: number;
        fromCityId?: number;
        toCityId?: number;
        fromCityName?: string;
        toCityName?: string;
        from?: string;
        to?: string;
    }>;
    searchSingleBus(query: {
        fromCityId: number;
        toCityId: number;
        journeyDate: string;
        busId: number;
    }): Promise<{
        results: GdsBusSearchResult[];
        total: number;
        fromCityId?: number;
        toCityId?: number;
        fromCityName?: string;
        toCityName?: string;
        from?: string;
        to?: string;
    }>;
}
//# sourceMappingURL=search.service.d.ts.map