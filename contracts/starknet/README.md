# Starknet Contracts — WIP

This folder will contain the Cairo smart contracts for DisasterNet's fund disbursement layer.

## Planned Contracts

### `ReliefFund.cairo`
- Accepts STRK / ETH deposits from donors
- Releases funds to verified NGOs only when field conditions are confirmed by the Impulse AI agent
- Emits on-chain events for full auditability
- Integrates with World ID proof for recipient verification

### `HypercertBridge.cairo`
- Bridges Hypercert (ERC-8004) contribution records from Ethereum to Starknet
- Enables cross-chain fund matching based on volunteer impact

## Status

**Work in Progress** — prototype disbursement logic is simulated in the frontend (`js/app.js`). 
Full Cairo implementation targeting post-hackathon milestone.

## Resources

- [Starknet Developer Docs](https://docs.starknet.io)
- [Cairo Book](https://book.cairo-lang.org)
- [OpenZeppelin Cairo Contracts](https://github.com/OpenZeppelin/cairo-contracts)
