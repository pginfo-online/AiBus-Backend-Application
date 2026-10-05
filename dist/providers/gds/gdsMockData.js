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
    { CityId: 4292, CityName: 'Bangalore' },
    { CityId: 4562, CityName: 'Hyderabad' },
    { CityId: 3001, CityName: 'Chennai' },
    { CityId: 2001, CityName: 'Mumbai' },
    { CityId: 2002, CityName: 'Pune' },
    { CityId: 1001, CityName: 'Delhi' },
    { CityId: 1002, CityName: 'Jaipur' },
    { CityId: 5001, CityName: 'Goa' },
    { CityId: 3002, CityName: 'Coimbatore' },
    { CityId: 4563, CityName: 'Vijayawada' },
];
function getMockBuses(fromCityId, toCityId, journeyDate) {
    return [
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
                { Amt: 0, Pct: 10, Mins: 1440 }, // > 24 hours: 10%
                { Amt: 0, Pct: 25, Mins: 720 }, // 12 - 24 hours: 25%
                { Amt: 0, Pct: 50, Mins: 360 }, // 6 - 12 hours: 50%
                { Amt: 0, Pct: 100, Mins: 0 }, // < 6 hours: 100%
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
    const layout = [
        // Lower Deck (Deck 1)
        { seq_no: 1, seat_no: 'L1', seat_type: 2, deck: 1, row: 1, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 950, total_fare: 1050, service_tax: 100 },
        { seq_no: 2, seat_no: 'L2', seat_type: 2, deck: 1, row: 1, column: 2, length: 2, width: 1, seat_status: 1, base_fare: 950, total_fare: 1050, service_tax: 100 },
        { seq_no: 3, seat_no: 'L3', seat_type: 2, deck: 1, row: 2, column: 1, length: 2, width: 1, seat_status: 2, base_fare: 950, total_fare: 1050, service_tax: 100 }, // Male only
        { seq_no: 4, seat_no: 'L4', seat_type: 2, deck: 1, row: 2, column: 2, length: 2, width: 1, seat_status: 3, base_fare: 950, total_fare: 1050, service_tax: 100 }, // Female only
        { seq_no: 5, seat_no: 'L5', seat_type: 2, deck: 1, row: 3, column: 1, length: 2, width: 1, seat_status: -2, base_fare: 950, total_fare: 1050, service_tax: 100 }, // Booked by M
        { seq_no: 6, seat_no: 'L6', seat_type: 2, deck: 1, row: 3, column: 2, length: 2, width: 1, seat_status: 1, base_fare: 950, total_fare: 1050, service_tax: 100 },
        // Upper Deck (Deck 2)
        { seq_no: 7, seat_no: 'U1', seat_type: 2, deck: 2, row: 1, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 1050, total_fare: 1160, service_tax: 110 },
        { seq_no: 8, seat_no: 'U2', seat_type: 2, deck: 2, row: 1, column: 2, length: 2, width: 1, seat_status: 1, base_fare: 1050, total_fare: 1160, service_tax: 110 },
        { seq_no: 9, seat_no: 'U3', seat_type: 2, deck: 2, row: 2, column: 1, length: 2, width: 1, seat_status: 1, base_fare: 1050, total_fare: 1160, service_tax: 110 },
        { seq_no: 10, seat_no: 'U4', seat_type: 2, deck: 2, row: 2, column: 2, length: 2, width: 1, seat_status: 1, base_fare: 1050, total_fare: 1160, service_tax: 110 },
    ];
    return {
        BusId: busId,
        BusTypeName: 'Volvo Multi-Axle I-Shift A/C Sleeper (2+1)',
        CompanyName: 'VRL Travels',
        DepartureTime: '21:00:00',
        ArrivalTime: '06:30:00',
        TotalSeats: 36,
        AvailableSeats: 8,
        Layout: layout,
        BoardingPoints: [
            {
                PickupCode: '44953',
                PickupName: 'Majestic Anand Rao Circle',
                Address: 'Anand Rao Circle, Majestic, Bangalore',
                PickupTime: '21:00:00',
            },
        ],
        DroppingPoints: [
            {
                DropoffCode: '750',
                DropoffName: 'Ameerpet',
                DropoffTime: '06:00:00',
            },
        ],
        CancellationPolicy: [
            { Amt: 0, Pct: 10, Mins: 1440 },
            { Amt: 0, Pct: 25, Mins: 720 },
            { Amt: 0, Pct: 50, Mins: 360 },
            { Amt: 0, Pct: 100, Mins: 0 },
        ],
    };
}
function getMockHoldResponse(totalFare) {
    const holdId = `GDS-HOLD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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