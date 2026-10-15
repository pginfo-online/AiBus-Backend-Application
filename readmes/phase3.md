# AiBus Backend — B2B Enterprise Architecture & Implementation Plan

> **Analysis Date:** 2026-10-14 | **Approach:** Analyze → Plan → Implement

---

## 1. Existing Codebase Deep Analysis

### 1.1 Stack Summary

| Concern | Technology | Status |
|---|---|---|
| Runtime | Node.js ≥18, TypeScript | SOLID |
| Framework | Express v5 | SOLID |
| ORM | Prisma 6 + PostgreSQL (Supabase) | SOLID |
| Auth | JWT (access 15m + refresh 7d, family rotation) | SOLID |
| Queue/Workers | BullMQ + ioredis | SOLID |
| Caching | Redis (ioredis) | PARTIAL |
| Validation | Zod v4 | SOLID |
| Payments | PhonePe V2 Standard Checkout | IMPLEMENTED |
| Provider | GDS (iamgds.com) Partner + Transaction APIs | IMPLEMENTED |
| Security | Helmet, HPP, CORS, rate-limiting, bcrypt | GOOD |
| Logging | Pino structured + pino-http | SOLID |
| Storage | Cloudinary | STUB |
| Tests | Vitest — 10 files | LIMITED |
| CI/Deploy | Render + PM2 | EXISTS |

### 1.2 Provider API Map (Partner.md + Transactionapi.md — authoritative)

**Partner API Base: https://partnerapi.iamgds.com**
- POST /ota/v1/Auth — Token valid 90 min, must be cached 24h
- GET /ota/CityList — Cities with CityId, City, State
- GET /ota/Search — fromCityId, toCityId, journeyDate
- GET /ota/Chart — busId, fromCityId, toCityId, journeyDate
  - Layout: [seq_no, row, col, width, height, seat_type]
  - Seat types: 1=Seating, 2=Sleeper, 4=Semi-Sleeper
  - Status: 0=N/A, 1=All, 2=Male, 3=Female, -2=BookedMale, -3=BookedFemale
  - Fare: [total_fare, base_fare, 0, 0, 0, 0]
- GET /ota/SearchBus — single bus details

**Transaction API Base: https://partnertranapi.iamgds.com**
- POST /ota/HoldSeats — returns HoldId
- POST /ota/BookSeats — {HoldId} → {TicketNo, PNRNo}
- POST /ota/bookingstatusv2 — Status: 1=success, 0=in-progress, -1=failed, -2=not-found
- GET /ota/IsCancellable — {IsCancellable, ChargePct, TotalFare, RefundAmount}
- POST /ota/CancelSeats — {PNR, TicketNo, SeatNos} → {NewHoldId, ChargeAmt, RefundAmount, NewTicketNo, NewPNRNo}
- GET /ota/BookingDetails — full booking details for ticket generation
- GET /ota/balance — provider GDS balance

### 1.3 Module Assessment

