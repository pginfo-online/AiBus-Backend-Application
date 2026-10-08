Default datetime format is yyyy-mm-dd HH:MM:SS e.g. 2017-12-20 23:59:59. This format is used for departure time, arrival time, pickup time, dropoff .time



Default date format is yyyy-mm-dd e.g. 2017-12-20. This format is used for journey date




Cache access-token at your end for 24 hours and pass in different api calls.

Try using a rest client library which supports compression and decomression like gzip. Make sure it passes Accept-Encoding : gzip in request headers. It reduces network bandwidth usage and gives better response time.


--------------------------------------------------------------------


server url : 

https://partnerapi.iamgds.com/



1) Auth


POST
/ota/v1/Auth
This api is used to create an Access Token.
For different api calls, access-token must be passed in headers. An access-token can be created using this api.

It will be valid for next 90 mins.
To create access-token, ClientId and ClientSecret are required.
This api must be called from your server. Keep your ClientSecret safe.
Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "ClientId": 50,
  "ClientSecret": "XXXXXX2fXXXXXXXXXXXXXXXX"
}
Responses
Code	Description	Links
200	
OK

Media type

application/json
Controls Accept header.
Example Value
Schema
"B96A44897AB974287467066A090B1E18|50-S|201706091210|test|FFFF"




2) CityList


GET
/ota/CityList
To Get All Cities.

It returns list of cities with CityId, City and State. It may contain multiple entries for same CityId with different City. It means both City represent same geographical city e.g. Bangalore and Bengaluru will have same CityId.


Parameters- 
No parameters


Responses
Code	Description	Links
200	
OK

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "success": true,
  "data": [
    {
      "CityId": 4292,
      "City": "Bangalore",
      "State": "Karnataka"
    },
    {
      "CityId": 4292,
      "City": "Bengaluru",
      "State": "Karnataka"
    },
    {
      "CityId": 4562,
      "City": "Chennai",
      "State": "Tamil Nadu"
    }
  ]
}







3) Search

GET
/ota/Search
To get available buses for given from city,to city and journey date.

It returns list of buses which are available for bookings between given from city and to city on given journey date. It also provides additional informations like pickups, drop-offs, cancellation policy, bus details, discount details of the bus.




Parameters

Name	Description
fromCityId *
integer($int32)
(query)
Default value : 4292

4292
toCityId *
integer($int32)
(query)
Default value : 4562

4562
journeyDate *
string
(query)
Default value : 2022-06-30T00:00:00.000Z

2022-06-30T00:00:00.000Z





Responses
Code	Description	Links
200	
OK

Media type

application/json
Controls Accept header.
Example Value
Schema







{
  "success": true,
  "data": {
    "ToCityId": 4562,
    "FromCityId": 4292,
    "Buses": [
      {
        "NonRefundable": false,
        "MTicket": true,
        "CompanyId": 3963,
        "ProvCompId": 0,
        "ProvId": 15,
        "RouteBusId": 1,
        "BusType": {
          "IsAC": "NON_AC",
          "Seating": "SEATER",
          "Make": "NORMAL",
          "Axle": "SINGLE_AXLE",
          "Axel": "SINGLE_AXLE"
        },
        "Pickups": [
          {
            "PickupTime": "2022-06-30T05:00:00.000Z",
            "PickupArea": "",
            "PickupName": "Anand rao circle",
            "PickupCode": "39436"
          },
          {
            "PickupTime": "2022-06-30T07:00:00.000Z",
            "PickupArea": "",
            "PickupName": "Silk board",
            "PickupCode": "44953"
          }
        ],
        "Dropoffs": [
          {
            "DropoffTime": "2022-06-30T18:00:00.000Z",
            "DropoffName": "Koyambedu",
            "DropoffCode": "750"
          },
        ],
        "Canc": [
          {
            "Amt": 0,
            "Pct": 100,
            "Mins": 0
          },
          {
            "Amt": 0,
            "Pct": 10,
            "Mins": 600
          }
        ],
        "Amenities": [
          5,
          3,
          7,
          8
        ],
        "BusStatus": {
          "Availability": 35,
          "RouteBusId": 1,
          "BaseFares": [
            50,
            0
          ],
          "TotalTax": 0
        },
        "Visibility": true,
        "CommPct": 8,
        "CompanySuffix": "naveen",
        "ToName": "Chennai",
        "FromName": "Bangalore",
        "ChartCode": "vSDCYTWm5EIekpgIqKE8dQ==|7xJuLAQ5S00rRYJLMIjlNg==",
        "Duration": "12:0",
        "BusLabel": "2X2(35) NAC Seater  2 2 pushback non a/c",
        "CompanyName": "GDS Demo Test",
        "ArrTime": "2022-06-30T18:00:00.000Z",
        "DeptTime": "2022-06-30T06:00:00.000Z",
        "TripId": "15:46754"
      },
      {
        "NonRefundable": false,
        "MTicket": true,
        "CompanyId": 3963,
        "ProvCompId": 0,
        "ProvId": 15,
        "RouteBusId": 2,
        "BusType": {
          "IsAC": "AC",
          "Seating": "SEATER_SEMI_SLEEPER",
          "Make": "MERCEDES",
          "Axle": "SINGLE_AXLE",
          "Axel": "SINGLE_AXLE"
        },
        "Pickups": [
          {
            "PickupTime": "2022-06-30T18:55:00.000Z",
            "PickupArea": "",
            "PickupName": "Silk board",
            "PickupCode": "44953"
          },
          {
            "PickupTime": "2022-06-30T22:00:00.000Z",
            "PickupArea": "",
            "PickupName": "Hosur",
            "PickupCode": "44957"
          }
        ],
        "Dropoffs": [
          {
            "DropoffTime": "2022-06-30T04:30:00.000Z",
            "DropoffName": "Airport",
            "DropoffCode": "81897"
          }
        ],
        "Canc": [
          {
            "Amt": 0,
            "Pct": 100,
            "Mins": 0
          },
          {
            "Amt": 0,
            "Pct": 10,
            "Mins": 600
          }
        ],
        "Amenities": [],
        "BusStatus": {
          "Availability": 60,
          "RouteBusId": 2,
          "BaseFares": [
            3000,
            0
          ],
          "TotalTax": 6
        },
        "Visibility": true,
        "CommPct": 8,
        "ToName": "Chennai",
        "FromName": "Bangalore",
        "ChartCode": "iqDaGmlY4fRXApNFY0rC-Q==|49I-RN-lkDek9TsutLQT7g==",
        "Duration": "6:30",
        "BusLabel": "2X2(60) AC -Semisleeper-Sleeper  Mercedes Benz",
        "CompanyName": "GDS Demo Test",
        "ArrTime": "2022-06-30T04:30:00.000Z",
        "DeptTime": "2022-06-30T22:00:00.000Z",
        "TripId": "15:32982"
      }
    ],
    "AllAmenities": [
      "Blanket",
      "Water_Bottle",
      "TV",
      "WiFi",
      "Toilet",
      "Charging_Point",
      "Personal_TV",
      "Snacks",
      "GPS",
      "Newspaper",
      "Emergency_Exit",
      "Facial_Tissues",
      "Fire_Extinguisher",
      "Hammer",
      "Reading_Light",
      "Pillow",
      "Headsets"
    ],
    "JourneyDate": "2022-06-30T00:00:00.000Z"
  }
}








