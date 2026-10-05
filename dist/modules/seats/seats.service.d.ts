import { GdsChartResponse } from '../../providers/types';
export declare class SeatsService {
    private static instance;
    private gdsAdapter;
    private seatsLogger;
    private constructor();
    static getInstance(): SeatsService;
    getSeatChart(busId: number): Promise<GdsChartResponse>;
}
//# sourceMappingURL=seats.service.d.ts.map