# DisasterNet Full Architecture Diagram

## Phase 1-4 System Overview

```mermaid
graph TB
    subgraph Frontend["Frontend Apps"]
        A1["Rescue Team App"]
        A2["Family Portal"]
        A3["Admin Dashboard"]
    end

    subgraph API_Layer["API Layer (Phase 1-2)"]
        B1["POST /api/v1/sync-bundles"]
        B2["GET /api/v1/anchor-receipts"]
        B3["POST /api/v1/persons/:id/status"]
        B4["POST /api/v1/family/verify-otp"]
    end

    subgraph Phase_1_2["Phase 1-2: Data Collection & Anchoring"]
        C1["Volunteer Registry"]
        C2["Sync Bundle Manager"]
        C3["Anchor Job Queue"]
        C4["Receipt Tracker"]
        C5["Person DB"]
        C6["OTP Service"]
    end

    subgraph Phase_4["Phase 4: Multi-Chain Compensation"]
        D1["Starknet Contract"]
        D2["Ronin Contract"]
        D3["Confirmation Poller"]
        D4["Multi-Chain Adapter"]
        D5["Family Claim Handler"]
    end

    subgraph Storage["Persistent Storage"]
        E1["PostgreSQL"]
        E2["Redis"]
        E3["IPFS/Storacha"]
        E4["Chain State"]
    end

    subgraph Notifications["Notifications"]
        F1["SMS Service"]
        F2["WebSocket Events"]
    end

    A1 -->|register volunteer| B1
    A1 -->|submit bundle| B1
    A1 -->|confirm status| B3
    A2 -->|request OTP| B4
    
    B1 -->|validate| C1
    B1 -->|create bundle| C2
    B1 -->|queue anchor| C3
    B2 -->|fetch| C4
    B3 -->|update| C5
    B4 -->|verify| C6

    C3 -->|trigger| D4
    C4 -->|check polling| D3
    D4 -->|register| D1
    D4 -->|anchor data| D1
    D4 -->|poll| D3
    D4 -->|submit deceased| D2
    D4 -->|poll| D3
    
    D2 -->|check consensus| D5
    D5 -->|verify OTP| C6
    D5 -->|unlock claim| D2
    
    C2 -->|persist| E1
    C4 -->|cache receipts| E2
    C2 -->|store CID| E3
    D1 -->|chain state| E4
    D2 -->|chain state| E4

    D5 -->|send proof| F1
    D3 -->|emit events| F2
    
    style Phase_4 fill:#90EE90
    style API_Layer fill:#87CEEB
```

## Phase 4 Contract Flow in Detail

```mermaid
sequenceDiagram
    participant Rescuer as Rescue Team
    participant API as API Backend
    participant Poller as Polling Engine
    participant Starknet as Starknet Chain
    participant Ronin as Ronin Chain
    participant Family as Family Portal

    Rescuer->>API: register volunteer + sign
    API->>Starknet: registerVolunteer(publicKey, worldLevel)
    Starknet-->>API: txHash
    
    Rescuer->>API: submit bundle (missing persons data)
    API->>API: create anchor job
    API->>Starknet: anchorBundle(hash, signer)
    Starknet-->>API: receipt
    
    Note over API,Poller: Polling Phase (exponential backoff)
    API->>Poller: start poll(receipt)
    loop Every 1-30s
        Poller->>Starknet: check confirmation
        alt Not confirmed yet
            Note over Poller: wait 1.5x longer
        else Confirmed (3+ blocks)
            Starknet-->>Poller: confirmed!
            break
        end
    end
    
    Rescuer->>API: confirm person is Deceased
    API->>Ronin: submitDeceased(personId, actorId)
    Ronin-->>API: receipt (1st confirmation)
    
    Rescuer->>API: 2nd rescuer confirms Deceased
    API->>Ronin: submitDeceased(personId, actorId2)
    Ronin-->>API: receipt (2nd confirmation)
    
    Note over API: Consensus reached!
    API->>Ronin: unlockClaim(personId, amount)
    Ronin-->>API: fund_txHash
    API->>API: Send SMS proof to family
    
    Family->>API: request OTP
    API-->>Family: OTP sent (demo: 123456)
    Family->>API: verify OTP
    API->>Ronin: check consensus
    alt Consensus confirmed
        API-->>Family: claim_token (JWT)
        Family->>Family: use token to withdraw
    else No consensus
        API-->>Family: error_not_ready
    end
```

