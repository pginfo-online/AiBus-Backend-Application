REST API related to transactions. These API can be used to hold, book, cancel and check status of Bookings.




server : 

https://partnertranapi.iamgds.com/



1) HoldSeats


POST
/ota/HoldSeats
To hold one or more seat(s) for an user.

This API is called to hold seats for an user for a certain period of time. Any other user trying to book the same seat or seats would observe hold failure. Once the time elapses and no action has been taken by the user then those seats again go back to the pool of available seats.

Certain seats are reserved for a particular gender. Hold and Book transactions should be seen in combination. For every passenger, HoldRequest requires

SeatNo is seat_no provided in Chart for selelcted seat.

SeatTypeId is seat_type value provided in Chart for the selected seat.

Fare is total fare for the selected seat.

Gender is M or F of the passenger.

Age of the passenger.

Name of the passenger.

IsAcSeat is true or false depending on if the bus is AC or not.

Parameters
Try it out
No parameters


Request body

application/json


{
  "FromCityId": 4292,
  "ToCityId": 4562,
  "JourneyDate": "2017-06-15T00:00:00.000Z",
  "BusId": 69,
  "PickUpID": "44953",
  "DropOffID": "750",
  "ContactInfo": {
    "CustomerName": "test",
    "Email": "testbooking@travelyaari.com",
    "Phone": "9090909090",
    "Mobile": "9090909090"
  },
  "GSTDetails": {
    "Gstin": "xxxxxxxxx",
    "GstCompany": "abc pvt ltd."
  },
  "Passengers": [
    {
      "Name": "test",
      "Age": 25,
      "Gender": "M",
      "SeatNo": "7",
      "Fare": 50,
      "SeatTypeId": 1,
      "IsAcSeat": false
    }
  ]
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
{
  "success": true,
  "data": {
    "HoldId": 18305745
  }
}




2) BookSeats


POST
/ota/BookSeats
To book one or more seat(s) for an user.

This API is called to book seats which have been hold for an user for a certain period of time. Any other user trying to book the same seat(s) would observe hold failure. Once the time elapses and no action has been taken by the user then those seats again go back to the pool of available seats. Hold and Book transactions should be seen in combination.

The api accepts HoldId which client would have got in successful hold api response.

Booking cannot happen without holding seats.
The api is recommended to be called after successful reciept of the payment from customer.
A successful api call will return PNR and ticketNo.
The PNR is operator identifier. Ticket issued to the customer must have PNR. TicketNo is reference to successful booking.
For any future reference regarding a confirmed booking, PNR and ticketNo both should be provided.
For any failure in the api, please provide HoldId




Parameters-
No parameters


Request body

application/json


{
  "HoldId": 18305745
}


Responses
Code	Description	Links
200	
OK

Media type

application/json
Controls Accept header.


{
  "success": true,
  "data": {
    "HoldId": 18305745,
    "TotalFare": 50,
    "TicketNo": "501718666",
    "PNRNo": "96160626-523525"
  }
}



3) BookingStatus


POST
/ota/bookingstatusv2
To check the status of booking against a Hold Id.

When client might not be able to get an expected response from the BookSeats API, this API should be used to check the status of booking against a HoldId. This API will take only HoldId which client would have used while making the BookSeats Request.

The data field in response will contain following

Status:1 - {Hold Id found and booking successful},0 - {Hold Id found but booking in progress}, -1 - {Hold Id found but booking unsuccessful or cancelled}, -2 - {Hold Id not found}

TicketNo:Ticket No. {only in case of successful booking}

PNRNo:PNR No {only in case of successful booking}

Message: Custom message



Parameters-
No parameters

Request body

application/json-
Schema
{
  "HoldId": 37522865
}


Responses
Code	Description	Links
200	
OK

Media type

application/json
Controls Accept header.

{
  "success": true,
  "data": {
    "Status": 1,
    "TicketNo": "3331920116397",
    "PNRNo": "172731851-518507",
    "Message": "BOOKING SUCCESSFUL"
  }
}



4) IsCancellable


GET
/ota/IsCancellable
To check if a ticket can be cancelled or not.

This api should be called prior cancelling the ticket to check whether the ticket is cancellable or not. It also returns refundable amount.

Parameters

Name	Description
PNRNo *
string
(query)
PNRNo
TicketNo *
string
(query)
TicketNo
seatNos *
string
(query)



