// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Phase 3 stub for ERC-8004 style contribution minting.
contract DisasterNetHypercert {
    struct Certificate {
        address volunteer;
        string zone;
        string action;
        string nearId;
        string ipfsCid;
        uint64 timestamp;
    }

    uint256 public nextId = 1;
    mapping(uint256 => Certificate) public certs;

    event HypercertMinted(
        uint256 indexed tokenId,
        address indexed volunteer,
        string zone,
        string action,
        string nearId,
        string ipfsCid,
        uint64 timestamp
    );

    function mintContribution(
        address volunteer,
        string calldata zone,
        string calldata action,
        string calldata nearId,
        string calldata ipfsCid
    ) external returns (uint256 tokenId) {
        require(volunteer != address(0), "VOLUNTEER_REQUIRED");
        require(bytes(zone).length > 0, "ZONE_REQUIRED");
        require(bytes(action).length > 0, "ACTION_REQUIRED");
        require(bytes(ipfsCid).length > 0, "CID_REQUIRED");

        tokenId = nextId++;
        certs[tokenId] = Certificate({
            volunteer: volunteer,
            zone: zone,
            action: action,
            nearId: nearId,
            ipfsCid: ipfsCid,
            timestamp: uint64(block.timestamp)
        });

        emit HypercertMinted(tokenId, volunteer, zone, action, nearId, ipfsCid, uint64(block.timestamp));
    }
}