## Multi-Node Resilience

```mermaid
graph LR
    subgraph Nodes["Rescue Nodes (Disaster Zone)"]
        N1["Node 1<br/>Starknet Reg"]
        N2["Node 2<br/>Starknet Reg"]
        N3["Node 3<br/>Starknet Reg"]
    end

    subgraph Anchor["Starknet Anchoring"]
        S1["Bundle Hash<br/>Node1"]
        S2["Bundle Hash<br/>Node2"]  
        S3["Bundle Hash<br/>Node3"]
    end

    subgraph Compensation["Ronin Compensation"]
        R1["Confirmation 1<br/>Rescuer A"]
        R2["Confirmation 2<br/>Rescuer B"]
        R3["Consensus:<br/>Unlock Fund"]
    end

    N1 -->|anchor| S1
    N2 -->|anchor| S2
    N3 -->|anchor| S3
    
    S1 -->|confirm| R1
    S2 -->|confirm| R1
    S3 -->|confirm| R1
    
    R1 -->|from rescuer A| R3
    R2 -->|from rescuer B| R3
    R3 -->|2+ sigs| R1
    R3 -->|unlock| R3
    
    style R3 fill:#90EE90
```

## Data Flow: Volunteer → Anchor → Compensation → Family Claim

```mermaid
flowchart TD
    V["Volunteer Registration"]
    VDB["DB: volunteer"]
    VSTARK["Starknet: registerVolunteer"]
    VREDIS["Redis: volunteer token"]
    
    B["Bundle Submission"]
    BDB["DB: sync_bundle"]
    BIPFS["IPFS: upload + get CID"]
    BJOB["Queue: anchor_job"]
    
    A["Anchoring Phase"]
    ASTARK["Starknet: anchorBundle"]
    APOLLER["Poller: wait 3 blocks"]
    ARECEIPT["DB: anchor_receipt"]
    
    P["Person Status Update"]
    PDB["DB: update person"]
    PRONIN["Ronin: submitDeceased"]
    PCONF["Redis: confirmations"]
    
    C["Consensus Check"]
    CCONSENSUS["Ronin: 2+ confirmations?"]
    CUNLOCK["Ronin: unlockClaim"]
    EMAIL["Send SMS proof"]
    
    F["Family Claim"]
    FOTP["OTP verification"]
    FSET["Set family_claim token"]
    FPAY["Family with draws via portal"]
    
    V --> VDB
    V --> VSTARK
    VSTARK --> VREDIS
    
    B --> BDB
    B --> BIPFS --> BJOB
    
    BJOB --> A
    A --> ASTARK
    ASTARK --> APOLLER
    APOLLER --> ARECEIPT
    
    ARECEIPT --> P
    P --> PDB
    P --> PRONIN
    PRONIN --> PCONF
    
    PCONF --> C
    C --> CCONSENSUS
    CCONSENSUS -->|yes| CUNLOCK
    CUNLOCK --> EMAIL
    
    EMAIL --> F
    F --> FOTP
    FOTP --> FSET
    FSET --> FPAY
    
    style V fill:#E1F5FF
    style B fill:#E1F5FF
    style A fill:#FFF9C4
    style P fill:#FFF9C4
    style C fill:#C8E6C9
    style F fill:#F8BBD0
```

---

These diagrams show:
1. **Overall architecture** with Phase 1-2 (data) and Phase 4 (compensation)
2. **Sequential flow** from volunteer registration → anchoring → compensation → family claim
3. **Multi-node resilience** showing distributed anchoring + consensus
4. **Data flow** through DB → IPFS → Blockchain → Family Portal

Render these with: https://mermaid.live
