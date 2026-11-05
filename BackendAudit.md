# AiBus backend audit and live verification

5 November 2026 · India Standard Time

## Live evidence

The live Mantis requests used the existing partner configuration and a journey date of 7 November 2026. Only the Madras and Bangalore route pair was exercised. Both the direct contract checks and the compiled-backend checks used actual provider responses.

| Partner API | Verified result |
| --- | --- |
| Auth | Returned a usable access token, which authenticated both API hosts. |
| CityList | Returned 29,401 rows. The catalog included aliases for city IDs 4562 and 4292. Both aliases resolved in the application. |
| Search | Returned live inventory in both directions through the backend HTTP route. |
| SearchBus | Returned the selected service in both directions through the backend HTTP route. |
| Chart | Returned a usable seat, fare, and boarding and dropping point payload in both directions through the backend HTTP route. |
| HoldSeats | The compiled transaction client received a hold ID for one seat per direction. |
| BookSeats | Both holds produced a ticket number and PNR through the compiled transaction client. |
| BookingStatus | Returned status 1 for both bookings. |
| GetBookingDetails | Returned booking data for both ticket and PNR pairs. |
| IsCancellable | Returned true and quoted the full ticket fare in both directions. |
| CancelSeats | Cancelled both bookings. The partner reported refunds of ₹210 for Madras to Bangalore and ₹11 for Bangalore to Madras. The earlier direct contract run independently booked and cancelled both directions with the same reported refund amounts. |
| AgentBalance | Returned a numeric balance from the configured partner account. The admin balance implementation now calls the provider. |

The latest HTTP smoke test observed roughly 2.68 s for a cold city request and 15 ms for a warm request. Search took 768–960 ms, Chart 66–77 ms, and SearchBus 55–277 ms in that run. This was a single sequential run with an isolated Redis namespace. It measures neither tail latency nor throughput under concurrent load.

Razorpay returned HTTP 200 for an authenticated, read-only order query. Backend HTTP checks returned 403 for an unsigned webhook and 401 for unauthenticated agent top-up confirmation. The live Mantis transaction checks used the compiled transaction client directly. Application database settlement, Razorpay capture and refund settlement, and payment-to-ticket end-to-end remain unverified.

## Findings by area

| Area | Addressed | Remaining |
| --- | --- | --- |
| Mantis authentication and transport | Removed simulated success and failure fallbacks. Coalesced token refreshes, bounded timeouts, disabled redirects, rejected failed response envelopes, and limited transport retries to transient failures on reads. | Validate token revocation and outage behavior under load. Separate read and transaction circuit limits and enforce upstream request budgets. |
| Cities, trip search, seats | Preserved aliases, added a per-process catalog cache, coalesced cold loads, and bounded default autocomplete responses. Holds now use chart prices, seat types and availability. | Move catalog ingestion off request paths. Profile cold starts across replicas and batch database sync. Search caching still needs miss coalescing and load tests. |
| Holds, bookings, tickets | Require a local active hold, use provider-derived seat fares, atomically link a hold to a booking, scope registered booking and ticket reads to the owner, and reconcile ambiguous booking outcomes by hold ID. | Guest booking and hold UUIDs still act as access capabilities. A signed, scoped guest token is needed. Expiry and reconciliation need periodic recovery for orphaned states. |
| Payments and gateway administration | Removed the PhonePe runtime and kept historical database records. Razorpay verification fetches the captured payment and binds it to the stored order and expected amount. Webhooks require the original signed body. Refund requests use stable idempotency keys and wait for gateway processing before completion. | Prove capture, webhook delivery, confirmation, and refund using an isolated backend and a real Razorpay test-mode account. Reconcile captures that arrive for duplicate or superseded orders. Historical PhonePe refunds require separate operational handling. |
| Wallet and agents | Scoped top-up confirmation to the agent and verified capture, order and amount before an atomic wallet credit and ledger posting. Added a booking claim before agent wallet debit and a reversal path for definitive upstream booking failures. | Customer wallet spending is disabled because the old checkout granted a discount without debiting the balance. Re-enable it after implementing a durable reservation, expiry, release and refund ledger. Verify agent reversals and top-up concurrency with PostgreSQL. |
| Offers | Removed route-name and request-user bypasses, verified the operator at checkout, filtered exhausted offers before pagination, and recorded usage idempotently. | Reserve offer inventory atomically during checkout to enforce global and per-customer limits under concurrent bookings. Older route restrictions stored as names alone need valid city IDs. |
| Cancellations | Require ownership, obtain a live provider quote, and claim the booking before calling the partner. Retail refunds are capped at the captured amount. An ambiguous result is left for reconciliation. | Partial cancellation is blocked until the replacement ticket and remaining seats can be persisted safely. Add automated cancellation recovery and verify the complete refund flow. |
| Auth, users, SMS | Removed embedded SMS credential defaults and prevented production OTP simulation. Removed common identifier leakage from request query logging and tightened ownership checks on travel records. | The configured SMS vendor hostname failed a TLS hostname check. Obtain a vendor-supported HTTPS endpoint. Review OTP abuse limits, refresh-token revocation and user data retention with production traffic assumptions. |
| Admin, reporting and operations | Replaced synthetic provider balance. New provider transaction audits omit passenger data. Removed secrets from the production template and added Razorpay deployment variables. | Review historical credentials and logs for rotation and retention, and audit admin permissions and mutations. Profile report and dashboard queries with realistic data sizes. Verify notifications and ticket PDF generation in staging. |
| Database, Redis and workers | Made several booking, wallet and refund transitions conditional and transactional. | Add a transactional outbox and recovery sweep for durable dispatch. Redis failure can still strand work because queue helpers can return without enqueueing. Split worker scaling from HTTP scaling. Add dependency readiness, queue-lag and booking-outcome metrics, then run load and failure tests. |

## Industry evidence and design implications

- redBus publicly documents backend microservices and a separate analytics pipeline fed by search, inventory and booking events. MakeMyTrip also disclosed horizontally scalable AWS hosting and service-oriented APIs. For AiBus, that supports independently scaling search, booking workers and reporting, with analytics off the write path. [redBus engineering case study](https://aws.amazon.com/blogs/business-intelligence/a-dive-into-redbuss-data-platform-and-how-they-used-amazon-quicksight-to-accelerate-business-insights-2/) · [MakeMyTrip filing](https://d18rn0p25nwr6d.cloudfront.net/CIK-0001495153/7cd8b0aa-72b0-4b46-b5b2-9444082ed2ad.pdf)
- AbhiBus publicly describes operator-specific cutoffs, partial-cancellation restrictions, and refunds tied to charges and payment sources. ixigo discloses inventory breadth and service guarantees. These sources establish customer-facing behavior. A scoped cancellation quote, explicit refund destination and separate settlement state are the corresponding AiBus design choices. [AbhiBus terms](https://www.abhibus.com/terms) · [ixigo annual report](https://rocket.ixigo.com/investors/Le%20Travenues%20Technology%20Limited%20-%20Annual%20Report%20FY%202024-25.pdf)
- Razorpay documents capture verification, webhook signature validation on the raw request body and idempotency for normal refunds. The implemented gateway checks follow those contracts. [Razorpay security checklist](https://razorpay.com/security/checklist) · [Webhook verification](https://razorpay.com/docs/webhooks/validate-test/) · [Idempotent refunds](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md)

Production scale remains unverified. The next release gate is a staged booking, capture, ticket, cancellation and settlement run with an isolated database, followed by concurrent checkout and failover tests at agreed peak request rates. Apply the checked-in Razorpay migration through the normal deployment process and review existing credential rotation before release.