Responses
Code	Description	Links
200	
OK

Media type

application/json
Controls Accept header.

{
  "success": true,
  "data": {
    "IsCancellable": true,
    "ChargePct": 10,
    "TotalFare": 50,
    "RefundAmount": 45
  }
}



5) CancelSeats


POST
/ota/CancelSeats
To cancel one or more seat(s) of a ticket.

This API is called to cancel ticket after the iscancellable call returns true. It takes TicketNo and PNR and SeatNos which are to be cancelled.

SeatNos is comma separated seatNo. e.g. "LA,LB"


Parameters
Try it out
No parameters



Request body

application/json
Example Value
Schema
{
  "PNR": "96160626-523525",
  "TicketNo": "501718666",
  "SeatNos": "7"
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
{
  "success": true,
  "data": {
    "NewHoldId": 37654666,
    "NewTotalFare": 0,
    "ChargeAmt": 5,
    "ChargePct": 10,
    "RefundAmount": 45,
    "TotalFare": 50,
    "NewTicketNo": "3331920128127",
    "NewPNRNo": "173357031-558071"
  }
}



6) GetBookingDetails


GET
/ota/BookingDetails
To get the booking details based on a PNR number and Ticket Number.

This API returns details of the successful booking which are required to print on customer Ticket. It includes

Source, Destination and Journey Date
Bus operator details
Pickup details
Passenger details
Customer contact
Fare Details



Parameters

Name	Description
PNR *
string
(query)
PNR
TicketNo *
string
(query)
TicketNo


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
    "IsCancelled": false,
    "TotalFare": 50,
    "TotalSeats": 1,
    "PickupInfo": {
      "PickupTime": "2017-06-15T07:00:00.000Z",
      "Address": "silk board signal, bangalore",
      "Phone": "6789547895",
      "Landmark": "Silk board signal",
      "PickupName": "Silk board"
    },
    "Passengers": [
      {
        "IsAcSeat": false,
        "Age": 25,
        "Fare": 50,
        "SeatType": "seater",
        "SeatNo": "7",
        "Gender": "M",
        "Name": "test"
      }
    ],
    "ContactInfo": {
      "Mobile": "9090909090",
      "Phone": "9090909090",
      "Email": "testbooking@travelyaari.com",
      "CustomerName": "test"
    },
    "BusTypeName": " SEATER NON_AC",
    "DepartureDateTime": "2017-06-15T06:00:00.000Z",
    "ArrivalDateTime": "2017-06-15T18:00:00.000Z",
    "JourneyDate": "2017-06-15T06:00:00.000Z",
    "ToCityName": "Chennai",
    "FromCityName": "Bangalore",
    "CompanyName": "GDS Demo Test",
    "TicketNo": "501718666",
    "PNRNo": "96160626-523525"
  }
}




7) AgentBalance


GET
/ota/balance
To get current available balance of the agent.

It returns the current available Balance of the client, which is used to perform transactions. The client should have a sufficient current balance to perform any transactions through the API.


Parameters
No parameters



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
    "Balance": 14743867.05
  }
}




