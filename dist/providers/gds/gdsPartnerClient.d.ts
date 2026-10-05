import { CircuitBreaker } from '../circuitBreaker';
import { GdsCity, GdsSearchParams, GdsBusSearchResult, GdsChartResponse } from '../types';
export declare class GdsPartnerClient {
    private readonly client;
    private readonly authClient;
    private readonly circuitBreaker;
    private readonly partnerLogger;
    constructor(circuitBreaker: CircuitBreaker);
    getCityList(): Promise<GdsCity[]>;
    searchBuses(params: GdsSearchParams): Promise<GdsBusSearchResult[]>;
    getSeatChart(busId: number): Promise<GdsChartResponse>;
}
//# sourceMappingURL=gdsPartnerClient.d.ts.map