| Module | Decision | Notes |
|---|---|---|
| auth | REUSE | JWT + refresh rotation complete |
| cities | REUSE | GDS sync + caching exists |
| search | REUSE | GDS search wrapper correct |
| seats | REUSE | Chart fetch + GDS adapter |
| holds | REUSE | Hold creation + expiry worker |
| bookings | MODIFY | Add agentId, commission snapshot, ledger |
| payments | MODIFY | Add wallet payment path, top-up |
| cancellations | MODIFY | Add commission reversal, ledger reversal |
| tickets | MODIFY | Implement real PDF generation |
| users | MODIFY | Add agent profile endpoints |
| admin | MODIFY | Add B2B agent management sub-modules |
| providers/gds | REUSE | Adapter + circuit breaker solid |
| infrastructure/* | REUSE | Database, Redis, queues, logger solid |
| jobs/index.ts | MODIFY | Add PDF ticket, commission, ledger workers |

### 1.4 Critical Gaps

1. B2B Agent System — no Agent, KYC, AgentWallet, AgentStaff models
2. Financial Ledger — no double-entry; WalletTransaction is single-table, unbalanced
3. Commission Engine — no rules, snapshots, or versioning
4. Wallet Payments — booking payment via wallet not wired
5. Tenant Isolation — no agentId on Booking, Payment records
6. KYC Workflow — no document upload, review, approval states
7. Agent Reports — no earnings dashboard or statements
8. PDF Ticket Generation — worker stub only; no actual PDF library
9. Wallet Top-up — no initiation or webhook confirmation flow
10. Credit Limit Engine — no credit authorization or exposure tracking

---

## 2. Architecture: Multi-Tenant B2B Extension

**Tenancy Strategy:** Additive extension, not a rewrite.
- User model extended with optional agentId FK
- Agent model created as first-class entity with KYC, wallet, commissions
- Every booking/payment/ledger row carries agentId derived from JWT
- Never trust client-supplied agentId — derive from JWT -> user -> agent membership

**Financial Architecture:**
```
AgentWallet (cashBalance + creditLimit + creditUsed)
  |
  +-- LedgerEntry (double-entry — every debit = equal credit)
  |     AGENT_WALLET_DEBIT | PLATFORM_REVENUE_CREDIT
  |     COMMISSION_CREDIT  | COMMISSION_EXPENSE_DEBIT
  |     WALLET_TOPUP_CREDIT | REFUND_CREDIT
  |
  +-- CommissionSnapshot (per-booking immutable rule snapshot)
```

**Key Invariant:** SUM(debit_amount) = SUM(credit_amount) for every posting batch.

---

## 3. New Prisma Models Required

### Agent & Onboarding
```
AgentStatus enum: PENDING_KYC | KYC_SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | SUSPENDED
AgentKycDocType enum: PAN_CARD | GST_CERTIFICATE | BUSINESS_REGISTRATION | BANK_STATEMENT | OWNER_IDENTITY | CANCELLED_CHEQUE
AgentStaffRole enum: OWNER | MANAGER | BOOKING_AGENT | ACCOUNTANT | VIEWER

Agent { id, businessName, contactPersonName, email, phone, businessAddress, city, state, pincode,
        logoUrl, gstNumber, panNumber, status, rejectionReason, approvedAt, approvedBy,
        suspendedAt, suspendedReason, createdAt, updatedAt
        -> kycDocuments, wallet, staff, commissionRules, bookings, ledgerEntries, bankAccounts }

AgentKycDocument { id, agentId, docType, fileUrl, storageKey, verifiedAt, verifiedBy,
                   rejectedAt, rejectReason, createdAt }

AgentBankAccount { id, agentId, accountHolderName, accountNumber, ifscCode, bankName,
                   isVerified, isPrimary, verifiedAt, withdrawFreezeUntil, createdAt, updatedAt }

AgentStaff { id, agentId, userId, role, permissions (Json), isActive, invitedAt, joinedAt
             UNIQUE [agentId, userId] }
```

### Financial Ledger
```
LedgerEntryType enum: AGENT_WALLET_DEBIT | AGENT_WALLET_CREDIT | AGENT_WALLET_TOPUP |
                      COMMISSION_CREDIT | COMMISSION_REVERSAL | REFUND_CREDIT |
                      CONVENIENCE_FEE_DEBIT | CREDIT_LIMIT_UTILIZATION | CREDIT_LIMIT_RELEASE |
                      PLATFORM_REVENUE_CREDIT | MANUAL_ADJUSTMENT

LedgerEntry { id, batchId, agentId, bookingId, cancellationId, refundId, type,
              debitAmount Decimal(14,4), creditAmount Decimal(14,4), currency,
              description, referenceId, idempotencyKey UNIQUE, postedAt, createdBy
              INDEX [agentId], [bookingId], [batchId], [postedAt] }

AgentWallet { id, agentId UNIQUE, cashBalance Decimal(14,4), creditLimit Decimal(14,4),
              creditUsed Decimal(14,4), isFrozen, frozenReason, frozenAt,
              totalTopups, totalSpent, totalCommission, totalRefunds, version (optimistic lock),
              createdAt, updatedAt }
```

### Commission Engine
```
CommissionRuleType enum: FLAT_PERCENTAGE | FLAT_AMOUNT | TIERED_BOOKING | OPERATOR_SPECIFIC | ROUTE_SPECIFIC

CommissionRule { id, name, ruleType, agentId (nullable = global default), operatorName,
                 fromCityId, toCityId, percentage Decimal(6,4), flatAmount, minFare, maxCommission,
                 priority, effectiveFrom, effectiveUntil, isActive, createdBy, createdAt, updatedAt
                 INDEX [agentId], [effectiveFrom, effectiveUntil] }

CommissionSnapshot { id, bookingId UNIQUE, agentId, ruleId, ruleSnapshot Json (immutable copy),
                     grossFare Decimal(14,4), commissionRate Decimal(6,4), commissionAmt Decimal(10,2),
                     netFare Decimal(14,4), reversedAt, createdAt
                     INDEX [agentId] }
```

### Wallet Top-up
```
TopupStatus enum: INITIATED | PAYMENT_PENDING | COMPLETED | FAILED | EXPIRED

WalletTopup { id, agentId, amount, status, merchantTxnId UNIQUE, gatewayOrderId,
              gatewayPaymentId, webhookVerified, idempotencyKey UNIQUE,
              completedAt, createdAt, updatedAt }
```

### Modified Existing Models
```
Booking: ADD agentId? @db.Uuid, userType String @default("CUSTOMER")
         ADD relation: agent Agent?, commissionSnapshot CommissionSnapshot?

User: ADD relation: agentStaff AgentStaff[]
```

---

## 4. Module Create/Modify/Reuse Plan

**CREATE (new modules):**
- modules/agents — registration, KYC, profile, onboarding
- modules/agents/wallet — balance, top-up, statement, credit
- modules/agents/staff — CRUD, roles, permissions
- modules/agents/commissions — rule lookup, snapshot, earnings
- modules/agents/reports — booking history, statements, CSV exports
- modules/admin/agent-management — KYC review, approve/reject/suspend
- modules/admin/commission-management — rule CRUD, versioning
- modules/admin/ledger — platform ledger, reconciliation, adjustments
- infrastructure/ledger — LedgerService (atomic balanced posting)
- infrastructure/commission — CommissionEngine (priority-ordered rule resolution)

**MODIFY (extend existing):**
- modules/auth — agent registration path, KYC status gate
- modules/bookings — agentId, commission snapshot, wallet debit, ledger posting
- modules/payments — wallet payment mode, top-up flow
- modules/cancellations — ledger reversal, commission reversal
- modules/tickets — real PDF generation (PDFKit)
- modules/users — agent profile endpoints
- modules/admin — integrate new B2B sub-modules
- jobs/index.ts — PDF ticket worker, commission worker, reconciliation worker
- prisma/schema.prisma — 8+ new models

---

## 5. B2B Booking Flow (with Ledger)

```
GET /search → GET /seats/chart → POST /holds → GDS HoldSeats → HoldId
  -> POST /bookings (holdId, passengers, agentId from JWT)
  -> CommissionEngine.resolve(agentId, booking) -> CommissionSnapshot saved (immutable)
  -> POST /payments/wallet-debit
     [ATOMIC TX]
     1. Verify wallet balance >= (grossFare - commissionAmt) OR within credit limit
     2. Debit wallet (optimistic lock on version)
     3. Post LedgerEntry batch (debit + credit balanced)
     4. Mark payment SUCCESS
  -> POST /bookings/:id/confirm -> GDS BookSeats(HoldId)
  -> GDS: TicketNo + PNRNo -> booking CONFIRMED
  [ATOMIC TX]
     Post CommissionCredit ledger entry
     Update CommissionSnapshot
     Update AgentWallet.totalCommission
  -> Queue: TICKET_GENERATION -> PDF -> Cloudinary -> Ticket.pdfUrl
  -> Queue: NOTIFICATION_EMAIL + SMS
```

---

## 6. Provider API Mapping (Non-Inventable)

| Our Endpoint | Provider Call | Key Contract |
|---|---|---|
| GET /search | GET /ota/Search | fromCityId, toCityId, journeyDate |
| GET /seats/chart | GET /ota/Chart | busId, fromCityId, toCityId, journeyDate |
| POST /holds | POST /ota/HoldSeats | Passengers[], PickUpID, DropOffID, BusId |
| POST /bookings/confirm | POST /ota/BookSeats | HoldId only |
| GET /bookings/:id/status | POST /ota/bookingstatusv2 | HoldId -> Status 1/0/-1/-2 |
| GET /cancellations/check | GET /ota/IsCancellable | PNRNo, TicketNo, seatNos |
| POST /cancellations | POST /ota/CancelSeats | PNR, TicketNo, SeatNos (comma-separated) |
| GET /tickets/:id | GET /ota/BookingDetails | PNR, TicketNo |

---

## 7. State Machines

**Agent KYC:**
```
PENDING_KYC -> KYC_SUBMITTED -> UNDER_REVIEW -> APPROVED / REJECTED
APPROVED -> SUSPENDED -> APPROVED (reactivation)
REJECTED -> KYC_SUBMITTED (resubmission)
```

**Booking (extended):**
```
INITIATED -> HOLD_REQUESTED -> HELD -> PAYMENT_PENDING
  -> (wallet/PhonePe success) PAYMENT_SUCCESS -> BOOKING_REQUESTED
  -> CONFIRMED / BOOKING_UNKNOWN / BOOKING_FAILED
  -> CANCELLATION_REQUESTED -> CANCELLED -> REFUND_PENDING -> REFUNDED
```

**Wallet Top-up:**
```
INITIATED -> PAYMENT_PENDING -> COMPLETED / FAILED / EXPIRED
```

**Commission:**
```
Booking CONFIRMED -> CommissionSnapshot created (immutable)
  -> LedgerEntry batch: AGENT_WALLET_DEBIT + COMMISSION_CREDIT + PLATFORM_REVENUE_CREDIT
Booking CANCELLED -> CommissionSnapshot reversed proportionally
  -> LedgerEntry reversal batch posted atomically
```

---

## 8. Security Authorization Matrix

| Action | CUSTOMER | OPERATOR_AGENT | AGENT_OWNER | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|
| Search/Chart/Cities | YES | YES | YES | YES | YES |
| Create booking (own) | YES | YES | YES | YES | YES |
| View booking (own) | YES | YES | YES | YES | YES |
| View booking (cross-agent) | NO | NO | NO | YES | YES |
| Agent KYC submit | NO | YES | YES | NO | NO |
| Agent KYC approve/reject | NO | NO | NO | YES | YES |
| View agent wallet | NO | Own-only | Own-only | YES | YES |
| Wallet top-up | NO | YES | YES | YES | YES |
| Commission rules CRUD | NO | NO | View-only | YES | YES |
| Suspend agent | NO | NO | NO | YES | YES |
| Manual ledger adjustment | NO | NO | NO | YES | YES |
| Add agent staff | NO | NO | YES | YES | YES |
| Admin audit logs | NO | NO | NO | YES | YES |

**IDOR Rule:** Every query on Booking/Payment/LedgerEntry MUST include agentId
derived from JWT when called by agent users. Never accept client-supplied agentId as proof.

---

## 9. Financial Correctness Rules

1. Ledger entries are IMMUTABLE — never UPDATE, only INSERT reversals
2. Every batch MUST balance: SUM(debit) = SUM(credit) enforced before commit
3. Commission calculated on baseFare, not totalFare (exclude tax from commission base)
4. Net wallet debit = grossFare - commissionAmt (agent pays net)
5. Wallet debit uses optimistic locking on AgentWallet.version (prevent race conditions)
6. Credit limit: cashBalance + creditLimit >= amount required (negative balance allowed down to -creditLimit)
7. Refund credited within 5 min of confirmed provider cancellation
8. Commission reversal on cancellation is proportional to refund amount
9. No double ledger postings: idempotencyKey UNIQUE enforced at DB level

---

## 10. Implementation Phases

### Phase 1: Database Schema Migration [CRITICAL]
- Add Agent, AgentKycDocument, AgentBankAccount, AgentStaff to schema.prisma
- Add AgentWallet, LedgerEntry, CommissionRule, CommissionSnapshot, WalletTopup
- Add agentId + userType to Booking
- Run: prisma migrate dev --name b2b-agent-ledger-commission

### Phase 2: Agent Registration & Onboarding [CRITICAL]
- POST /api/v1/agents/register
- POST /api/v1/agents/:id/kyc/documents (Cloudinary upload)
- GET /api/v1/agents/:id/kyc/status
- POST /api/v1/agents/:id/bank-accounts
- KYC status gate on booking endpoints (APPROVED agents only)

### Phase 3: Double-Entry Ledger Infrastructure [CRITICAL]
- infrastructure/ledger/LedgerService.ts (atomic balanced posting)
- infrastructure/commission/CommissionEngine.ts (priority-ordered rule resolution)
- Invariant validator — SUM check before every commit

### Phase 4: Agent Wallet [CRITICAL]
- GET /api/v1/agents/wallet
- POST /api/v1/agents/wallet/topup (PhonePe -> webhook -> credit + ledger)
- GET /api/v1/agents/wallet/statement (paginated ledger)
- Credit limit management

### Phase 5: B2B Booking Integration [CRITICAL]
- Modify BookingsService: add agentId, CommissionSnapshot
- Modify PaymentsService: add wallet payment mode
- Modify confirmBooking: add ledger posting
- Modify CancellationsService: add ledger + commission reversal

### Phase 6: Agent Reports & Earnings [HIGH]
- GET /api/v1/agents/reports/bookings
- GET /api/v1/agents/reports/commissions
- GET /api/v1/agents/reports/statement
- GET /api/v1/agents/reports/export (background job: CSV/PDF)

### Phase 7: PDF Ticket Generation [HIGH]
- Install pdfkit
- Implement TICKET_GENERATION worker (fetch GDS BookingDetails, generate PDF, upload Cloudinary)
- Signed URL with 24h expiry for ticket access

### Phase 8: Admin B2B Controls [HIGH]
- modules/admin/agent-management: KYC review, approve/reject/suspend, credit management
- modules/admin/commission-management: rule CRUD, versioning, history
- modules/admin/ledger: platform ledger inspection, reconciliation, manual adjustments

### Phase 9: Agent Staff & Permissions [MEDIUM]
- POST /api/v1/agents/staff/invite
- GET /api/v1/agents/staff
- PATCH /api/v1/agents/staff/:id/role
- Staff permission enforcement in all agent endpoints

### Phase 10: Reconciliation & Monitoring [MEDIUM]
- Daily scheduled reconciliation: AgentWallet.cashBalance vs SUM(LedgerEntries)
- Alert on discrepancies
- Ledger balance audit endpoint

### Phase 11: Tests [ONGOING]
- Financial invariant tests (balanced ledger)
- Cross-tenant IDOR prevention tests
- Commission calculation unit tests
- Concurrent wallet debit race condition tests
- Provider timeout + reconciliation tests

---

## 11. Key Non-Functional Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Wallet debit atomicity | PostgreSQL $transaction + optimistic lock | Prevents double-debit |
| Commission calculation | Snapshot at booking creation | Rule changes don't retroactively affect past bookings |
| Provider timeout | BOOKING_UNKNOWN + BullMQ reconciliation | Never assume outcome |
| Refund | Only after verified provider cancellation | Never refund on unverified request |
| B2B agent booking | Wallet debit for bookings; PhonePe for top-up | Pre-funded wallet model |
| Tenant isolation | agentId from JWT -> AgentStaff membership | Never trust client-supplied agentId |
| PDF generation | Background job, idempotent, retry-safe | Never block booking confirmation |
| Credit limit | creditLimit stored, creditUsed tracked | Pre-authorized overdraft within limit |

---

## 12. Gaps & Known Limitations

| Gap | Risk Level | Mitigation |
|---|---|---|
| SMS/Email not wired | HIGH | Integrate MSG91/SendGrid in Phase 2-3 |
| PhonePe refund API version mismatch | MEDIUM | Adapter isolation, sandbox testing |
| PDF library performance | MEDIUM | Benchmark PDFKit vs puppeteer |
| Cloudinary private URLs | MEDIUM | Signed URLs with 24h expiry |
| Multi-provider support | LOW | Provider interface already abstracted |
| Real-time seat availability | LOW | 30s chart cache, freshness header |

---

## 13. Implementation Checklist

### Completed Implementation
- [x] Prisma schema migration (Agent, Ledger, Commission, Wallet, TopUp models)
- [x] POST /agents/register + KYC document endpoints
- [x] infrastructure/ledger/LedgerService.ts (balanced double-entry posting)
- [x] infrastructure/commission/CommissionEngine.ts (priority-ordered resolution)
- [x] Agent wallet CRUD + PhonePe top-up flow + webhook confirmation
- [x] Booking service B2B: agentId derivation, immutable commission snapshot, ledger posting
- [x] Wallet payment mode in PaymentsService with optimistic locking & credit limit
- [x] Cancellation ledger reversal + proportional commission clawback
- [x] PDF ticket generation (production PDFKit generator + streaming route + BullMQ worker)
- [x] Agent reports module (booking history, commission earnings, wallet statements, CSV export)
- [x] Admin agent management module (listing, details, KYC review, suspension, credit limit)
- [x] Admin commission management module (rule CRUD, priority, activation toggle)
- [x] Admin ledger management module (ledger inspection, daily reconciliation audit, balanced manual adjustment)
- [x] Agent staff management & granular RBAC (requireAgentRoles, invite, role assignment)
- [x] Daily reconciliation scheduled jobs (BullMQ JobScheduler + reconciliation audit worker)
- [x] Cross-tenant IDOR test suite (strict JWT-to-AgentStaff tenancy isolation)
- [x] Financial invariant test suite (debit == credit zero-delta invariant enforcement)
- [x] Commission calculation unit tests (priority ordering, fare floors, caps, tax-excluded base)
- [x] Concurrent wallet debit race condition tests (optimistic concurrency versioning)

### Already Implemented
- [x] GDS provider adapter (all 8 endpoints per Partner.md + Transactionapi.md)
- [x] JWT auth with refresh rotation and family reuse detection
- [x] PhonePe V2 Standard Checkout + signed webhook
- [x] Booking lifecycle with BOOKING_UNKNOWN reconciliation
- [x] Cancellation + refund pipeline with GDS IsCancellable/CancelSeats
- [x] BullMQ workers: reconciliation, refund processing, hold expiry, notifications
- [x] Admin 14-module panel with granular RBAC (AdminPermission enum)
- [x] Helmet, HPP, CORS, rate-limiting, idempotency records
- [x] Circuit breaker for GDS provider (5-failure threshold, 30s reset)
- [x] Structured logging (Pino) with request correlation IDs
- [x] Health + readiness endpoints
- [x] OpenAPI/Swagger documentation
- [x] Graceful shutdown with force-exit timeout
- [x] Booking status machine with all transitions defined
