# Design Document: Transaction Receipt Contract

## Overview

The Transaction Receipt Contract is a Soroban smart contract that provides immutable, append-only storage for transaction receipts. The contract enforces strict authorization (admin/operator model), duplicate prevention through deterministic transaction ID generation, and supports audit queries with pagination.

The design prioritizes:
- **Immutability**: Receipts cannot be modified or deleted once recorded
- **Idempotency**: Deterministic tx_id generation from external references enables safe retries
- **Auditability**: Query functions support compliance and financial reconciliation
- **Authorization**: Role-based access control (admin manages operator, operator records receipts)
- **Pause capability**: Emergency stop mechanism for operational safety

## Architecture

### Contract Structure

The contract follows a standard Soroban contract pattern with:
- Storage-based state management using Soroban's persistent storage
- Function-based interface with clear authorization boundaries
- Event emission for off-chain indexing and monitoring

### Authorization Model

Two-tier authorization:
1. **Admin**: Can set operator, pause/unpause contract (set during initialization, immutable)
2. **Operator**: Can record receipts (can be changed by admin)

This separation allows operational flexibility (rotating operator credentials) while maintaining admin control.

### Storage Strategy

The contract uses three primary storage patterns:
1. **Singleton values**: admin, operator, paused state
2. **Key-value mapping**: tx_id → Receipt (for get_receipt)
3. **Secondary index**: deal_id → list of tx_ids (for list_receipts_by_deal)

## Components and Interfaces

### Core Functions

#### Initialization
```rust
fn init(env: Env, admin: Address, operator: Address)
```
- Sets admin and operator addresses
- Initializes paused state to false
- Can only be called once

#### Authorization Management
```rust
fn set_operator(env: Env, new_operator: Address)
```
- Requires: caller is admin
- Updates operator address in storage

#### Pause Control
```rust
fn pause(env: Env)
fn unpause(env: Env)
```
- Requires: caller is admin
- Updates paused state in storage

#### Receipt Recording
```rust
fn record_receipt(
    env: Env,
    external_ref_source: Symbol,
    external_ref: String,
    tx_type: Symbol,
    amount_usdc: i128,
    token: Address,
    deal_id: String,
    listing_id: Option<String>,
    from: Option<Address>,
    to: Option<Address>,
    amount_ngn: Option<i128>,
    fx_rate_ngn_per_usdc: Option<i128>,
    fx_provider: Option<String>,
    metadata_hash: Option<BytesN<32>>,
) -> BytesN<32>
```
- Requires: caller is operator, contract not paused
- Validates inputs (positive amount, valid addresses, valid tx_type)
- Generates tx_id from canonical external reference
- Checks for duplicate tx_id
- Stores receipt
- Emits event
- Returns tx_id

#### Query Functions
```rust
fn get_receipt(env: Env, tx_id: BytesN<32>) -> Option<Receipt>
```
- Returns receipt if exists, None otherwise
- No authorization required (public read)

```rust
fn list_receipts_by_deal(
    env: Env,
    deal_id: String,
    limit: u32,
    cursor: Option<u32>,
) -> Vec<Receipt>
```
- Returns receipts for specified deal_id
- Supports pagination via limit and cursor
- Returns receipts in deterministic order (by storage order)
- No authorization required (public read)

### Helper Functions

#### Transaction ID Generation
```rust
fn generate_tx_id(
    external_ref_source: &Symbol,
    external_ref: &String,
) -> Result<BytesN<32>, ContractError>
```
- Validates external_ref_source against allowed values
- Validates external_ref (non-empty, no pipes, max 256 chars)
- Constructs canonical string: "v1|source=<source>|ref=<ref>"
- Returns SHA-256 hash as tx_id

#### Authorization Checks
```rust
fn require_admin(env: &Env, caller: &Address) -> Result<(), ContractError>
fn require_operator(env: &Env, caller: &Address) -> Result<(), ContractError>
fn require_not_paused(env: &Env) -> Result<(), ContractError>
```

