# Requirements Document: Transaction Receipt Contract

## Introduction

The Transaction Receipt Contract is a Soroban smart contract that provides immutable, auditable storage for all money movements in the Sheltaflex hybrid system. Every transaction must be recorded on-chain with standardized USDC amounts, while NGN values serve as metadata only. The contract enforces strict duplicate prevention through deterministic transaction ID generation and provides query capabilities for audit purposes.

## Glossary

- **Contract**: The Soroban smart contract that stores transaction receipts
- **Receipt**: An immutable record of a single money movement transaction
- **Operator**: The authorized address that can record new receipts
- **Admin**: The address with authority to manage the operator and pause state
- **tx_id**: A unique 32-byte identifier derived from external payment references
- **USDC**: The canonical token for all transaction amounts (referenced by Soroban Address)
- **NGN**: Nigerian Naira, stored as metadata only for reference
- **Canonical_External_Ref**: A deterministic string format for external payment references
- **Deal**: A business entity in Sheltaflex (e.g., rental agreement)
- **Listing**: A property listing in Sheltaflex

## Requirements

### Requirement 1: Initialize Contract

**User Story:** As a system deployer, I want to initialize the contract with admin and operator addresses, so that the contract is ready for authorized use.

#### Acceptance Criteria

1. THE Contract SHALL accept an admin address and operator address during initialization
2. WHEN initialization is complete, THE Contract SHALL store both addresses in contract storage
3. THE Contract SHALL only allow initialization once (prevent re-initialization)

### Requirement 2: Receipt Storage

**User Story:** As an operator, I want to record transaction receipts with complete transaction details, so that all money movements are permanently tracked on-chain.

#### Acceptance Criteria

1. WHEN a valid receipt is submitted, THE Contract SHALL store all receipt fields in contract storage
2. THE Contract SHALL require the following mandatory fields: tx_id, tx_type, amount_usdc, token, deal_id, timestamp
3. THE Contract SHALL accept the following optional fields: listing_id, from, to, amount_ngn, fx_rate_ngn_per_usdc, fx_provider, metadata_hash
4. THE Contract SHALL validate that amount_usdc is positive (greater than zero)
5. THE Contract SHALL validate that token is a valid Soroban Address
6. THE Contract SHALL validate that tx_type is a valid Symbol
7. THE Contract SHALL validate that timestamp is a valid u64 value

### Requirement 3: Duplicate Prevention

**User Story:** As a system architect, I want the contract to reject duplicate transaction IDs, so that the same payment cannot be recorded twice.

#### Acceptance Criteria

1. WHEN a receipt with an existing tx_id is submitted, THE Contract SHALL reject the submission with a clear error
2. THE Contract SHALL maintain a mapping of tx_id to receipt for duplicate detection
3. THE Contract SHALL never overwrite an existing receipt

### Requirement 4: Transaction ID Canonicalization

**User Story:** As a backend developer, I want deterministic transaction ID generation from external payment references, so that retries are safe and idempotent.

#### Acceptance Criteria

1. THE Contract SHALL derive tx_id as SHA-256 hash of the canonical external reference string
2. THE Contract SHALL use the format "v1|source=<external_ref_source>|ref=<external_ref>" for canonical strings
3. THE Contract SHALL lowercase and trim the external_ref_source value
4. THE Contract SHALL trim the external_ref value while preserving case
5. THE Contract SHALL accept only these external_ref_source values: paystack, flutterwave, bank_transfer, stellar, onramp, offramp, manual_admin
6. WHEN external_ref_source is missing or invalid, THE Contract SHALL reject the input
7. WHEN external_ref is missing or empty after trimming, THE Contract SHALL reject the input
8. WHEN external_ref contains the pipe character (|), THE Contract SHALL reject the input
9. WHEN external_ref exceeds 256 characters, THE Contract SHALL reject the input
10. THE Contract SHALL set external_ref field equal to tx_id (same 32 bytes)

### Requirement 5: Authorization and Access Control

