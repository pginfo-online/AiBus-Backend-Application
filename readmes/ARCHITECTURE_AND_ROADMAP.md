# ARCHITECTURE AND IMPLEMENTATION ROADMAP

## 1. System Architecture Overview

The AiBus mobile application is architected around a strict **Feature-First + Clean Infrastructure** design. No screen component interacts directly with network clients, storage primitives, or native payment SDKs.

```text
mobile/
├── plugins/
│   └── withPhonePe.ts                 # Custom Expo Config Plugin for PhonePe
├── src/
│   ├── core/                          # Infrastructure Boundaries
│   │   ├── api/                       # API clients, axios instance, interceptors
│   │   ├── auth/                      # Session manager, token refresh mutex
│   │   ├── config/                    # Environment variables, constants
│   │   ├── errors/                    # AppError classes, error normalization
│   │   ├── localization/              # English, Hindi, Marathi i18n
│   │   ├── logging/                   # Structured logger
│   │   ├── networking/                # Network state monitoring (offline/online)
│   │   ├── payments/                  # PhonePe native & web checkout orchestrator
│   │   └── storage/                   # SecureStore & MMKV adapters
│   ├── design-system/                 # redBus/AbhiBus-inspired design tokens & components
│   │   ├── tokens/                    # colors, typography, spacing, radii, shadows
│   │   └── components/                # AppText, AppButton, AppCard, AppInput, etc.
│   ├── features/                      # Domain features
│   │   ├── auth/                      # Login, signup, user hooks & services
│   │   ├── search/                    # From/To city autocomplete, date selector, swap
│   │   ├── buses/                     # Bus result list, filter bars, sorting
│   │   ├── seats/                     # Interactive seat deck layout, price ticker
│   │   ├── booking/                   # Boarding/dropping selector, passenger forms, review
│   │   ├── payments/                  # Payment methods, PhonePe state machine
│   │   └── tickets/                   # Ticket viewer, QR/PNR, share & print
│   ├── stores/                        # Zustand stores (useAuthStore, useBookingStore, useAppStore)
│   └── app/                           # Expo Router file-based routes
│       ├── _layout.tsx
│       ├── (auth)/
│       │   ├── login.tsx
│       │   └── signup.tsx
│       ├── (tabs)/
│       │   ├── _layout.tsx
│       │   ├── home.tsx
│       │   ├── bookings.tsx
│       │   ├── help.tsx
│       │   └── account.tsx
│       ├── search/
│       │   ├── from-city.tsx
│       │   ├── to-city.tsx
│       │   └── buses.tsx
│       ├── booking/
│       │   ├── seat-map.tsx
│       │   ├── boarding-dropping.tsx
│       │   ├── passenger-details.tsx
│       │   ├── review.tsx
│       │   ├── payment.tsx
│       │   └── processing.tsx
│       └── ticket/
│           └── [bookingId].tsx
```

---

## 2. Navigation Architecture

* **Root Stack:**
  * `(tabs)`: Primary tab navigator (`Home`, `Bookings`, `Help`, `Account`).
  * `(auth)`: Login and Signup modals / stack screens.
  * `search/from-city` & `search/to-city`: Full-screen modal transitions with instant autofocus and keyboard avoidance.
  * `search/buses`: Search results screen with sticky filter bar and virtualized list.
  * `booking/*`: Guided booking checkout flow (`seat-map` -> `boarding-dropping` -> `passenger-details` -> `review` -> `payment` -> `processing`).
  * `ticket/[bookingId]`: Dedicated confirmed ticket screen with sharing and print actions.

---

## 3. State Management Architecture

State is cleanly partitioned into three non-overlapping layers:

1. **Server State (TanStack Query):**
   * Manages server responses: bus lists, city lists, seat charts, user profiles, booking history, tickets.
   * Fine-grained stale times:
     * Cities: 24 hours.
     * Seat Charts: 30 seconds.
     * Bus Results: 60 seconds.
     * User Profile: 5 minutes.
2. **Client Workflow State (Zustand):**
   * `useAuthStore`: Authenticated session, user info, token presence.
   * `useBookingStore`: Transient booking workflow: selected bus, selected seats, pickup/dropoff points, passengers, hold ID, hold timer expiry.
   * `useAppStore`: Theme (Light/Dark), Language (English/Hindi/Marathi), recent searches.
3. **Local Component State (`useState`):**
   * Ephemeral UI toggles: modal visible, bottom sheet snap point, local text input values.

---

## 4. Security Strategy

* **Zero Plain-Text Token Storage:** JWT access tokens and refresh tokens are stored exclusively in `expo-secure-store`.
* **Zero Sensitive Logging:** Passwords, tokens, payment signatures, and card details are scrubbed from loggers and analytics events.
* **Server-Authoritative Pricing:** The client never computes the final transaction amount. All payable amounts are passed directly from backend hold/booking responses.
* **Idempotency Keys:** Every mutation (`holds`, `bookings`, `payments`, `cancellations`) sends a unique UUID in the `Idempotency-Key` header.

---

## 5. Offline & Network Strategy

* Network awareness via `expo-network` / NetInfo.
* If disconnected:
  * Persistent banner alerts user of offline state.
  * City search uses cached popular Indian hubs (Mumbai, Pune, Bangalore, Delhi, Hyderabad, Chennai, Ahmedabad, Goa, Jaipur, etc.).
  * Recent tickets are cached in storage for offline display at boarding time.
  * Non-idempotent booking mutations are disabled until connectivity is restored.

---

## 6. Implementation Roadmap

| Phase | Milestone | Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | Inspection & Analysis | Maps, contracts, error taxonomy, state machines. |
| **Phase 2** | Dependencies & Infrastructure | Add required packages, TypeScript config, design tokens, icons. |
| **Phase 3** | Core Services & Design System | Axios client, auth manager, error normalizer, Reusable UI primitives. |
| **Phase 4** | Navigation & Tab Shell | 4 tabs (Home, Bookings, Help, Account) with light/dark theme support. |
| **Phase 5** | Search & Discovery | From/To city autocomplete, date selector with presets, From/To swap animation. |
| **Phase 6** | Bus Results & Seat Map | Bus cards, filter bar, interactive sleeper/seater layout, price ticker. |
| **Phase 7** | Booking Checkout Flow | Boarding/dropping selector, passenger forms, review screen, GSTIN fields. |
| **Phase 8** | PhonePe Payment Integration | Native config plugin, payment state machine, payment processing screen. |
| **Phase 9** | Tickets & History | Confirmed ticket screen, sharing, print, bookings tab with status filtering. |
| **Phase 10** | Localization & Polish | English, Hindi, Marathi translations, dark theme polish, verification tests. |
