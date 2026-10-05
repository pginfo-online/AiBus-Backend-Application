import { SearchBusesQuery } from './search.validation';
import { GdsBusSearchResult } from '../../providers/types';
export declare class SearchService {
    private static instance;
    private gdsAdapter;
    private searchLogger;
    private constructor();
    static getInstance(): SearchService;
    searchBuses(query: SearchBusesQuery): Promise<{
        results: GdsBusSearchResult[];
        total: number;
    }>;
}
//# sourceMappingURL=search.service.d.ts.map