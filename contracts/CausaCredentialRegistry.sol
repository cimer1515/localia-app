// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CAUSA Credential Registry
/// @notice Stores credential hashes and issuer/revocation metadata on an EVM-compatible ME Network.
/// @dev Store only a hash or non-sensitive identifier on-chain. Never store personal documents or PII.
contract CausaCredentialRegistry {
    address public owner;

    struct Credential {
        bytes32 documentHash;
        address issuer;
        uint64 issuedAt;
        bool revoked;
    }

    mapping(address => bool) public authorizedIssuers;
    mapping(bytes32 => Credential) private credentials;

    event IssuerAuthorizationChanged(address indexed issuer, bool authorized);
    event CredentialRegistered(
        bytes32 indexed credentialId,
        bytes32 indexed documentHash,
        address indexed issuer,
        uint64 issuedAt
    );
    event CredentialRevoked(bytes32 indexed credentialId, address indexed issuer);

    modifier onlyOwner() {
        require(msg.sender == owner, "LOCALIA: owner only");
        _;
    }

    modifier onlyIssuer() {
        require(authorizedIssuers[msg.sender], "LOCALIA: issuer not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
        emit IssuerAuthorizationChanged(msg.sender, true);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "LOCALIA: zero owner");
        owner = newOwner;
    }

    function setIssuer(address issuer, bool authorized) external onlyOwner {
        require(issuer != address(0), "LOCALIA: zero issuer");
        authorizedIssuers[issuer] = authorized;
        emit IssuerAuthorizationChanged(issuer, authorized);
    }

    /// @param credentialId Unique opaque ID (prefer random; do not use personal identifiers).
    /// @param documentHash Hash of the certificate/document created off-chain.
    function registerCredential(bytes32 credentialId, bytes32 documentHash) external onlyIssuer {
        require(credentialId != bytes32(0), "LOCALIA: empty ID");
        require(documentHash != bytes32(0), "LOCALIA: empty hash");
        require(credentials[credentialId].issuedAt == 0, "LOCALIA: already registered");

        credentials[credentialId] = Credential({
            documentHash: documentHash,
            issuer: msg.sender,
            issuedAt: uint64(block.timestamp),
            revoked: false
        });

        emit CredentialRegistered(credentialId, documentHash, msg.sender, uint64(block.timestamp));
    }

    function revokeCredential(bytes32 credentialId) external {
        Credential storage credential = credentials[credentialId];
        require(credential.issuedAt != 0, "LOCALIA: unknown credential");
        require(msg.sender == credential.issuer || msg.sender == owner, "LOCALIA: not issuer or owner");
        require(!credential.revoked, "LOCALIA: already revoked");

        credential.revoked = true;
        emit CredentialRevoked(credentialId, msg.sender);
    }

    function verifyCredential(bytes32 credentialId, bytes32 documentHash)
        external
        view
        returns (bool valid, address issuer, uint64 issuedAt, bool revoked)
    {
        Credential storage credential = credentials[credentialId];
        bool exists = credential.issuedAt != 0;
        valid = exists && credential.documentHash == documentHash && !credential.revoked;
        return (valid, credential.issuer, credential.issuedAt, credential.revoked);
    }

    function getCredential(bytes32 credentialId)
        external
        view
        returns (bytes32 documentHash, address issuer, uint64 issuedAt, bool revoked)
    {
        Credential storage credential = credentials[credentialId];
        return (credential.documentHash, credential.issuer, credential.issuedAt, credential.revoked);
    }
}
