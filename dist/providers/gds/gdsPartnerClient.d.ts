import { CircuitBreaker } from '../circuitBreaker';
import { GdsCity, GdsSearchParams, GdsBusSearchResult, GdsChartResponse } from '../types';
export declare class GdsPartnerClient {
    private readonly client;
    private readonly authClient;
    private readonly circuitBreaker;
    private readonly partnerLogger;
    constructor(circuitBreaker: CircuitBreaker);
    /**
     * Mantis GET /ota/CityList
     */
    getCityList(): Promise<GdsCity[]>;
    /**
     * Mantis GET /ota/Search
     */
    searchBuses(params: GdsSearchParams): Promise<GdsBusSearchResult[]>;
    /**
     * Mantis GET /ota/Chart
     */
    getSeatChart(busId: number, extraParams?: {
        fromCityId?: number;
        toCityId?: number;
        journeyDate?: string;
    }): Promise<GdsChartResponse>;
    /**
     * Mantis GET /ota/SearchBus
     */
    searchBus(params: {
        busId: number;
        fromCityId: number;
        toCityId: number;
        journeyDate: string;
    }): Promise<GdsBusSearchResult[]>;
}
//# sourceMappingURL=gdsPartnerClient.d.ts.map