**User Story:** As an admin, I want to control who can record receipts and manage contract state, so that only authorized parties can modify the ledger.

#### Acceptance Criteria

1. WHEN record_receipt is called, THE Contract SHALL verify the caller is the current operator
2. WHEN set_operator is called, THE Contract SHALL verify the caller is the admin
3. WHEN pause is called, THE Contract SHALL verify the caller is the admin
4. WHEN unpause is called, THE Contract SHALL verify the caller is the admin
5. WHEN an unauthorized address attempts a restricted operation, THE Contract SHALL reject with an authorization error

### Requirement 6: Pause Mechanism

**User Story:** As an admin, I want to pause and unpause receipt recording, so that I can halt operations during emergencies or maintenance.

#### Acceptance Criteria

1. THE Contract SHALL maintain a boolean pause state in storage
2. WHEN the contract is paused, THE Contract SHALL reject all record_receipt calls
3. WHEN the contract is unpaused, THE Contract SHALL accept record_receipt calls from the operator
4. WHEN pause is called while already paused, THE Contract SHALL succeed without error
5. WHEN unpause is called while already unpaused, THE Contract SHALL succeed without error

### Requirement 7: Operator Management

**User Story:** As an admin, I want to update the operator address, so that I can rotate credentials or change authorized parties.

#### Acceptance Criteria

1. WHEN set_operator is called with a valid address, THE Contract SHALL update the operator in storage
2. WHEN set_operator is called, THE Contract SHALL verify the caller is the admin
3. THE Contract SHALL allow setting the operator to any valid Soroban Address

### Requirement 8: Receipt Retrieval

**User Story:** As an auditor, I want to retrieve a specific receipt by transaction ID, so that I can verify individual transactions.

#### Acceptance Criteria

1. WHEN get_receipt is called with a valid tx_id, THE Contract SHALL return the complete receipt if it exists
2. WHEN get_receipt is called with a non-existent tx_id, THE Contract SHALL return None
3. THE Contract SHALL return all stored fields for the receipt

### Requirement 9: Deal-Based Query

**User Story:** As an auditor, I want to list all receipts for a specific deal with pagination, so that I can review all transactions related to a business entity.

#### Acceptance Criteria

1. WHEN list_receipts_by_deal is called, THE Contract SHALL return receipts matching the specified deal_id
2. THE Contract SHALL support pagination through limit and cursor parameters
3. THE Contract SHALL return receipts in a deterministic order
4. WHEN limit is specified, THE Contract SHALL return at most that many receipts
5. WHEN cursor is provided, THE Contract SHALL return receipts starting after that cursor position

### Requirement 10: Event Emission

**User Story:** As a backend system, I want the contract to emit events when receipts are recorded, so that I can monitor and index transactions off-chain.

#### Acceptance Criteria

1. WHEN a receipt is successfully recorded, THE Contract SHALL emit an event
2. THE Contract SHALL include the topic ("receipt", tx_id) in the emitted event
3. THE Contract SHALL include the complete receipt data in the event payload

### Requirement 11: USDC Canonicalization

**User Story:** As a system architect, I want USDC to be the canonical amount representation, so that all financial calculations use a consistent standard.

#### Acceptance Criteria

1. THE Contract SHALL store amount_usdc as the primary transaction amount
2. THE Contract SHALL store the USDC token contract Address in the token field
3. THE Contract SHALL treat amount_ngn as optional metadata only
4. THE Contract SHALL treat fx_rate_ngn_per_usdc as optional metadata only
5. THE Contract SHALL treat fx_provider as optional metadata only

### Requirement 12: Metadata Integrity

**User Story:** As a compliance officer, I want optional cryptographic verification of receipt payloads, so that I can detect tampering or corruption.

#### Acceptance Criteria

1. THE Contract SHALL accept an optional metadata_hash field
2. WHEN metadata_hash is provided, THE Contract SHALL store it as a BytesN<32>
3. THE Contract SHALL document that metadata_hash represents SHA-256 of canonical receipt payload v1
