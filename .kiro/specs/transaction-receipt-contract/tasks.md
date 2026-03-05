# Implementation Plan: Transaction Receipt Contract

## Overview

This implementation plan breaks down the Transaction Receipt Contract into discrete coding tasks. The contract will be implemented as a Soroban smart contract in Rust, with comprehensive property-based testing using proptest and unit tests for specific scenarios.

The implementation follows an incremental approach:
1. Set up project structure and core types
2. Implement transaction ID generation and validation
3. Implement core contract functions (init, authorization, pause)
4. Implement receipt recording with validation
5. Implement query functions
6. Add comprehensive testing
7. Final integration and documentation

## Tasks

- [-] 1. Set up project structure and core types
  - Create Soroban contract project structure in contracts/transaction-receipt-contract
  - Define Receipt struct with all required and optional fields
  - Define StorageKey enum for all storage patterns
  - Define ContractError enum with all error variants
  - Define constants (ALLOWED_SOURCES array)
  - Set up test dependencies (proptest, soroban-sdk test utilities)
  - _Requirements: 2.1, 2.2, 2.3, 4.5_

- [x] 2. Implement transaction ID generation and canonicalization
  - [x] 2.1 Implement generate_tx_id helper function
    - Validate external_ref_source against ALLOWED_SOURCES
    - Validate external_ref (non-empty after trim, no pipes, max 256 chars)
    - Construct canonical string: "v1|source=<lowercased_trimmed_source>|ref=<trimmed_ref>"
    - Compute SHA-256 hash and return as BytesN<32>
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 4.9_
  
  - [ ]* 2.2 Write property test for canonicalization
    - **Property 8: Transaction ID canonicalization**
    - **Validates: Requirements 4.1, 4.2**
  
  - [ ]* 2.3 Write property test for normalization
    - **Property 9: External reference normalization**
    - **Validates: Requirements 4.3, 4.4**
  
  - [ ]* 2.4 Write property tests for validation
    - **Property 10: External reference source validation**
    - **Property 11: Empty external reference rejection**
    - **Property 12: Pipe character rejection**
    - **Property 13: External reference length validation**
    - **Validates: Requirements 4.5, 4.7, 4.8, 4.9**
  
  - [ ]* 2.5 Write unit tests for edge cases
    - Test boundary conditions (exactly 256 chars, 257 chars)
    - Test each allowed source value
    - Test various invalid source values
    - Test whitespace handling (leading, trailing, internal)
    - _Requirements: 4.1-4.9_

- [x] 3. Checkpoint - Ensure canonicalization tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement authorization helper functions
  - [x] 4.1 Implement require_admin function
    - Load admin from storage
    - Compare caller with admin
    - Return NotAuthorized error if mismatch
    - _Requirements: 5.2, 5.3, 5.4_
  
  - [x] 4.2 Implement require_operator function
    - Load operator from storage
    - Compare caller with operator
    - Return NotAuthorized error if mismatch
    - _Requirements: 5.1_
  
  - [x] 4.3 Implement require_not_paused function
    - Load paused state from storage
    - Return ContractPaused error if paused
    - _Requirements: 6.2_
  
  - [ ]* 4.4 Write property tests for authorization
    - **Property 15: Operator authorization for recording**
    - **Property 16: Admin authorization for set_operator**
    - **Property 17: Admin authorization for pause**
    - **Property 18: Admin authorization for unpause**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  
  - [ ]* 4.5 Write unit tests for authorization edge cases
    - Test with uninitialized contract
    - Test with various unauthorized addresses
    - _Requirements: 5.1-5.4_

- [x] 5. Implement initialization function
  - [x] 5.1 Implement init function
    - Check if already initialized (AlreadyInitialized error)
    - Store admin address
    - Store operator address
    - Initialize paused state to false
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 5.2 Write property test for initialization
    - **Property 1: Initialization stores addresses correctly**
    - **Property 2: Single initialization only**
    - **Validates: Requirements 1.2, 1.3**
  
  - [ ]* 5.3 Write unit tests for initialization
    - Test successful initialization
    - Test double initialization attempt
    - Test storage verification
    - _Requirements: 1.1, 1.2, 1.3_

- [~] 6. Implement pause mechanism
  - [x] 6.1 Implement pause and unpause functions
    - Add require_admin check
    - Update paused state in storage
    - Handle idempotent behavior (pause when paused, unpause when unpaused)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 6.2 Write property tests for pause mechanism
    - **Property 19: Paused state blocks recording**
    - **Property 20: Unpause restores recording capability**
    - **Property 21: Pause idempotence**
    - **Property 22: Unpause idempotence**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
  
  - [ ]* 6.3 Write unit tests for pause transitions
    - Test pause → unpause → pause sequences
    - Test recording attempts while paused
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [~] 7. Implement operator management
  - [x] 7.1 Implement set_operator function
    - Add require_admin check
    - Update operator address in storage
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ]* 7.2 Write property tests for operator management
    - **Property 23: Operator update round-trip**
    - **Property 24: Operator flexibility**
    - **Validates: Requirements 7.1, 7.3**
  
  - [ ]* 7.3 Write unit tests for operator changes
    - Test operator rotation scenarios
    - Test authorization after operator change
    - _Requirements: 7.1, 7.3_

