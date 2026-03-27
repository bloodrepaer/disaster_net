# Impulse AI — Backend Agent (WIP)

This folder will contain the backend implementation of the Impulse AI triage agent.

## Architecture

The current prototype runs Impulse AI entirely in the browser (direct Anthropic API call from `js/app.js`).

The production backend will:

1. **Run a persistent agent loop** — continuously monitors incoming field reports from the mesh network
2. **Maintain zone state** — tracks resource allocation, victim counts, and route status in real time
3. **Issue routing commands** — pushes decisions back to field devices via WebSockets
4. **Gate Starknet transactions** — signs fund disbursement transactions after AI-verified field confirmation
5. **Generate IPFS content hashes** — packages field reports + AI decisions into provenance bundles

## Planned Stack

- **Runtime**: Node.js (or Python with FastAPI)
- **AI**: Anthropic Claude API (claude-sonnet model)
- **Mesh relay**: WebSocket server for real-network deployment (vs BroadcastChannel for browser demo)
- **Storage**: Storacha SDK for IPFS/Filecoin pinning
- **Auth**: World ID SDK for volunteer verification

## Files (Planned)

```
agent/
├── index.js          # Main agent loop
├── triage.js         # Claude API integration + prompt management
├── mesh.js           # WebSocket mesh relay
├── storage.js        # IPFS/Storacha integration
├── starknet.js       # Contract interaction for fund disbursement
└── .env.example      # Environment variable template
```

## Status

**Work in Progress** — the browser-side agent in `js/app.js` is a complete functional prototype.
Backend agent targeting post-hackathon milestone.
