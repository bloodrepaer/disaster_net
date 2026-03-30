# Ethereum Contracts — WIP

This folder will contain the Solidity contracts for DisasterNet's Hypercert minting and ERC-8004 impact receipts.

## Planned Contracts

### `DisasterNetHypercert.sol`
- ERC-8004 compliant Hypercert implementation
- Mints contribution certificates for each verified rescue action
- Metadata includes: volunteer ID (NEAR address), zone, action type, timestamp, IPFS proof CID
- Fractionalized — allows donors to claim partial impact certificates

### `ReliefEscrow.sol`
- Multi-sig escrow for NGO fund disbursement
- Conditions: World ID proof of recipient + IPFS field report CID + AI triage confirmation hash
- Compatible with Starknet bridge for cross-chain settlement

## Status

**Work in Progress** — Hypercert minting is simulated in the frontend (`js/app.js`).
Full Solidity implementation targeting post-hackathon milestone.

## Resources

- [Hypercerts Docs](https://docs.hypercerts.org)
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts)