- [~] 8. Checkpoint - Ensure core functions pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [~] 9. Implement receipt recording function
  - [x] 9.1 Implement record_receipt function
    - Add require_operator check
    - Add require_not_paused check
    - Validate amount_usdc is positive (InvalidAmount error)
    - Call generate_tx_id to get tx_id
    - Check for duplicate tx_id (DuplicateTransaction error)
    - Create Receipt struct with all fields (set external_ref = tx_id, timestamp = current ledger timestamp)
    - Store receipt in storage (Receipt key)
    - Update deal index (DealIndex and DealCount keys)
    - Emit event with topic ("receipt", tx_id) and receipt payload
    - Return tx_id
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 4.10, 5.1, 6.2, 10.1, 10.2, 10.3_
  
  - [ ]* 9.2 Write property test for receipt round-trip
    - **Property 3: Receipt storage round-trip**
    - **Property 5: Optional fields are preserved**
    - **Property 14: External ref field equals tx_id**
    - **Validates: Requirements 2.1, 2.3, 4.10**
  
  - [ ]* 9.3 Write property test for validation
    - **Property 4: Mandatory field validation**
    - **Property 6: Positive amount validation**
    - **Validates: Requirements 2.2, 2.4**
  
  - [ ]* 9.4 Write property test for duplicate prevention
    - **Property 7: Duplicate transaction rejection**
    - **Validates: Requirements 3.1**
  
  - [ ]* 9.5 Write property test for event emission
    - **Property 30: Event emission on successful recording**
    - **Validates: Requirements 10.1, 10.2, 10.3**
  
  - [ ]* 9.6 Write unit tests for receipt recording
    - Test with various tx_type values
    - Test with all optional fields present
    - Test with no optional fields
    - Test with various combinations of optional fields
    - Test error cases (zero amount, negative amount, duplicate)
    - _Requirements: 2.1-2.7, 3.1, 4.10, 10.1-10.3_

- [~] 10. Implement query functions
  - [x] 10.1 Implement get_receipt function
    - Load receipt from storage using tx_id
    - Return Some(receipt) if exists, None otherwise
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 10.2 Implement list_receipts_by_deal function
    - Load deal count from storage
    - Calculate start index from cursor (default 0)
    - Calculate end index from start + limit (capped at deal count)
    - Iterate through DealIndex keys to load tx_ids
    - Load receipts for each tx_id
    - Return vector of receipts
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 10.3 Write property tests for queries
    - **Property 25: Non-existent receipt returns None**
    - **Property 26: Deal-based query returns matching receipts**
    - **Property 27: Pagination limits results**
    - **Property 28: Deterministic ordering**
    - **Property 29: Cursor-based pagination**
    - **Validates: Requirements 8.2, 9.1, 9.2, 9.3, 9.4, 9.5**
  
  - [ ]* 10.4 Write unit tests for query edge cases
    - Test get_receipt with non-existent tx_id
    - Test list_receipts_by_deal with no receipts
    - Test list_receipts_by_deal with limit > total receipts
    - Test list_receipts_by_deal with cursor at end
    - Test list_receipts_by_deal with multiple deals
    - _Requirements: 8.1, 8.2, 9.1-9.5_

- [-] 11. Checkpoint - Ensure all core functionality tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 12. Integration and final testing
  - [-] 12.1 Write integration tests
    - Test complete workflow: init → record multiple receipts → query
    - Test authorization flow: init → set_operator → record with new operator
    - Test pause flow: init → record → pause → attempt record → unpause → record
    - Test deal queries with multiple receipts per deal
    - Test pagination across multiple pages
    - _Requirements: All requirements_
  
  - [ ]* 12.2 Write property test for complex scenarios
    - Generate random sequences of operations (record, query, pause, unpause, set_operator)
    - Verify contract invariants hold after each operation
    - _Requirements: All requirements_
  
  - [~] 12.3 Review test coverage
    - Ensure all 30 correctness properties have corresponding tests
    - Ensure all error conditions are tested
    - Ensure all acceptance criteria are covered
    - _Requirements: All requirements_

- [ ]* 13. Documentation and README
  - [ ]* 13.1 Write comprehensive README
    - Document contract purpose and features
    - Document initialization process
    - Document all functions with parameters and return values
    - Document error codes and meanings
    - Document canonical external reference format
    - Document metadata_hash format (SHA-256 of canonical receipt payload v1)
    - Provide usage examples
    - Document testing approach
    - _Requirements: 12.3_
  
  - [ ]* 13.2 Add inline code documentation
    - Add rustdoc comments to all public functions
    - Add rustdoc comments to all types (Receipt, StorageKey, ContractError)
    - Add examples in documentation
    - _Requirements: All requirements_

- [~] 14. Final checkpoint - Ensure all tests pass
  - Run cargo test to verify all unit and property tests pass
  - Verify test coverage meets requirements
  - Ask the user if questions arise or if ready for deployment

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests should run minimum 100 iterations each
- All property tests must be tagged with comments referencing design properties
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The contract uses Soroban SDK storage patterns and event emission
- Testing uses proptest for property-based tests and standard Rust test framework for unit tests
 