## Data Models

### Receipt Structure
```rust
#[contracttype]
pub struct Receipt {
    pub tx_id: BytesN<32>,
    pub tx_type: Symbol,
    pub amount_usdc: i128,
    pub token: Address,
    pub deal_id: String,
    pub listing_id: Option<String>,
    pub from: Option<Address>,
    pub to: Option<Address>,
    pub external_ref: BytesN<32>,  // Same as tx_id
    pub amount_ngn: Option<i128>,
    pub fx_rate_ngn_per_usdc: Option<i128>,
    pub fx_provider: Option<String>,
    pub metadata_hash: Option<BytesN<32>>,
    pub timestamp: u64,
}
```

### Storage Keys
```rust
#[contracttype]
pub enum StorageKey {
    Admin,
    Operator,
    Paused,
    Receipt(BytesN<32>),           // tx_id → Receipt
    DealIndex(String, u32),        // (deal_id, index) → tx_id
    DealCount(String),             // deal_id → count
}
```

### Error Types
```rust
#[contracterror]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotAuthorized = 2,
    ContractPaused = 3,
    DuplicateTransaction = 4,
    InvalidAmount = 5,
    InvalidExternalRefSource = 6,
    InvalidExternalRef = 7,
    InvalidTimestamp = 8,
}
```

### Allowed External Reference Sources
```rust
const ALLOWED_SOURCES: [&str; 7] = [
    "paystack",
    "flutterwave",
    "bank_transfer",
    "stellar",
    "onramp",
    "offramp",
    "manual_admin",
];
```

### Canonical External Reference Format
```
v1|source=<external_ref_source>|ref=<external_ref>
```

Where:
- `external_ref_source` is lowercased and trimmed
- `external_ref` is trimmed but case-preserved
- The entire string is hashed with SHA-256 to produce tx_id


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Initialization stores addresses correctly
*For any* valid admin and operator addresses, after initialization, querying storage should return those exact addresses.
**Validates: Requirements 1.2**

### Property 2: Single initialization only
*For any* initialized contract, attempting to call init again should fail with AlreadyInitialized error.
**Validates: Requirements 1.3**

### Property 3: Receipt storage round-trip
*For any* valid receipt with all required and optional fields, after recording it, calling get_receipt with its tx_id should return a receipt with identical field values.
**Validates: Requirements 2.1, 8.1**

### Property 4: Mandatory field validation
*For any* receipt missing one or more mandatory fields (tx_type, amount_usdc, token, deal_id), the contract should reject it with an appropriate error.
**Validates: Requirements 2.2**

### Property 5: Optional fields are preserved
*For any* valid receipt with various combinations of optional fields (listing_id, from, to, amount_ngn, fx_rate_ngn_per_usdc, fx_provider, metadata_hash), after recording and retrieving, all provided optional fields should be preserved exactly.
**Validates: Requirements 2.3**

### Property 6: Positive amount validation
*For any* amount_usdc value that is zero or negative, the contract should reject the receipt with InvalidAmount error.
**Validates: Requirements 2.4**

### Property 7: Duplicate transaction rejection
*For any* receipt that has been successfully recorded, attempting to record another receipt with the same tx_id should fail with DuplicateTransaction error.
**Validates: Requirements 3.1**

### Property 8: Transaction ID canonicalization
*For any* valid external_ref_source and external_ref, the tx_id should be the SHA-256 hash of the canonical string "v1|source=<lowercased_trimmed_source>|ref=<trimmed_ref>".
**Validates: Requirements 4.1, 4.2**

### Property 9: External reference normalization
*For any* external_ref_source with different casing or surrounding whitespace, the resulting tx_id should be identical (case-insensitive, whitespace-trimmed). For any external_ref with surrounding whitespace, the tx_id should be the same as the trimmed version, but different casing in external_ref should produce different tx_ids.
**Validates: Requirements 4.3, 4.4**