4) Chart


GET
/ota/Chart
This API is executed when the user selects a bus and then attempts to see the seat chart of a bus.

All the chart related information is provided by this API. Assumption is that the source, destination and journey date has been punched in by the user prior to opening the seat chart. The seat chart contains information about the booked seats, available seats along with the gender constraints of certain seats.

Chart Layout
Chart Layout or bus layout can be created using ChartLayout.Layout and ChartLayout.ChartSeats from chart response. Layout contains details for Lower and Upper decks.

A deck contains array of an array. Each inner array can be understood as

[seq_no,row,col,width,height,seat_type]

seat_type can be one of following values

1: Seating
2: Sleeper
4: Semi Sleeper
seq_no is unique autogenerated number and is unique across the Layout.

ChartLayout.ChartSeats contains all seat_no of the Layout. ChartSeats is an array. A seat's seat_no which is string, can be get using seq_no like this

seat_no = ChartLayout.ChartSeats[seq_no]

Similarly fare and status of seat can be get from SeatsStatus.Fares and SeatsStatus.SeatsStatus using seq_no.

fare = SeatsStatus.Fares[seq_no]

status = SeatsStatus.Status[seq_no]

Difference between total_fare - base_fare is applicable charges including service tax. A fare array contains following

[total_fare,base_fare,0,0,0,0]

A status can be one of following values

0: Not Available
1: Available for all
2: Available only for male
3: Available only for female
-2: Booked by male
-3: Booked by female
Sample Charts:
ChartResponse Lower
ChartResponse Lower Upper

Parameters

Name	Description
fromCityId *
integer($int32)
(query)
Default value : 4292

4292
toCityId *
integer($int32)
(query)
Default value : 4562

4562
journeyDate *
string
(query)
Default value : 2022-06-30T00:00:00.000Z

2022-06-30T00:00:00.000Z
busId *
integer($int32)
(query)
Default value : 1

1




Responses
Code	Description	Links
200	
OK

Media type

application/json
Controls Accept header.
Example Value
Schema




