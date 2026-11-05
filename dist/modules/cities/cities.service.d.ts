type CityResult = {
    id: string;
    providerCityId: number;
    name: string;
    City: string;
    CityId: number;
    State?: string;
};
export declare class CitiesService {
    private static instance;
    private cityCache?;
    private loadingCities?;
    private gdsAdapter;
    private citiesLogger;
    private constructor();
    static getInstance(): CitiesService;
    private loadCities;
    getCities(query?: string, limit?: number, popular?: boolean): Promise<CityResult[]>;
    syncCities(): Promise<number>;
}
export {};
//# sourceMappingURL=cities.service.d.ts.map