### Property 10: External reference source validation
*For any* external_ref_source value not in the allowed list (paystack, flutterwave, bank_transfer, stellar, onramp, offramp, manual_admin), the contract should reject it with InvalidExternalRefSource error.
**Validates: Requirements 4.5**

### Property 11: Empty external reference rejection
*For any* external_ref that is empty or contains only whitespace characters, the contract should reject it with InvalidExternalRef error.
**Validates: Requirements 4.7**

### Property 12: Pipe character rejection
*For any* external_ref containing the pipe character (|), the contract should reject it with InvalidExternalRef error.
**Validates: Requirements 4.8**

### Property 13: External reference length validation
*For any* external_ref exceeding 256 characters, the contract should reject it with InvalidExternalRef error.
**Validates: Requirements 4.9**

### Property 14: External ref field equals tx_id
*For any* successfully recorded receipt, the external_ref field should be equal to the tx_id field (both are the same 32-byte value).
**Validates: Requirements 4.10**

### Property 15: Operator authorization for recording
*For any* address that is not the current operator, calling record_receipt should fail with NotAuthorized error. For the operator address (when contract is not paused and inputs are valid), record_receipt should succeed.
**Validates: Requirements 5.1**

### Property 16: Admin authorization for set_operator
*For any* address that is not the admin, calling set_operator should fail with NotAuthorized error. For the admin address, set_operator should succeed.
**Validates: Requirements 5.2**

### Property 17: Admin authorization for pause
*For any* address that is not the admin, calling pause should fail with NotAuthorized error. For the admin address, pause should succeed.
**Validates: Requirements 5.3**

### Property 18: Admin authorization for unpause
*For any* address that is not the admin, calling unpause should fail with NotAuthorized error. For the admin address, unpause should succeed.
**Validates: Requirements 5.4**

### Property 19: Paused state blocks recording
*For any* valid receipt and authorized operator, when the contract is paused, calling record_receipt should fail with ContractPaused error.
**Validates: Requirements 6.2**

### Property 20: Unpause restores recording capability
*For any* contract that is paused then unpaused, record_receipt should work normally for the operator (assuming valid inputs).
**Validates: Requirements 6.3**

### Property 21: Pause idempotence
*For any* contract state, calling pause multiple times should succeed without error, and the contract should remain paused.
**Validates: Requirements 6.4**

### Property 22: Unpause idempotence
*For any* contract state, calling unpause multiple times should succeed without error, and the contract should remain unpaused.
**Validates: Requirements 6.5**

### Property 23: Operator update round-trip
*For any* valid address, after the admin calls set_operator with that address, subsequent record_receipt calls should only succeed when called by that new address.
**Validates: Requirements 7.1**

### Property 24: Operator flexibility
*For any* valid Soroban Address, the admin should be able to set it as the operator successfully.
**Validates: Requirements 7.3**

### Property 25: Non-existent receipt returns None
*For any* tx_id that has never been recorded, calling get_receipt should return None.
**Validates: Requirements 8.2**

### Property 26: Deal-based query returns matching receipts
*For any* deal_id, all receipts returned by list_receipts_by_deal should have that exact deal_id value.
**Validates: Requirements 9.1**

### Property 27: Pagination limits results
*For any* deal_id and limit value, calling list_receipts_by_deal should return at most limit receipts.
**Validates: Requirements 9.2, 9.4**

### Property 28: Deterministic ordering
*For any* deal_id, calling list_receipts_by_deal multiple times with the same parameters should return receipts in the same order.
**Validates: Requirements 9.3**

### Property 29: Cursor-based pagination
*For any* deal_id and cursor value, receipts returned with the cursor should be a subset of all receipts for that deal, starting after the cursor position.
**Validates: Requirements 9.5**

### Property 30: Event emission on successful recording
*For any* successfully recorded receipt, the contract should emit an event with topic ("receipt", tx_id) and payload containing all receipt fields.
**Validates: Requirements 10.1, 10.2, 10.3**