{
  "success": true,
  "data": {
    "ChartLayout": {
      "Info": {
        "TotalSleeper": 0,
        "TotalSemiSleeper": 0,
        "TotalSeater": 35,
        "TotalSeats": 35,
        "Decks": 2,
        "Lower": {
          "MaxRows": 9,
          "MaxCols": 5
        },
        "LayoutName": "Seater"
      },
      "Layout": {
        "Lower": [
          [
            0,
            0,
            3,
            1,
            1,
            1
          ],
          [
            1,
            0,
            4,
            1,
            1,
            1
          ],
          [
            2,
            1,
            0,
            1,
            1,
            1
          ],
          [
            3,
            1,
            1,
            1,
            1,
            1
          ],
          [
            4,
            1,
            3,
            1,
            1,
            1
          ],
          [
            5,
            1,
            4,
            1,
            1,
            1
          ],
          [
            6,
            2,
            0,
            1,
            1,
            1
          ],
          [
            7,
            2,
            1,
            1,
            1,
            1
          ],
          [
            8,
            2,
            3,
            1,
            1,
            1
          ],
          [
            9,
            2,
            4,
            1,
            1,
            1
          ],
          [
            10,
            3,
            0,
            1,
            1,
            1
          ],
          [
            11,
            3,
            1,
            1,
            1,
            1
          ],
          [
            12,
            3,
            3,
            1,
            1,
            1
          ],
          [
            13,
            3,
            4,
            1,
            1,
            1
          ],
          [
            14,
            4,
            0,
            1,
            1,
            1
          ],
          [
            15,
            4,
            1,
            1,
            1,
            1
          ],
          [
            16,
            4,
            3,
            1,
            1,
            1
          ],
          [
            17,
            4,
            4,
            1,
            1,
            1
          ],
          [
            18,
            5,
            0,
            1,
            1,
            1
          ],
          [
            19,
            5,
            1,
            1,
            1,
            1
          ],
          [
            20,
            5,
            3,
            1,
            1,
            1
          ],
          [
            21,
            5,
            4,
            1,
            1,
            1
          ],
          [
            22,
            6,
            0,
            1,
            1,
            1
          ],
          [
            23,
            6,
            1,
            1,
            1,
            1
          ],
          [
            24,
            6,
            3,
            1,
            1,
            1
          ],
          [
            25,
            6,
            4,
            1,
            1,
            1
          ],
          [
            26,
            7,
            0,
            1,
            1,
            1
          ],
          [
            27,
            7,
            1,
            1,
            1,
            1
          ],
          [
            28,
            7,
            3,
            1,
            1,
            1
          ],
          [
            29,
            7,
            4,
            1,
            1,
            1
          ],
          [
            30,
            8,
            0,
            1,
            1,
            1
          ],
          [
            31,
            8,
            1,
            1,
            1,
            1
          ],
          [
            32,
            8,
            2,
            1,
            1,
            1
          ],
          [
            33,
            8,
            3,
            1,
            1,
            1
          ],
          [
            34,
            8,
            4,
            1,
            1,
            1
          ]
        ]
      }
    },
    "ChartSeats": {
      "Seats": [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23",
        "24",
        "25",
        "26",
        "27",
        "28",
        "29",
        "30",
        "31",
        "32",
        "33",
        "34",
        "35"
      ]
    },
    "SeatsStatus": {
      "Status": [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1
      ],
      "Fares": [
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ],
        [
          50,
          50,
          0,
          0,
          0,
          0
        ]
      ],
      "UniqFares": [
        50
      ],
      "profiler": "71"
    },
    "Pickups": [
      {
        "Contact": "6497649649",
        "Landmark": "Anand rao circle",
        "Address": "Anand Rao Circle ",
        "PickupTime": "2022-06-30T05:00:00.000Z",
        "PickupArea": "",
        "PickupName": "Anand rao circle",
        "PickupCode": "39436"
      },
      {
        "Contact": "1234656789",
        "Landmark": "Santhi nagar",
        "Address": "santhi nagar 123456456",
        "PickupTime": "2022-06-30T05:30:00.000Z",
        "PickupArea": "",
        "PickupName": "Santhi nagar",
        "PickupCode": "57918"
      },
      {
        "Contact": "080-42112179",
        "Landmark": "Tankband",
        "Address": "Amar Hotel, Opp BMTC Bus Stand, Majestic,Bnaglore",
        "PickupTime": "2022-06-30T06:00:00.000Z",
        "PickupArea": "",
        "PickupName": "Amar Hotel, Opp BMTC Bus Stand",
        "PickupCode": "776"
      },
      {
        "Contact": "6789547895",
        "Landmark": "Silk board signal",
        "Address": "silk board signal, bangalore",
        "PickupTime": "2022-06-30T07:00:00.000Z",
        "PickupArea": "",
        "PickupName": "Silk board",
        "PickupCode": "44953"
      }
    ],
    "Dropoffs": [
      {
        "DropoffTime": "2022-06-30T18:00:00.000Z",
        "DropoffName": "Koyambedu",
        "DropoffCode": "750"
      },
      {
        "DropoffTime": "2022-06-30T19:00:00.000Z",
        "DropoffName": "Chennai central",
        "DropoffCode": "746"
      }
    ],
    "Canc": [
      {
        "Amt": 0,
        "Pct": 100,
        "Mins": 0
      },
      {
        "Amt": 0,
        "Pct": 50,
        "Mins": 360
      },
      {
        "Amt": 0,
        "Pct": 40,
        "Mins": 420
      },
      {
        "Amt": 0,
        "Pct": 30,
        "Mins": 480
      },
      {
        "Amt": 0,
        "Pct": 20,
        "Mins": 540
      },
      {
        "Amt": 0,
        "Pct": 10,
        "Mins": 600
      }
    ],
    "AvailSeats": {
      "Upper": 0,
      "Lower": 35
    },
    "ProvId": "15",
    "ChartCode": "vSDCYTWm5EIekpgIqKE8dQ==|7xJuLAQ5S00rRYJLMIjlNg=="
  }
}


