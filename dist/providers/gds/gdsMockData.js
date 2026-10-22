"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_CITIES = void 0;
exports.getMockBuses = getMockBuses;
exports.getMockChart = getMockChart;
exports.getMockHoldResponse = getMockHoldResponse;
exports.getMockBookResponse = getMockBookResponse;
exports.getMockBookingStatus = getMockBookingStatus;
exports.getMockIsCancellable = getMockIsCancellable;
exports.getMockCancelResponse = getMockCancelResponse;
exports.getMockBookingDetails = getMockBookingDetails;
exports.getMockBalance = getMockBalance;
exports.MOCK_CITIES = [
    { CityId: 4292, CityName: 'Bengaluru', State: 'Karnataka' },
    { CityId: 4562, CityName: 'Hyderabad', State: 'Telangana' },
    { CityId: 3001, CityName: 'Chennai', State: 'Tamil Nadu' },
    { CityId: 2002, CityName: 'Pune', State: 'Maharashtra' },
    { CityId: 2001, CityName: 'Mumbai', State: 'Maharashtra' },
    { CityId: 1001, CityName: 'Delhi', State: 'Delhi' },
    { CityId: 3002, CityName: 'Coimbatore', State: 'Tamil Nadu' },
    { CityId: 4563, CityName: 'Vijayawada', State: 'Andhra Pradesh' },
    { CityId: 4565, CityName: 'Nellore', State: 'Andhra Pradesh' },
    { CityId: 2003, CityName: 'Latur', State: 'Maharashtra' },
    { CityId: 4564, CityName: 'Visakhapatnam', State: 'Andhra Pradesh' },
    { CityId: 5002, CityName: 'Ahmedabad', State: 'Gujarat' },
    { CityId: 3004, CityName: 'Tiruchirapalli', State: 'Tamil Nadu' },
    { CityId: 1002, CityName: 'Jaipur', State: 'Rajasthan' },
    { CityId: 5001, CityName: 'Goa', State: 'Goa' },
    { CityId: 5003, CityName: 'Surat', State: 'Gujarat' },
    { CityId: 6001, CityName: 'Indore', State: 'Madhya Pradesh' },
    { CityId: 6002, CityName: 'Nagpur', State: 'Maharashtra' },
    { CityId: 3003, CityName: 'Madurai', State: 'Tamil Nadu' },
];
function getMockBuses(fromCityId, toCityId, journeyDate) {
    return [
        {
            RouteBusId: 7001,
            CompanyId: 51,
            CompanyName: 'AROHI TRAVELS(arhv)',
            BusTypeName: 'AC Sleeper (2 + 1)',
            DepartureTime: '22:15',
            ArrivalTime: '06:30',
            TripId: '51:20261018',
            ChartCode: 'AROHI-7001-CHART',
            TotalSeats: 36,
            AvailableSeats: 24,
            BaseFare: 450,
            TotalFare: 499,
            ServiceTax: 49,
            IsAC: true,
            IsSleeper: true,
            BoardingPoints: [
                {
                    PickupCode: 'BP-PUN-01',
                    PickupName: 'Bhosari Natyaghrah Parking',
                    Address: 'Bhosari Natyaghrah Parking, Pune',
                    Landmark: 'Natyaghrah Parking',
                    Contact: '8010097706',
                    PickupTime: '20:30',
                },
                {
                    PickupCode: 'BP-PUN-02',
                    PickupName: 'Ksb Chowk',
                    Address: 'Ksb Chowk, Pune',
                    Landmark: 'Near Chowk',
                    Contact: '8010097706',
                    PickupTime: '20:35',
                },
                {
                    PickupCode: 'BP-PUN-03',
                    PickupName: 'Thermax Chowk',
                    Address: 'Thermax Chowk, Pune',
                    Landmark: 'Thermax',
                    Contact: '8010097706',
                    PickupTime: '20:40',
                },
                {
                    PickupCode: 'BP-PUN-04',
                    PickupName: 'Niadi',
                    Address: 'Niadi Bypass, Pune',
                    Landmark: 'Highway Stop',
                    Contact: '8010097706',
                    PickupTime: '21:00',
                },
            ],
            DroppingPoints: [
                {
                    DropoffCode: 'DP-LAT-01',
                    DropoffName: 'Barshi',
                    DropoffTime: '04:01',
                    Address: 'Barshi Bypass',
                },
                {
                    DropoffCode: 'DP-LAT-02',
                    DropoffName: 'Yedsi',
                    DropoffTime: '04:15',
                    Address: 'Yedsi Bus Stop',
                },
                {
                    DropoffCode: 'DP-LAT-03',
                    DropoffName: 'Dhoki',
                    DropoffTime: '04:30',
                    Address: 'Dhoki Junction',
                },
                {
                    DropoffCode: 'DP-LAT-04',
                    DropoffName: 'Murud Bus Stand',
                    DropoffTime: '04:45',
                    Address: 'Murud Bus Stand, Latur Road',
                },
            ],
            CancellationPolicy: [
                { Amt: 0, Pct: 0, Mins: 10080 },
                { Amt: 0, Pct: 10, Mins: 2880 },
                { Amt: 0, Pct: 70, Mins: 720 },
                { Amt: 0, Pct: 100, Mins: 0 },
            ],
        },
        {
            RouteBusId: 7002,
            CompanyId: 52,
            CompanyName: 'Global Tourist - BLACK HORSE',
            BusTypeName: 'AC Sleeper',
            DepartureTime: '18:00',
            ArrivalTime: '03:52',
            TripId: '52:99102',
            ChartCode: 'GT-7002-CHART',
            TotalSeats: 30,
            AvailableSeats: 20,
            BaseFare: 1000,
            TotalFare: 1119,
            ServiceTax: 119,
            IsAC: true,
            IsSleeper: true,
            BoardingPoints: [
                {
                    PickupCode: 'BP-PUN-02',
                    PickupName: 'Ksb Chowk',
                    Address: 'Ksb Chowk, Pune',
                    PickupTime: '18:00',
                },
            ],
            DroppingPoints: [
                {
                    DropoffCode: 'DP-LAT-04',
                    DropoffName: 'Murud Bus Stand',
                    DropoffTime: '03:52',
                    Address: 'Murud Bus Stand, Latur Road',
                },
            ],
            CancellationPolicy: [
                { Amt: 0, Pct: 10, Mins: 1440 },
                { Amt: 0, Pct: 30, Mins: 360 },
                { Amt: 0, Pct: 100, Mins: 0 },
            ],
        },
        {
            RouteBusId: 7003,
            CompanyId: 53,
            CompanyName: 'RENUKAI TOURISM',
            BusTypeName: 'Ashok Leyland AC Sleeper (2 + 1)',
            DepartureTime: '22:00',
            ArrivalTime: '07:00',
            TripId: '53:44101',
            ChartCode: 'RNK-7003-CHART',
            TotalSeats: 36,
            AvailableSeats: 17,
            BaseFare: 490,
            TotalFare: 550,
            ServiceTax: 60,
            IsAC: true,
            IsSleeper: true,
            BoardingPoints: [
                {
                    PickupCode: 'BP-PUN-01',
                    PickupName: 'Bhosari Natyaghrah Parking',
                    Address: 'Bhosari Natyaghrah Parking, Pune',
                    PickupTime: '22:00',
                },
            ],
            DroppingPoints: [
                {
                    DropoffCode: 'DP-LAT-02',
                    DropoffName: 'Yedsi',
                    DropoffTime: '07:00',
                    Address: 'Yedsi, Latur',
                },
            ],
            CancellationPolicy: [
                { Amt: 0, Pct: 10, Mins: 1440 },
                { Amt: 0, Pct: 50, Mins: 360 },
                { Amt: 0, Pct: 100, Mins: 0 },
            ],
        },
        {
            RouteBusId: 7004,
            CompanyId: 54,
            CompanyName: 'Sky Blue',
            BusTypeName: 'Ashok Leyland NON-AC Seater',
            DepartureTime: '20:30',
            ArrivalTime: '06:30',
            TripId: '54:88921',
            ChartCode: 'SKY-7004-CHART',
            TotalSeats: 40,
            AvailableSeats: 30,
            BaseFare: 450,
            TotalFare: 500,
            ServiceTax: 50,
            IsAC: false,
            IsSleeper: false,
            BoardingPoints: [
                {
                    PickupCode: 'BP-PUN-02',
                    PickupName: 'Ksb Chowk',
                    Address: 'Ksb Chowk, Pune',
                    PickupTime: '20:30',
                },
            ],
            DroppingPoints: [
                {
                    DropoffCode: 'DP-LAT-04',
                    DropoffName: 'Murud Bus Stand',
                    DropoffTime: '06:30',
                    Address: 'Murud, Latur',
                },
            ],
            CancellationPolicy: [
                { Amt: 0, Pct: 20, Mins: 1440 },
                { Amt: 0, Pct: 100, Mins: 0 },
            ],
        },
        {
            RouteBusId: 7005,
            CompanyId: 55,
            CompanyName: 'Savita Tours And Travels',
            BusTypeName: 'Ashok Leyland AC Sleeper',
            DepartureTime: '18:30',
            ArrivalTime: '04:40',
            TripId: '55:33214',
            ChartCode: 'SAV-7005-CHART',
            TotalSeats: 36,
            AvailableSeats: 26,
            BaseFare: 750,
            TotalFare: 850,
            ServiceTax: 100,
            IsAC: true,
            IsSleeper: true,
            BoardingPoints: [
                {
                    PickupCode: 'BP-PUN-01',
                    PickupName: 'Bhosari Natyaghrah Parking',
                    Address: 'Bhosari Natyaghrah Parking, Pune',
                    PickupTime: '18:30',
                },
            ],
            DroppingPoints: [
                {
                    DropoffCode: 'DP-LAT-02',
                    DropoffName: 'Yedsi',
                    DropoffTime: '04:40',
                    Address: 'Yedsi, Latur',
                },
            ],
            CancellationPolicy: [
                { Amt: 0, Pct: 10, Mins: 1440 },
                { Amt: 0, Pct: 30, Mins: 720 },
                { Amt: 0, Pct: 100, Mins: 0 },
            ],
        },
        {
            RouteBusId: 6903,
            CompanyId: 10,
            CompanyName: 'Sri Renu Travels',
            BusTypeName: 'A/C Seater / Sleeper (2+1)',
            DepartureTime: '14:10',
            ArrivalTime: '20:30',
            TripId: '10:48921',
            ChartCode: 'SRT-6903-CHART',
            TotalSeats: 36,
            AvailableSeats: 16,
            BaseFare: 400,
            TotalFare: 449,
            ServiceTax: 49,
            IsAC: true,
            IsSleeper: true,
            BoardingPoints: [
                {
                    PickupCode: 'BP-101',
                    PickupName: 'Koyambedu Omni Bus Stand Front Entrance',
                    Address: 'Omni Bus Stand Front Entrance Near By Indian Oil Pump',
                    Landmark: 'Near Indian Oil Pump',
                    Contact: '9840123456',
                    PickupTime: '14:10',
                },
                {
                    PickupCode: 'BP-102',
                    PickupName: 'Maduravoyal Bypass',
                    Address: 'Near Maduravoyal Bypass Flyover',
                    Landmark: 'Near Maduravoyal Bypass',
                    Contact: '9840123457',
                    PickupTime: '14:25',
                },
                {
                    PickupCode: 'BP-103',
                    PickupName: 'Porur Toll Gate',
                    Address: 'Before Toll Gate Service Road',
                    Landmark: 'Before Toll Gate',
                    Contact: '9840123458',
                    PickupTime: '14:35',
                },
                {
                    PickupCode: 'BP-104',
                    PickupName: 'Perungalathur',
                    Address: 'Under The Bridge, Perungalathur',
                    Landmark: 'Under The Bridge',
                    Contact: '9840123459',
                    PickupTime: '14:50',
                },
                {
                    PickupCode: 'BP-105',
                    PickupName: 'Kilambakkam New Bus Stand',
                    Address: 'Omni bus bay 10 to 14, KCBT',
                    Landmark: 'Bay 10 to 14',
                    Contact: '9840123460',
                    PickupTime: '15:20',
                },
                {
                    PickupCode: 'BP-106',
                    PickupName: 'Guduvancheri',
                    Address: 'Near Bus terminal, GST Road',
                    Landmark: 'Near Bus terminal',
                    Contact: '9840123461',
                    PickupTime: '15:25',
                },
                {
                    PickupCode: 'BP-107',
                    PickupName: 'SRM University Chennai',
                    Address: 'Infront Of SRM University Chennai, GST Road',
                    Landmark: 'SRM College Gate',
                    Contact: '9840123462',
                    PickupTime: '15:40',
                },
                {
                    PickupCode: 'BP-108',
                    PickupName: 'Maraimalar Nagar',
                    Address: 'Maraimalar Nagar, GST Road',
                    Landmark: 'Near Flyover',
                    Contact: '9840123463',
                    PickupTime: '15:45',
                },
            ],
            DroppingPoints: [
                {
                    DropoffCode: 'DP-201',
                    DropoffName: 'SRM College',
                    DropoffTime: '20:25',
                    Address: 'Near Front gate SRM College gate',
                    Landmark: 'SRM Gate',
                },
                {
                    DropoffCode: 'DP-202',
                    DropoffName: 'Samayapuram',
                    DropoffTime: '20:30',
                    Address: 'Samayapuram Toll Plaza',
                    Landmark: 'Toll Plaza',
                },
                {
                    DropoffCode: 'DP-203',
                    DropoffName: 'No 1 Toll Gate',
                    DropoffTime: '20:40',
                    Address: 'Near No 1 Toll gate, Trichy',
                    Landmark: 'Toll Gate',
                },
                {
                    DropoffCode: 'DP-204',
                    DropoffName: 'Central Bus Stand',
                    DropoffTime: '21:00',
                    Address: 'Opposite Railway Junction, Trichy',
                    Landmark: 'Central Bus Stand',
                },
            ],
            CancellationPolicy: [
                { Amt: 0, Pct: 10, Mins: 1440 }, // Before 24h: 90% refund (10% charge)
                { Amt: 0, Pct: 25, Mins: 720 }, // 12-24h: 75% refund (25% charge)
                { Amt: 0, Pct: 50, Mins: 360 }, // 6-12h: 50% refund (50% charge)
                { Amt: 0, Pct: 75, Mins: 180 }, // 3-6h: 25% refund (75% charge)
                { Amt: 0, Pct: 100, Mins: 0 }, // < 3h: No refund
            ],
        },
        {
            RouteBusId: 6904,
            CompanyId: 18,
            CompanyName: 'IntrCity SmartBus.AQI',
            BusTypeName: 'A/C Seater / Sleeper (2+1)',
            DepartureTime: '23:00',
            ArrivalTime: '05:40',
            TripId: '18:99201',
            ChartCode: 'ICB-6904-CHART',
            TotalSeats: 42,
            AvailableSeats: 14,
            BaseFare: 410,
            TotalFare: 459,
            ServiceTax: 49,
            IsAC: true,
            IsSleeper: true,
            BoardingPoints: [
                {
                    PickupCode: 'BP-101',
                    PickupName: 'Koyambedu Omni Bus Stand Front Entrance',
                    Address: 'Omni Bus Stand Front Entrance Near By Indian Oil Pump',
                    PickupTime: '23:00',
                },
                {
                    PickupCode: 'BP-105',
                    PickupName: 'Kilambakkam New Bus Stand',
                    Address: 'Omni bus bay 10 to 14, KCBT',
                    PickupTime: '23:45',
                },
            ],
            DroppingPoints: [
                {
                    DropoffCode: 'DP-202',
                    DropoffName: 'Samayapuram',
                    DropoffTime: '05:20',
                },
                {
                    DropoffCode: 'DP-204',
                    DropoffName: 'Central Bus Stand',
                    DropoffTime: '05:40',
                },
            ],
            CancellationPolicy: [
                { Amt: 0, Pct: 10, Mins: 1440 },
                { Amt: 0, Pct: 25, Mins: 720 },
                { Amt: 0, Pct: 50, Mins: 360 },
                { Amt: 0, Pct: 100, Mins: 0 },
            ],
        },
        {
            RouteBusId: 6905,
            CompanyId: 19,
            CompanyName: 'IntrCity SmartBus',
            BusTypeName: 'A/C Seater / Sleeper (2+1)',
            DepartureTime: '23:45',
            ArrivalTime: '05:40',
            TripId: '19:99202',
            ChartCode: 'ICB-6905-CHART',
            TotalSeats: 42,
            AvailableSeats: 10,
            BaseFare: 435,
            TotalFare: 489,
            ServiceTax: 54,
            IsAC: true,
            IsSleeper: true,
            BoardingPoints: [
                {
                    PickupCode: 'BP-101',
                    PickupName: 'Koyambedu Omni Bus Stand Front Entrance',
                    Address: 'Omni Bus Stand Front Entrance Near By Indian Oil Pump',
                    PickupTime: '23:45',
                },
            ],
            DroppingPoints: [
                {
                    DropoffCode: 'DP-204',
                    DropoffName: 'Central Bus Stand',
                    DropoffTime: '05:40',
                },
            ],
            CancellationPolicy: [
                { Amt: 0, Pct: 10, Mins: 1440 },
                { Amt: 0, Pct: 25, Mins: 720 },
                { Amt: 0, Pct: 50, Mins: 360 },
                { Amt: 0, Pct: 100, Mins: 0 },
            ],
        },
        {
            RouteBusId: 6901,
            CompanyId: 15,
            CompanyName: 'VRL Travels',
            BusTypeName: 'Volvo Multi-Axle I-Shift A/C Sleeper (2+1)',
            DepartureTime: `${journeyDate} 21:00:00`,
            ArrivalTime: `${journeyDate} 06:30:00`,
            TripId: '15:46754',
            ChartCode: 'VRL-6901-CHART',
            TotalSeats: 36,
            AvailableSeats: 18,
            BaseFare: 950,
            TotalFare: 1050,
            ServiceTax: 100,
            IsAC: true,
            IsSleeper: true,
            BoardingPoints: [
                {
                    PickupCode: '44953',
                    PickupName: 'Majestic Anand Rao Circle',
                    Address: 'Anand Rao Circle, Majestic, Bangalore',
                    Landmark: 'Opposite State Bank',
                    Contact: '9888800001',
                    PickupTime: `${journeyDate} 21:00:00`,
                },
                {
                    PickupCode: '44954',
                    PickupName: 'Madiwala',
                    Address: 'Near Total Mall, Madiwala, Bangalore',
                    Landmark: 'Near petrol pump',
                    Contact: '9888800002',
                    PickupTime: `${journeyDate} 21:45:00`,
                },
            ],
            DroppingPoints: [
                {
                    DropoffCode: '750',
                    DropoffName: 'Ameerpet',
                    DropoffTime: `${journeyDate} 06:00:00`,
                },
                {
                    DropoffCode: '751',
                    DropoffName: 'MGBS Bus Stand',
                    DropoffTime: `${journeyDate} 06:30:00`,
                },
            ],
            CancellationPolicy: [
                { Amt: 0, Pct: 10, Mins: 1440 },
                { Amt: 0, Pct: 25, Mins: 720 },
                { Amt: 0, Pct: 50, Mins: 360 },
                { Amt: 0, Pct: 100, Mins: 0 },
            ],
        },
        {
            RouteBusId: 6902,
            CompanyId: 22,
            CompanyName: 'Orange Tours and Travels',
            BusTypeName: 'Scania AC Multi Axle Semi Sleeper (2+2)',
            DepartureTime: `${journeyDate} 22:30:00`,
            ArrivalTime: `${journeyDate} 07:45:00`,
            TripId: '22:88412',
            ChartCode: 'ORG-6902-CHART',
            TotalSeats: 44,
            AvailableSeats: 22,
            BaseFare: 800,
            TotalFare: 890,
            ServiceTax: 90,
            IsAC: true,
            IsSleeper: false,
            BoardingPoints: [
                {
                    PickupCode: '44960',
                    PickupName: 'Kallada HSR Layout',
                    Address: 'Sector 2, HSR Layout, Bangalore',
                    PickupTime: `${journeyDate} 22:30:00`,
                },
            ],
            DroppingPoints: [
                {
                    DropoffCode: '750',
                    DropoffName: 'Ameerpet',
                    DropoffTime: `${journeyDate} 07:45:00`,
                },
            ],
            CancellationPolicy: [
                { Amt: 0, Pct: 10, Mins: 1440 },
                { Amt: 0, Pct: 30, Mins: 360 },
                { Amt: 0, Pct: 100, Mins: 0 },
            ],
        },
    ];
}
function getMockChart(busId) {
    // Comprehensive realistic 2+1 layout matching reference images (ref-6, ref-7, ref-8, ref-12)
    const layout = [
        // Lower Deck (Deck 1): Sleeper berth on left (length 2, width 1), 2 seater chairs on right
        // Row 1
        { seq_no: 1, seat_no: 'L1', seat_type: 2, deck: 1, row: 1, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 850, total_fare: 949, service_tax: 99 },
        { seq_no: 2, seat_no: 'L2', seat_type: 1, deck: 1, row: 1, column: 2, length: 1, width: 1, seat_status: 1, base_fare: 450, total_fare: 499, service_tax: 49 },
        { seq_no: 3, seat_no: 'L3', seat_type: 1, deck: 1, row: 1, column: 3, length: 1, width: 1, seat_status: 1, base_fare: 450, total_fare: 499, service_tax: 49 },
        // Row 2
        { seq_no: 4, seat_no: 'L4', seat_type: 2, deck: 1, row: 2, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 850, total_fare: 949, service_tax: 99 },
        { seq_no: 5, seat_no: 'L5', seat_type: 1, deck: 1, row: 2, column: 2, length: 1, width: 1, seat_status: 1, base_fare: 450, total_fare: 499, service_tax: 49 },
        { seq_no: 6, seat_no: 'L6', seat_type: 1, deck: 1, row: 2, column: 3, length: 1, width: 1, seat_status: 1, base_fare: 450, total_fare: 499, service_tax: 49 },
        // Row 3 (Ladies row)
        { seq_no: 7, seat_no: 'L7', seat_type: 2, deck: 1, row: 3, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 850, total_fare: 949, service_tax: 99 },
        { seq_no: 8, seat_no: 'L8', seat_type: 1, deck: 1, row: 3, column: 2, length: 1, width: 1, seat_status: 3, base_fare: 450, total_fare: 499, service_tax: 49 }, // Ladies available
        { seq_no: 9, seat_no: 'L9', seat_type: 1, deck: 1, row: 3, column: 3, length: 1, width: 1, seat_status: -3, base_fare: 450, total_fare: 499, service_tax: 49 }, // Sold (female)
        // Row 4
        { seq_no: 10, seat_no: 'L10', seat_type: 2, deck: 1, row: 4, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 850, total_fare: 949, service_tax: 99 },
        { seq_no: 11, seat_no: 'L11', seat_type: 1, deck: 1, row: 4, column: 2, length: 1, width: 1, seat_status: 3, base_fare: 450, total_fare: 499, service_tax: 49 },
        { seq_no: 12, seat_no: 'L12', seat_type: 1, deck: 1, row: 4, column: 3, length: 1, width: 1, seat_status: -3, base_fare: 450, total_fare: 499, service_tax: 49 },
        // Row 5 (Sold row)
        { seq_no: 13, seat_no: 'L13', seat_type: 2, deck: 1, row: 5, column: 1, length: 2, width: 1, seat_status: 0, base_fare: 850, total_fare: 949, service_tax: 99 },
        { seq_no: 14, seat_no: 'L14', seat_type: 1, deck: 1, row: 5, column: 2, length: 1, width: 1, seat_status: 0, base_fare: 450, total_fare: 499, service_tax: 49 },
        { seq_no: 15, seat_no: 'L15', seat_type: 1, deck: 1, row: 5, column: 3, length: 1, width: 1, seat_status: 0, base_fare: 450, total_fare: 499, service_tax: 49 },
        // Row 6 (Male booked / available)
        { seq_no: 16, seat_no: 'L16', seat_type: 2, deck: 1, row: 6, column: 1, length: 2, width: 1, seat_status: 0, base_fare: 850, total_fare: 949, service_tax: 99 },
        { seq_no: 17, seat_no: 'L17', seat_type: 1, deck: 1, row: 6, column: 2, length: 1, width: 1, seat_status: 2, base_fare: 450, total_fare: 499, service_tax: 49 }, // Male
        { seq_no: 18, seat_no: 'L18', seat_type: 1, deck: 1, row: 6, column: 3, length: 1, width: 1, seat_status: -2, base_fare: 450, total_fare: 499, service_tax: 49 }, // Sold male
        // Row 7
        { seq_no: 19, seat_no: 'L19', seat_type: 2, deck: 1, row: 7, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 850, total_fare: 949, service_tax: 99 },
        { seq_no: 20, seat_no: 'L20', seat_type: 1, deck: 1, row: 7, column: 2, length: 1, width: 1, seat_status: 1, base_fare: 450, total_fare: 499, service_tax: 49 },
        { seq_no: 21, seat_no: 'L21', seat_type: 1, deck: 1, row: 7, column: 3, length: 1, width: 1, seat_status: 1, base_fare: 450, total_fare: 499, service_tax: 49 },
        // Row 8
        { seq_no: 22, seat_no: 'L22', seat_type: 2, deck: 1, row: 8, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 850, total_fare: 949, service_tax: 99 },
        { seq_no: 23, seat_no: 'L23', seat_type: 1, deck: 1, row: 8, column: 2, length: 1, width: 1, seat_status: 1, base_fare: 450, total_fare: 499, service_tax: 49 },
        { seq_no: 24, seat_no: 'L24', seat_type: 1, deck: 1, row: 8, column: 3, length: 1, width: 1, seat_status: 1, base_fare: 450, total_fare: 499, service_tax: 49 },
        // Upper Deck (Deck 2): 1+2 Sleeper berths
        // Row 1
        { seq_no: 25, seat_no: 'U1', seat_type: 2, deck: 2, row: 1, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 800, total_fare: 899, service_tax: 99 },
        { seq_no: 26, seat_no: 'U2', seat_type: 2, deck: 2, row: 1, column: 2, length: 2, width: 1, seat_status: 1, base_fare: 720, total_fare: 799, service_tax: 79 },
        { seq_no: 27, seat_no: 'U3', seat_type: 2, deck: 2, row: 1, column: 3, length: 2, width: 1, seat_status: 1, base_fare: 720, total_fare: 799, service_tax: 79 },
        // Row 2
        { seq_no: 28, seat_no: 'U4', seat_type: 2, deck: 2, row: 2, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 800, total_fare: 899, service_tax: 99 },
        { seq_no: 29, seat_no: 'U5', seat_type: 2, deck: 2, row: 2, column: 2, length: 2, width: 1, seat_status: -3, base_fare: 720, total_fare: 799, service_tax: 79 }, // Sold female
        { seq_no: 30, seat_no: 'U6', seat_type: 2, deck: 2, row: 2, column: 3, length: 2, width: 1, seat_status: -2, base_fare: 720, total_fare: 799, service_tax: 79 }, // Sold male
        // Row 3
        { seq_no: 31, seat_no: 'U7', seat_type: 2, deck: 2, row: 3, column: 1, length: 2, width: 1, seat_status: 0, base_fare: 800, total_fare: 899, service_tax: 99 },
        { seq_no: 32, seat_no: 'U8', seat_type: 2, deck: 2, row: 3, column: 2, length: 2, width: 1, seat_status: 0, base_fare: 720, total_fare: 799, service_tax: 79 },
        { seq_no: 33, seat_no: 'U9', seat_type: 2, deck: 2, row: 3, column: 3, length: 2, width: 1, seat_status: 0, base_fare: 720, total_fare: 799, service_tax: 79 },
        // Row 4
        { seq_no: 34, seat_no: 'U10', seat_type: 2, deck: 2, row: 4, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 800, total_fare: 899, service_tax: 99 },
        { seq_no: 35, seat_no: 'U11', seat_type: 2, deck: 2, row: 4, column: 2, length: 2, width: 1, seat_status: 1, base_fare: 720, total_fare: 799, service_tax: 79 },
        { seq_no: 36, seat_no: 'U12', seat_type: 2, deck: 2, row: 4, column: 3, length: 2, width: 1, seat_status: 1, base_fare: 720, total_fare: 799, service_tax: 79 },
    ];
    const mockBuses = getMockBuses(0, 0, new Date().toISOString().slice(0, 10));
    const matchedBus = mockBuses.find((b) => b.RouteBusId === busId);
    return {
        BusId: busId,
        BusTypeName: matchedBus?.BusTypeName || 'A/C Seater / Sleeper (2+1)',
        CompanyName: matchedBus?.CompanyName || 'Sri Renu Travels',
        DepartureTime: matchedBus?.DepartureTime || '14:10',
        ArrivalTime: matchedBus?.ArrivalTime || '20:30',
        TotalSeats: matchedBus?.TotalSeats || 36,
        AvailableSeats: matchedBus?.AvailableSeats || 16,
        Layout: layout,
        BoardingPoints: matchedBus?.BoardingPoints?.length ? matchedBus.BoardingPoints : [
            {
                PickupCode: 'BP-101',
                PickupName: 'Koyambedu Omni Bus Stand Front Entrance',
                Address: 'Omni Bus Stand Front Entrance Near By Indian Oil Pump',
                Landmark: 'Near Indian Oil Pump',
                Contact: '9840123456',
                PickupTime: '14:10',
            },
            {
                PickupCode: 'BP-102',
                PickupName: 'Maduravoyal Bypass',
                Address: 'Near Maduravoyal Bypass Flyover',
                Landmark: 'Near Maduravoyal Bypass',
                Contact: '9840123457',
                PickupTime: '14:25',
            },
            {
                PickupCode: 'BP-103',
                PickupName: 'Porur Toll Gate',
                Address: 'Before Toll Gate Service Road',
                Landmark: 'Before Toll Gate',
                Contact: '9840123458',
                PickupTime: '14:35',
            },
            {
                PickupCode: 'BP-104',
                PickupName: 'Perungalathur',
                Address: 'Under The Bridge, Perungalathur',
                Landmark: 'Under The Bridge',
                Contact: '9840123459',
                PickupTime: '14:50',
            },
            {
                PickupCode: 'BP-105',
                PickupName: 'Kilambakkam New Bus Stand',
                Address: 'Omni bus bay 10 to 14, KCBT',
                Landmark: 'Bay 10 to 14',
                Contact: '9840123460',
                PickupTime: '15:20',
            },
            {
                PickupCode: 'BP-106',
                PickupName: 'Guduvancheri',
                Address: 'Near Bus terminal, GST Road',
                Landmark: 'Near Bus terminal',
                Contact: '9840123461',
                PickupTime: '15:25',
            },
            {
                PickupCode: 'BP-107',
                PickupName: 'SRM University Chennai',
                Address: 'Infront Of SRM University Chennai, GST Road',
                Landmark: 'SRM College Gate',
                Contact: '9840123462',
                PickupTime: '15:40',
            },
        ],
        DroppingPoints: matchedBus?.DroppingPoints?.length ? matchedBus.DroppingPoints : [
            {
                DropoffCode: 'DP-201',
                DropoffName: 'SRM College',
                DropoffTime: '20:25',
                Address: 'Near Front gate SRM College gate',
                Landmark: 'SRM Gate',
            },
            {
                DropoffCode: 'DP-202',
                DropoffName: 'Samayapuram',
                DropoffTime: '20:30',
                Address: 'Samayapuram Toll Plaza',
                Landmark: 'Toll Plaza',
            },
            {
                DropoffCode: 'DP-203',
                DropoffName: 'No 1 Toll Gate',
                DropoffTime: '20:40',
                Address: 'Near No 1 Toll gate, Trichy',
                Landmark: 'Toll Gate',
            },
            {
                DropoffCode: 'DP-204',
                DropoffName: 'Central Bus Stand',
                DropoffTime: '21:00',
                Address: 'Opposite Railway Junction, Trichy',
                Landmark: 'Central Bus Stand',
            },
        ],
        CancellationPolicy: matchedBus?.CancellationPolicy?.length ? matchedBus.CancellationPolicy : [
            { Amt: 0, Pct: 10, Mins: 1440 },
            { Amt: 0, Pct: 25, Mins: 720 },
            { Amt: 0, Pct: 50, Mins: 360 },
            { Amt: 0, Pct: 75, Mins: 180 },
            { Amt: 0, Pct: 100, Mins: 0 },
        ],
    };
}
function getMockHoldResponse(totalFare) {
    const holdId = Math.floor(18000000 + Math.random() * 900000);
    return {
        HoldId: holdId,
        Status: 1,
        Message: 'Seats held successfully',
        TotalFare: totalFare,
        ExpiryMinutes: 10,
    };
}
function getMockBookResponse(holdId, totalFare) {
    return {
        HoldId: holdId,
        TicketNo: `TKT${Date.now().toString().slice(-8)}`,
        PNRNo: `PNR${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        Status: 1,
        Message: 'Booking confirmed successfully',
        TotalFare: totalFare,
    };
}
function getMockBookingStatus(holdId) {
    return {
        HoldId: holdId,
        Status: 1,
        TicketNo: `TKT${Date.now().toString().slice(-8)}`,
        PNRNo: `PNR${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        Message: 'Booking confirmed',
    };
}
function getMockIsCancellable(ticketNo) {
    return {
        IsCancellable: true,
        RefundPercentage: 75,
        CancellationCharge: 262.5,
        RefundAmount: 787.5,
        Message: 'Ticket is cancellable',
    };
}
function getMockCancelResponse(refundAmount, chargeAmount) {
    return {
        Status: 1,
        NewHoldId: `NEW-HOLD-${Date.now()}`,
        NewTicketNo: `NEW-TKT-${Date.now().toString().slice(-6)}`,
        NewPNRNo: `NEW-PNR-${Date.now().toString().slice(-6)}`,
        RefundAmount: refundAmount,
        CancellationCharge: chargeAmount,
        Message: 'Seats cancelled successfully',
    };
}
function getMockBookingDetails(pnr, ticketNo) {
    return {
        PNRNo: pnr,
        TicketNo: ticketNo,
        Status: 'CONFIRMED',
        BusId: 6901,
        OperatorName: 'VRL Travels',
        FromCity: 'Bangalore',
        ToCity: 'Hyderabad',
        JourneyDate: '2026-10-15',
        DepartureTime: '21:00:00',
        ArrivalTime: '06:30:00',
        TotalFare: 1050,
        Seats: [
            {
                SeatNo: 'L1',
                PassengerName: 'John Doe',
                Gender: 'M',
                Age: 30,
                Fare: 1050,
            },
        ],
    };
}
function getMockBalance() {
    return {
        Balance: 250000.0,
        Currency: 'INR',
    };
}
//# sourceMappingURL=gdsMockData.js.map