Schemas
_ErrorDetails{
Msg	string
Code	integer($int32)
TraceId	string
}
AgentBalanceResponse{
data	{
}
success	boolean
Error	_ErrorDetails{
Msg	string
Code	integer($int32)
TraceId	string
}
}
example: OrderedMap { "success": true, "data": OrderedMap { "Balance": 14743867.05 } }
HoldRequest{
FromCityId	integer($int32)
ToCityId	integer($int32)
JourneyDate	string
BusId	integer($int32)
PickUpID	string
DropOffID	string
ContactInfo	CustomerInformation{
CustomerName	string
Email	string
Phone	string
Mobile	string
}
GSTDetails	GSTDetails{
Gstin	string
GstCompany	string
}
Passengers	[Passenger{
Name	string
Age	integer($int32)
Gender	string
SeatNo	string
Fare	number($double)
SeatTypeId	integer($int32)
IsAcSeat	boolean
}]
}
example: OrderedMap { "FromCityId": 4292, "ToCityId": 4562, "JourneyDate": "2017-06-15T00:00:00.000Z", "BusId": 69, "PickUpID": "44953", "DropOffID": "750", "ContactInfo": OrderedMap { "CustomerName": "test", "Email": "testbooking@travelyaari.com", "Phone": "9090909090", "Mobile": "9090909090" }, "GSTDetails": OrderedMap { "Gstin": "xxxxxxxxx", "GstCompany": "abc pvt ltd." }, "Passengers": List [ OrderedMap { "Name": "test", "Age": 25, "Gender": "M", "SeatNo": "7", "Fare": 50, "SeatTypeId": 1, "IsAcSeat": false } ] }
CustomerInformation{
CustomerName	string
Email	string
Phone	string
Mobile	string
}
GSTDetails{
Gstin	string
GstCompany	string
}
Passenger{
Name	string
Age	integer($int32)
Gender	string
SeatNo	string
Fare	number($double)
SeatTypeId	integer($int32)
IsAcSeat	boolean
}
HoldResponse{
data	{
}
success	boolean
Error	_ErrorDetails{
Msg	string
Code	integer($int32)
TraceId	string
}
}
example: OrderedMap { "success": true, "data": OrderedMap { "HoldId": 18305745 } }
BookRequest{
HoldId	integer($int32)
}
example: OrderedMap { "HoldId": 18305745 }
BookResponse{
data	{
}
success	boolean
Error	_ErrorDetails{
Msg	string
Code	integer($int32)
TraceId	string
}
}
example: OrderedMap { "success": true, "data": OrderedMap { "HoldId": 18305745, "TotalFare": 50, "TicketNo": "501718666", "PNRNo": "96160626-523525" } }
BookingStatusRequest{
HoldId	integer($int32)
}
example: OrderedMap { "HoldId": 37522865 }
BookingStatusResponse{
data	{
}
success	boolean
Error	_ErrorDetails{
Msg	string
Code	integer($int32)
TraceId	string
}
}
example: OrderedMap { "success": true, "data": OrderedMap { "Status": 1, "TicketNo": "3331920116397", "PNRNo": "172731851-518507", "Message": "BOOKING SUCCESSFUL" } }
IsCancellableResponse{
data	{
}
success	boolean
Error	_ErrorDetails{
Msg	string
Code	integer($int32)
TraceId	string
}
}
example: OrderedMap { "success": true, "data": OrderedMap { "IsCancellable": true, "ChargePct": 10, "TotalFare": 50, "RefundAmount": 45 } }
CancelRequest{
PNR	string
TicketNo	string
SeatNos	string
}
example: OrderedMap { "PNR": "96160626-523525", "TicketNo": "501718666", "SeatNos": "7" }
CancelResponse{
data	{
}
success	boolean
Error	_ErrorDetails{
Msg	string
Code	integer($int32)
TraceId	string
}
}
example: OrderedMap { "success": true, "data": OrderedMap { "NewHoldId": 37654666, "NewTotalFare": 0, "ChargeAmt": 5, "ChargePct": 10, "RefundAmount": 45, "TotalFare": 50, "NewTicketNo": "3331920128127", "NewPNRNo": "173357031-558071" } }
BookingDetailsResponse{
data	{
}
success	boolean
Error	_ErrorDetails{
Msg	string
Code	integer($int32)
TraceId	string
}
}
example: OrderedMap { "success": true, "data": OrderedMap { "IsCancelled": false, "TotalFare": 50, "TotalSeats": 1, "PickupInfo": OrderedMap { "PickupTime": "2017-06-15T07:00:00.000Z", "Address": "silk board signal, bangalore", "Phone": "6789547895", "Landmark": "Silk board signal", "PickupName": "Silk board" }, "Passengers": List [ OrderedMap { "IsAcSeat": false, "Age": 25, "Fare": 50, "SeatType": "seater", "SeatNo": "7", "Gender": "M", "Name": "test" } ], "ContactInfo": OrderedMap { "Mobile": "9090909090", "Phone": "9090909090", "Email": "testbooking@travelyaari.com", "CustomerName": "test" }, "BusTypeName": " SEATER NON_AC", "DepartureDateTime": "2017-06-15T06:00:00.000Z", "ArrivalDateTime": "2017-06-15T18:00:00.000Z", "JourneyDate": "2017-06-15T06:00:00.000Z", "ToCityName": "Chennai", "FromCityName": "Bangalore", "CompanyName": "GDS Demo Test", "TicketNo": "501718666", "PNRNo": "96160626-523525" } }