5) SearchBus


 GET
/ota/SearchBus
To get available bus for given from city,to city,journey date and bus id.

It returns the bus which is available for bookings between given from city and to city on given journey date. It also provides additional informations like pickups, drop-offs, cancellation policy, bus details, discount details of the bus.



Parameters
Try it out
Name	Description
fromCityId *
integer($int32)
(query)
Default value : 4292

4292
toCityId *
integer($int32)
(query)
Default value : 4562

4562
journeyDate *
string
(query)
Default value : 2022-05-07T00:00:00.000Z

2022-05-07T00:00:00.000Z
busId *
integer
(query)
Default value : 1

1



Responses
Code	Description	Links
200	
OK

Media type

application/json
Controls Accept header.
Example Value
Schema



{
  "success": true,
  "data": {
    "ToCityId": 4562,
    "FromCityId": 4292,
    "Buses": [
      {
        "IsCovidSafe": false,
        "HasPGCharges": false,
        "IsGPS": true,
        "IsPremium": false,
        "IsFlexi": true,
        "NonRefundable": false,
        "MTicket": true,
        "v": 5769,
        "CompanyId": 3963,
        "ProvCompId": 0,
        "ProvId": 15,
        "RouteBusId": 1,
        "BusType": {
          "IsAC": "NON_AC",
          "Seating": "SEATER",
          "Make": "NORMAL",
          "Axle": "SINGLE_AXLE",
          "Axel": "SINGLE_AXLE"
        },
        "Pickups": [
          {
            "PickupCrossed": false,
            "PickupTime": "2022-05-07T12:01:00.000Z",
            "PickupArea": "",
            "PickupName": "Anand rao circle",
            "PickupCode": "39436"
          },
          {
            "PickupCrossed": false,
            "PickupTime": "2022-05-07T12:11:00.000Z",
            "PickupArea": "",
            "PickupName": "Santhi nagar",
            "PickupCode": "57918"
          },
          {
            "PickupCrossed": false,
            "PickupTime": "2022-05-07T12:16:00.000Z",
            "PickupArea": "",
            "PickupName": "Amar Hotel, Opp BMTC Bus Stand",
            "PickupCode": "776"
          },
          {
            "PickupCrossed": false,
            "PickupTime": "2022-05-07T12:16:00.000Z",
            "PickupArea": "",
            "PickupName": "Hosur",
            "PickupCode": "44957"
          },
          {
            "PickupCrossed": false,
            "PickupTime": "2022-05-07T12:16:00.000Z",
            "PickupArea": "",
            "PickupName": "Complex centre",
            "PickupCode": "57573"
          },
          {
            "PickupCrossed": false,
            "PickupTime": "2022-05-07T12:26:00.000Z",
            "PickupArea": "",
            "PickupName": "Bommanahalli",
            "PickupCode": "44955"
          },
          {
            "PickupCrossed": false,
            "PickupTime": "2022-05-07T12:36:00.000Z",
            "PickupArea": "",
            "PickupName": "Silk board",
            "PickupCode": "44953"
          }
        ],
        "Dropoffs": [
          {
            "DropoffTime": "2022-05-08T00:21:00.000Z",
            "DropoffName": "Koyambedu",
            "DropoffCode": "750"
          },
          {
            "DropoffTime": "2022-05-08T00:21:00.000Z",
            "DropoffName": "Airport",
            "DropoffCode": "81897"
          },
          {
            "DropoffTime": "2022-05-08T00:21:00.000Z",
            "DropoffName": "Ashok nagar",
            "DropoffCode": "136529"
          },
          {
            "DropoffTime": "2022-05-08T01:21:00.000Z",
            "DropoffName": "Chennai central",
            "DropoffCode": "746"
          }
        ],
        "Canc": [
          {
            "Amt": 0,
            "Pct": 100,
            "Mins": 0
          },
          {
            "Amt": 0,
            "Pct": 80,
            "Mins": 360
          },
          {
            "Amt": 0,
            "Pct": 65,
            "Mins": 720
          },
          {
            "Amt": 0,
            "Pct": 45,
            "Mins": 1440
          },
          {
            "Amt": 0,
            "Pct": 10,
            "Mins": 2160
          }
        ],
        "Amenities": [
          7,
          1,
          8,
          11,
          5,
          3,
          33,
          27,
          30,
          32,
          26,
          29,
          28
        ],
        "BusStatus": {
          "Availability": 35,
          "RouteBusId": 1,
          "BaseFares": [
            100,
            0
          ],
          "DiscFares": [
            100,
            0
          ],
          "TotalTax": 6.8
        },
        "DisplayBusType": "Non A/C, Seater",
        "Visibility": true,
        "CommPct": 16,
        "HasDiscount": false,
        "DiscountPct": 0,
        "DiscountAmt": 0,
        "CompanyNameWithoutSuffix": "GDS Demo Test",
        "PostponeTill": "2022-05-07T00:00:00.000Z",
        "PreponeTill": "2022-05-07T00:00:00.000Z",
        "ToName": "Chennai",
        "FromName": "Bangalore",
        "ChartCode": "vSDCYTWm5EIekpgIqKE8dQ==|7xJuLAQ5S00rRYJLMIjlNg==",
        "Duration": "12:05",
        "BusLabel": "2X2(35) NAC Seater  ",
        "CompanyName": "GDS Demo Testnaveen",
        "ArrTime": "2022-05-08T00:21:00.000Z",
        "DeptTime": "2022-05-07T12:16:00.000Z",
        "TripId": "46754"
      }
    ],
    "AllAmenities": [
      "Blanket",
      "Water_Bottle",
      "Central_TV",
      "WiFi",
      "Toilet",
      "Charging_Point",
      "Personal_TV",
      "Snacks",
      "GPS",
      "Newspaper",
      "Emergency_Exit",
      "Facial_Tissues",
      "Fire_Extinguisher",
      "Hammer",
      "Reading_Light",
      "Pillow",
      "Headsets",
      "Vomiting_Bag",
      "Novel",
      "Heater",
      "CCTV",
      "Fan",
      "Water_Bottle_Holder",
      "First_Aid_Box",
      "Meal",
      "Extra_Leg_Space",
      "Social_Distancing",
      "Staffs_with_facemask",
      "Hand_Sanitizer",
      "Bus_Sanitization",
      "Thermal_Screening",
      "Partition_between_sleeper",
      "Bus_Crew_Covid_Tested",
      "Passenger_Face_Mask"
    ],
    "SocialDistancingLabels": [
      "Social Distance",
      "Face Mask",
      "Hand Sanitizer",
      "Bus Sanitization",
      "Thermal Screening",
      "Adjacent seat empty",
      "Covid test for Bus Crew",
      "Passenger Face Mask"
    ],
    "TotalAvailSeats": 35,
    "JourneyDate": "2022-05-07T00:00:00.000Z",
    "ToCityName": "Chennai",
    "FromCityName": "Bengaluru"
  }
}