## Error Handling

### Error Categories

1. **Authorization Errors** (NotAuthorized)
   - Caller is not admin when admin is required
   - Caller is not operator when operator is required

2. **State Errors** (ContractPaused, AlreadyInitialized)
   - Contract is paused when recording receipt
   - Contract is already initialized when calling init

3. **Validation Errors** (InvalidAmount, InvalidExternalRefSource, InvalidExternalRef, InvalidTimestamp)
   - Amount is zero or negative
   - External ref source not in allowed list
   - External ref is empty, contains pipes, or exceeds 256 chars
   - Timestamp is invalid (though u64 type provides basic validation)

4. **Business Logic Errors** (DuplicateTransaction)
   - Attempting to record a receipt with an existing tx_id

### Error Handling Strategy

- All errors should be returned as Result types with descriptive ContractError variants
- Errors should be checked early (fail fast) before any state modifications
- Authorization checks should occur before validation checks
- State checks (paused) should occur before business logic
- All errors should be propagated to the caller with clear error codes

### Transaction Atomicity

Soroban provides transaction atomicity at the contract call level:
- If any error occurs during record_receipt, no state changes are persisted
- This ensures receipts are never partially recorded
- Duplicate detection is atomic (check and insert are in the same transaction)

## Testing Strategy

### Dual Testing Approach

The contract will use both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs using randomized testing

Both approaches are complementary and necessary. Unit tests catch concrete bugs and validate specific scenarios, while property tests verify general correctness across a wide input space.

### Property-Based Testing

We will use **proptest** (Rust property-based testing library) for property tests.

**Configuration**:
- Each property test should run a minimum of 100 iterations
- Each test must be tagged with a comment referencing the design property
- Tag format: `// Feature: transaction-receipt-contract, Property N: <property text>`
- Each correctness property must be implemented by a single property-based test

**Property Test Coverage**:
- Canonicalization properties (Properties 8, 9)
- Validation properties (Properties 4, 6, 10-13)
- Authorization properties (Properties 15-18)
- Round-trip properties (Properties 1, 3, 23)
- Duplicate prevention (Property 7)
- Pause mechanism (Properties 19-22)
- Query properties (Properties 25-29)
- Event emission (Property 30)

### Unit Testing

Unit tests should focus on:
- Specific examples demonstrating correct behavior
- Edge cases (empty strings, boundary values, maximum lengths)
- Error conditions (unauthorized access, invalid inputs)
- Integration between components (storage, events, authorization)

**Unit Test Coverage**:
- Initialization scenarios
- Authorization boundary cases
- Pause/unpause state transitions
- Receipt recording with various field combinations
- Query functions with different data sets
- Error handling for all error types

### Test Organization

```
tests/
├── unit/
│   ├── initialization.rs
│   ├── authorization.rs
│   ├── pause.rs
│   ├── receipt_recording.rs
│   ├── queries.rs
│   └── errors.rs
└── property/
    ├── canonicalization.rs
    ├── validation.rs
    ├── authorization.rs
    ├── round_trip.rs
    ├── duplicate_prevention.rs
    └── queries.rs
```

### Testing Tools

- **Soroban SDK test utilities**: For contract testing environment
- **proptest**: For property-based testing with random input generation
- **Rust standard test framework**: For unit tests

### Test Data Generation

For property tests, we need generators for:
- Random addresses (admin, operator, from, to)
- Random external references (valid and invalid)
- Random external reference sources (valid and invalid)
- Random amounts (positive, zero, negative)
- Random strings (deal_id, listing_id, fx_provider)
- Random optional fields (Some/None combinations)
- Random timestamps

### Continuous Integration

All tests (unit and property) should run on every commit:
- Cargo test should execute all tests
- Property tests should use a fixed seed for reproducibility in CI
- Test coverage should be measured and tracked
