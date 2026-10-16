export declare class CitiesService {
    private static instance;
    private gdsAdapter;
    private citiesLogger;
    private constructor();
    static getInstance(): CitiesService;
    getCities(query?: string): Promise<{
        id: string;
        providerCityId: number;
        name: string;
        City: string;
        CityId: number;
        State?: string;
    }[]>;
    private syncCitiesSafe;
    syncCities(): Promise<number>;
}
//# sourceMappingURL=cities.service.d.ts.map