Schemas
AuthRequest{
ClientId	integer($int32)
ClientSecret	string
}
example: OrderedMap { "ClientId": 50, "ClientSecret": "XXXXXX2fXXXXXXXXXXXXXXXX" }
_ErrorDetails{
Msg	string
Code	integer($int32)
TraceId	string
}
ChartResponse{
data	{
}
success	boolean
Error	_ErrorDetails{...}
}
example: OrderedMap { "success": true, "data": OrderedMap { "ChartLayout": OrderedMap { "Info": OrderedMap { "TotalSleeper": 0, "TotalSemiSleeper": 0, "TotalSeater": 35, "TotalSeats": 35, "Decks": 2, "Lower": OrderedMap { "MaxRows": 9, "MaxCols": 5 }, "LayoutName": "Seater" }, "Layout": OrderedMap { "Lower": List [ List [ 0, 0, 3, 1, 1, 1 ], List [ 1, 0, 4, 1, 1, 1 ], List [ 2, 1, 0, 1, 1, 1 ], List [ 3, 1, 1, 1, 1, 1 ], List [ 4, 1, 3, 1, 1, 1 ], List [ 5, 1, 4, 1, 1, 1 ], List [ 6, 2, 0, 1, 1, 1 ], List [ 7, 2, 1, 1, 1, 1 ], List [ 8, 2, 3, 1, 1, 1 ], List [ 9, 2, 4, 1, 1, 1 ], List [ 10, 3, 0, 1, 1, 1 ], List [ 11, 3, 1, 1, 1, 1 ], List [ 12, 3, 3, 1, 1, 1 ], List [ 13, 3, 4, 1, 1, 1 ], List [ 14, 4, 0, 1, 1, 1 ], List [ 15, 4, 1, 1, 1, 1 ], List [ 16, 4, 3, 1, 1, 1 ], List [ 17, 4, 4, 1, 1, 1 ], List [ 18, 5, 0, 1, 1, 1 ], List [ 19, 5, 1, 1, 1, 1 ], List [ 20, 5, 3, 1, 1, 1 ], List [ 21, 5, 4, 1, 1, 1 ], List [ 22, 6, 0, 1, 1, 1 ], List [ 23, 6, 1, 1, 1, 1 ], List [ 24, 6, 3, 1, 1, 1 ], List [ 25, 6, 4, 1, 1, 1 ], List [ 26, 7, 0, 1, 1, 1 ], List [ 27, 7, 1, 1, 1, 1 ], List [ 28, 7, 3, 1, 1, 1 ], List [ 29, 7, 4, 1, 1, 1 ], List [ 30, 8, 0, 1, 1, 1 ], List [ 31, 8, 1, 1, 1, 1 ], List [ 32, 8, 2, 1, 1, 1 ], List [ 33, 8, 3, 1, 1, 1 ], List [ 34, 8, 4, 1, 1, 1 ] ] } }, "ChartSeats": OrderedMap { "Seats": List [ "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35" ] }, "SeatsStatus": OrderedMap { "Status": List [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ], "Fares": List [ List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ], List [ 50, 50, 0, 0, 0, 0 ] ], "UniqFares": List [ 50 ], "profiler": "71" }, "Pickups": List [ OrderedMap { "Contact": "6497649649", "Landmark": "Anand rao circle", "Address": "Anand Rao Circle ", "PickupTime": "2022-06-30T05:00:00.000Z", "PickupArea": "", "PickupName": "Anand rao circle", "PickupCode": "39436" }, OrderedMap { "Contact": "1234656789", "Landmark": "Santhi nagar", "Address": "santhi nagar 123456456", "PickupTime": "2022-06-30T05:30:00.000Z", "PickupArea": "", "PickupName": "Santhi nagar", "PickupCode": "57918" }, OrderedMap { "Contact": "080-42112179", "Landmark": "Tankband", "Address": "Amar Hotel, Opp BMTC Bus Stand, Majestic,Bnaglore", "PickupTime": "2022-06-30T06:00:00.000Z", "PickupArea": "", "PickupName": "Amar Hotel, Opp BMTC Bus Stand", "PickupCode": "776" }, OrderedMap { "Contact": "6789547895", "Landmark": "Silk board signal", "Address": "silk board signal, bangalore", "PickupTime": "2022-06-30T07:00:00.000Z", "PickupArea": "", "PickupName": "Silk board", "PickupCode": "44953" } ], "Dropoffs": List [ OrderedMap { "DropoffTime": "2022-06-30T18:00:00.000Z", "DropoffName": "Koyambedu", "DropoffCode": "750" }, OrderedMap { "DropoffTime": "2022-06-30T19:00:00.000Z", "DropoffName": "Chennai central", "DropoffCode": "746" } ], "Canc": List [ OrderedMap { "Amt": 0, "Pct": 100, "Mins": 0 }, OrderedMap { "Amt": 0, "Pct": 50, "Mins": 360 }, OrderedMap { "Amt": 0, "Pct": 40, "Mins": 420 }, OrderedMap { "Amt": 0, "Pct": 30, "Mins": 480 }, OrderedMap { "Amt": 0, "Pct": 20, "Mins": 540 }, OrderedMap { "Amt": 0, "Pct": 10, "Mins": 600 } ], "AvailSeats": OrderedMap { "Upper": 0, "Lower": 35 }, "ProvId": "15", "ChartCode": "vSDCYTWm5EIekpgIqKE8dQ==|7xJuLAQ5S00rRYJLMIjlNg==" } }
CityListResponse{
data	{...}
success	boolean
Error	_ErrorDetails{
Msg	[...]
Code	[...]
TraceId	[...]
}
}
example: OrderedMap { "success": true, "data": List [ OrderedMap { "CityId": 4292, "City": "Bangalore", "State": "Karnataka" }, OrderedMap { "CityId": 4292, "City": "Bengaluru", "State": "Karnataka" }, OrderedMap { "CityId": 4562, "City": "Chennai", "State": "Tamil Nadu" } ] }
SearchResponse{
data	{
}
success	boolean
Error	_ErrorDetails{
Msg	[...]
Code	[...]
TraceId	[...]
}
}
example: OrderedMap { "success": true, "data": OrderedMap { "ToCityId": 4562, "FromCityId": 4292, "Buses": List [ OrderedMap { "NonRefundable": false, "MTicket": true, "CompanyId": 3963, "ProvCompId": 0, "ProvId": 15, "RouteBusId": 1, "BusType": OrderedMap { "IsAC": "NON_AC", "Seating": "SEATER", "Make": "NORMAL", "Axle": "SINGLE_AXLE", "Axel": "SINGLE_AXLE" }, "Pickups": List [ OrderedMap { "PickupTime": "2022-06-30T05:00:00.000Z", "PickupArea": "", "PickupName": "Anand rao circle", "PickupCode": "39436" }, OrderedMap { "PickupTime": "2022-06-30T05:30:00.000Z", "PickupArea": "", "PickupName": "Santhi nagar", "PickupCode": "57918" }, OrderedMap { "PickupTime": "2022-06-30T06:00:00.000Z", "PickupArea": "", "PickupName": "Amar Hotel, Opp BMTC Bus Stand", "PickupCode": "776" }, OrderedMap { "PickupTime": "2022-06-30T07:00:00.000Z", "PickupArea": "", "PickupName": "Silk board", "PickupCode": "44953" } ], "Dropoffs": List [ OrderedMap { "DropoffTime": "2022-06-30T18:00:00.000Z", "DropoffName": "Koyambedu", "DropoffCode": "750" }, OrderedMap { "DropoffTime": "2022-06-30T19:00:00.000Z", "DropoffName": "Chennai central", "DropoffCode": "746" } ], "Canc": List [ OrderedMap { "Amt": 0, "Pct": 100, "Mins": 0 }, OrderedMap { "Amt": 0, "Pct": 50, "Mins": 360 }, OrderedMap { "Amt": 0, "Pct": 40, "Mins": 420 }, OrderedMap { "Amt": 0, "Pct": 30, "Mins": 480 }, OrderedMap { "Amt": 0, "Pct": 20, "Mins": 540 }, OrderedMap { "Amt": 0, "Pct": 10, "Mins": 600 } ], "Amenities": List [ 5, 3, 7, 8 ], "BusStatus": OrderedMap { "Availability": 35, "RouteBusId": 1, "BaseFares": List [ 50, 0 ], "TotalTax": 0 }, "Visibility": true, "CommPct": 8, "CompanySuffix": "naveen", "ToName": "Chennai", "FromName": "Bangalore", "ChartCode": "vSDCYTWm5EIekpgIqKE8dQ==|7xJuLAQ5S00rRYJLMIjlNg==", "Duration": "12:0", "BusLabel": "2X2(35) NAC Seater 2 2 pushback non a/c", "CompanyName": "GDS Demo Test", "ArrTime": "2022-06-30T18:00:00.000Z", "DeptTime": "2022-06-30T06:00:00.000Z", "TripId": "15:46754" }, OrderedMap { "NonRefundable": false, "MTicket": true, "CompanyId": 3963, "ProvCompId": 0, "ProvId": 15, "RouteBusId": 2, "BusType": OrderedMap { "IsAC": "AC", "Seating": "SEATER_SEMI_SLEEPER", "Make": "MERCEDES", "Axle": "SINGLE_AXLE", "Axel": "SINGLE_AXLE" }, "Pickups": List [ OrderedMap { "PickupTime": "2022-06-30T18:55:00.000Z", "PickupArea": "", "PickupName": "Silk board", "PickupCode": "44953" }, OrderedMap { "PickupTime": "2022-06-30T19:20:00.000Z", "PickupArea": "", "PickupName": "Kalasipalyam", "PickupCode": "44952" }, OrderedMap { "PickupTime": "2022-06-30T20:10:00.000Z", "PickupArea": "", "PickupName": "Double road", "PickupCode": "44956" }, OrderedMap { "PickupTime": "2022-06-30T20:35:00.000Z", "PickupArea": "", "PickupName": "Amar Hotel, Opp BMTC Bus Stand", "PickupCode": "776" }, OrderedMap { "PickupTime": "2022-06-30T20:50:00.000Z", "PickupArea": "", "PickupName": "S.k.travels (madiwala)", "PickupCode": "473" }, OrderedMap { "PickupTime": "2022-06-30T21:30:00.000Z", "PickupArea": "", "PickupName": "Bommanahalli", "PickupCode": "44955" }, OrderedMap { "PickupTime": "2022-06-30T22:00:00.000Z", "PickupArea": "", "PickupName": "Hosur", "PickupCode": "44957" } ], "Dropoffs": List [ OrderedMap { "DropoffTime": "2022-06-30T04:30:00.000Z", "DropoffName": "Airport", "DropoffCode": "81897" } ], "Canc": List [ OrderedMap { "Amt": 0, "Pct": 100, "Mins": 0 }, OrderedMap { "Amt": 0, "Pct": 50, "Mins": 360 }, OrderedMap { "Amt": 0, "Pct": 40, "Mins": 420 }, OrderedMap { "Amt": 0, "Pct": 30, "Mins": 480 }, OrderedMap { "Amt": 0, "Pct": 20, "Mins": 540 }, OrderedMap { "Amt": 0, "Pct": 10, "Mins": 600 } ], "Amenities": List [], "BusStatus": OrderedMap { "Availability": 60, "RouteBusId": 2, "BaseFares": List [ 3000, 0 ], "TotalTax": 6 }, "Visibility": true, "CommPct": 8, "ToName": "Chennai", "FromName": "Bangalore", "ChartCode": "iqDaGmlY4fRXApNFY0rC-Q==|49I-RN-lkDek9TsutLQT7g==", "Duration": "6:30", "BusLabel": "2X2(60) AC -Semisleeper-Sleeper Mercedes Benz", "CompanyName": "GDS Demo Test", "ArrTime": "2022-06-30T04:30:00.000Z", "DeptTime": "2022-06-30T22:00:00.000Z", "TripId": "15:32982" } ], "AllAmenities": List [ "Blanket", "Water_Bottle", "TV", "WiFi", "Toilet", "Charging_Point", "Personal_TV", "Snacks", "GPS", "Newspaper", "Emergency_Exit", "Facial_Tissues", "Fire_Extinguisher", "Hammer", "Reading_Light", "Pillow", "Headsets" ], "JourneyDate": "2022-06-30T00:00:00.000Z" } }
SearchBusResponse{
data	{
}
success	boolean
Error	_ErrorDetails{...}
}
example: OrderedMap { "success": true, "data": OrderedMap { "ToCityId": 4562, "FromCityId": 4292, "Buses": List [ OrderedMap { "IsCovidSafe": false, "HasPGCharges": false, "IsGPS": true, "IsPremium": false, "IsFlexi": true, "NonRefundable": false, "MTicket": true, "v": 5769, "CompanyId": 3963, "ProvCompId": 0, "ProvId": 15, "RouteBusId": 1, "BusType": OrderedMap { "IsAC": "NON_AC", "Seating": "SEATER", "Make": "NORMAL", "Axle": "SINGLE_AXLE", "Axel": "SINGLE_AXLE" }, "Pickups": List [ OrderedMap { "PickupCrossed": false, "PickupTime": "2022-05-07T12:01:00.000Z", "PickupArea": "", "PickupName": "Anand rao circle", "PickupCode": "39436" }, OrderedMap { "PickupCrossed": false, "PickupTime": "2022-05-07T12:11:00.000Z", "PickupArea": "", "PickupName": "Santhi nagar", "PickupCode": "57918" }, OrderedMap { "PickupCrossed": false, "PickupTime": "2022-05-07T12:16:00.000Z", "PickupArea": "", "PickupName": "Amar Hotel, Opp BMTC Bus Stand", "PickupCode": "776" }, OrderedMap { "PickupCrossed": false, "PickupTime": "2022-05-07T12:16:00.000Z", "PickupArea": "", "PickupName": "Hosur", "PickupCode": "44957" }, OrderedMap { "PickupCrossed": false, "PickupTime": "2022-05-07T12:16:00.000Z", "PickupArea": "", "PickupName": "Complex centre", "PickupCode": "57573" }, OrderedMap { "PickupCrossed": false, "PickupTime": "2022-05-07T12:26:00.000Z", "PickupArea": "", "PickupName": "Bommanahalli", "PickupCode": "44955" }, OrderedMap { "PickupCrossed": false, "PickupTime": "2022-05-07T12:36:00.000Z", "PickupArea": "", "PickupName": "Silk board", "PickupCode": "44953" } ], "Dropoffs": List [ OrderedMap { "DropoffTime": "2022-05-08T00:21:00.000Z", "DropoffName": "Koyambedu", "DropoffCode": "750" }, OrderedMap { "DropoffTime": "2022-05-08T00:21:00.000Z", "DropoffName": "Airport", "DropoffCode": "81897" }, OrderedMap { "DropoffTime": "2022-05-08T00:21:00.000Z", "DropoffName": "Ashok nagar", "DropoffCode": "136529" }, OrderedMap { "DropoffTime": "2022-05-08T01:21:00.000Z", "DropoffName": "Chennai central", "DropoffCode": "746" } ], "Canc": List [ OrderedMap { "Amt": 0, "Pct": 100, "Mins": 0 }, OrderedMap { "Amt": 0, "Pct": 80, "Mins": 360 }, OrderedMap { "Amt": 0, "Pct": 65, "Mins": 720 }, OrderedMap { "Amt": 0, "Pct": 45, "Mins": 1440 }, OrderedMap { "Amt": 0, "Pct": 10, "Mins": 2160 } ], "Amenities": List [ 7, 1, 8, 11, 5, 3, 33, 27, 30, 32, 26, 29, 28 ], "BusStatus": OrderedMap { "Availability": 35, "RouteBusId": 1, "BaseFares": List [ 100, 0 ], "DiscFares": List [ 100, 0 ], "TotalTax": 6.8 }, "DisplayBusType": "Non A/C, Seater", "Visibility": true, "CommPct": 16, "HasDiscount": false, "DiscountPct": 0, "DiscountAmt": 0, "CompanyNameWithoutSuffix": "GDS Demo Test", "PostponeTill": "2022-05-07T00:00:00.000Z", "PreponeTill": "2022-05-07T00:00:00.000Z", "ToName": "Chennai", "FromName": "Bangalore", "ChartCode": "vSDCYTWm5EIekpgIqKE8dQ==|7xJuLAQ5S00rRYJLMIjlNg==", "Duration": "12:05", "BusLabel": "2X2(35) NAC Seater ", "CompanyName": "GDS Demo Testnaveen", "ArrTime": "2022-05-08T00:21:00.000Z", "DeptTime": "2022-05-07T12:16:00.000Z", "TripId": "46754" } ], "AllAmenities": List [ "Blanket", "Water_Bottle", "Central_TV", "WiFi", "Toilet", "Charging_Point", "Personal_TV", "Snacks", "GPS", "Newspaper", "Emergency_Exit", "Facial_Tissues", "Fire_Extinguisher", "Hammer", "Reading_Light", "Pillow", "Headsets", "Vomiting_Bag", "Novel", "Heater", "CCTV", "Fan", "Water_Bottle_Holder", "First_Aid_Box", "Meal", "Extra_Leg_Space", "Social_Distancing", "Staffs_with_facemask", "Hand_Sanitizer", "Bus_Sanitization", "Thermal_Screening", "Partition_between_sleeper", "Bus_Crew_Covid_Tested", "Passenger_Face_Mask" ], "SocialDistancingLabels": List [ "Social Distance", "Face Mask", "Hand Sanitizer", "Bus Sanitization", "Thermal Screening", "Adjacent seat empty", "Covid test for Bus Crew", "Passenger Face Mask" ], "TotalAvailSeats": 35, "JourneyDate": "2022-05-07T00:00:00.000Z", "ToCityName": "Chennai", "FromCityName": "Bengaluru" } }