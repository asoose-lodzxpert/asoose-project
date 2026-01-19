# System Architecture Diagrams

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Apps"
        CA[Customer App]
        DA[Driver App]
        VA[Vendor App]
    end

    subgraph "API Layer"
        API[NestJS API Server]
    end

    subgraph "Event Bus"
        EB[Event Emitter]
    end

    subgraph "Redis Cluster"
        DS[Driver State]
        HI[Hex Index]
        QL[Queue Lists]
        LK[Locks]
    end

    subgraph "Queue Workers"
        RM[Ride Matching Worker x10]
        DM[Delivery Matching Worker x10]
        IA[Inactivity Monitor x1]
        TO[Timeout Handler x5]
    end

    subgraph "Event Consumers"
        NS[Notification Service]
        AS[Analytics Service]
        LS[Logging Service]
    end

    subgraph "Database"
        PG[(PostgreSQL)]
    end

    CA --> API
    DA --> API
    VA --> API

    API --> EB
    API --> PG

    EB --> QL
    EB --> NS
    EB --> AS
    EB --> LS

    QL --> RM
    QL --> DM
    QL --> IA
    QL --> TO

    RM --> DS
    RM --> HI
    RM --> LK
    RM --> EB

    DM --> DS
    DM --> HI
    DM --> LK
    DM --> EB

    NS --> CA
    NS --> DA
```

## Matching Algorithm Flow

```mermaid
sequenceDiagram
    participant C as Customer App
    participant A as API
    participant E as Event Bus
    participant Q as Queue
    participant W as Matching Worker
    participant R as Redis
    participant D as Driver App
    participant N as Notification Service

    C->>A: Request Ride
    A->>A: Create Ride (DB)
    A->>E: Emit ride.requested
    E->>Q: Enqueue matching job
    A->>C: Return ride ID

    Q->>W: Process matching job
    W->>W: Get pickup hex
    W->>W: Expand rings (0→5)

    loop For each hex in ring
        W->>R: Get drivers in hex
        W->>W: Sort by distance
        W->>R: Atomic lock closest driver
        alt Lock successful
            R-->>W: Driver locked
            W->>E: Emit assignment.requested
            E->>N: Send push notification
            N->>D: "New ride request!"
            W->>Q: Schedule timeout (90s)
        else Lock failed
            R-->>W: Try next driver
        end
    end

    D->>A: Accept assignment
    A->>R: Atomic accept
    R->>R: Set driver ACTIVE
    R->>R: Clear pending
    A->>E: Emit ride.accepted
    E->>N: Notify customer
    N->>C: "Driver John accepted!"
```

## Redis State Machine

```mermaid
stateDiagram-v2
    [*] --> OFFLINE

    OFFLINE --> ONLINE: Set Online + Add to Hex

    ONLINE --> ONLINE: Location Update (same hex)
    ONLINE --> ONLINE: Location Update (move hex)
    ONLINE --> PENDING: Assignment Request
    ONLINE --> OFFLINE: Go Offline

    PENDING --> ACTIVE: Accept Assignment
    PENDING --> ONLINE: Decline / Timeout
    PENDING --> OFFLINE: Manual Offline (force)

    ACTIVE --> ONLINE: Complete Trip
    ACTIVE --> ONLINE: Cancel Trip

    ONLINE --> OFFLINE: Inactivity Timeout
    OFFLINE --> [*]
```

## Hex Ring Expansion

```mermaid
graph TD
    subgraph "Ring 0 - Center"
        C[Pickup Hex<br/>1 hex]
    end

    subgraph "Ring 1"
        C --> R1A[Hex 1]
        C --> R1B[Hex 2]
        C --> R1C[Hex 3]
        C --> R1D[Hex 4]
        C --> R1E[Hex 5]
        C --> R1F[Hex 6]
    end

    subgraph "Ring 2"
        R1A --> R2A[12 more hexes...]
    end

    subgraph "Ring 3"
        R2A --> R3A[18 more hexes...]
    end

    subgraph "Ring 4"
        R3A --> R4A[24 more hexes...]
    end

    subgraph "Ring 5"
        R4A --> R5A[30 more hexes...]
    end

    style C fill:#ff6b6b
    style R1A fill:#4ecdc4
    style R2A fill:#95e1d3
    style R3A fill:#f9ca24
    style R4A fill:#f0932b
    style R5A fill:#eb4d4b
```

## Event-Driven Architecture

```mermaid
graph LR
    subgraph "Event Producers"
        API[API Handlers]
        W[Workers]
        DRV[Driver Updates]
    end

    subgraph "Event Bus"
        EB[Event Emitter 2]
    end

    subgraph "Event Consumers"
        NC[Notification Consumer]
        AC[Analytics Consumer]
        LC[Logging Consumer]
        WC[Webhook Consumer]
        DB[Database Consumer]
    end

    API --> EB
    W --> EB
    DRV --> EB

    EB --> NC
    EB --> AC
    EB --> LC
    EB --> WC
    EB --> DB

    NC --> Push[Push Notifications]
    NC --> SMS[SMS]
    AC --> Metrics[Metrics Store]
    LC --> Logs[Log Aggregator]
    WC --> EXT[External Systems]
    DB --> PG[(PostgreSQL)]
```

## Atomic Lock Flow (Lua Script)

```mermaid
sequenceDiagram
    participant W as Worker
    participant L as Lua Script
    participant R as Redis

    W->>L: atomicLockDriver(driverId, rideId, hexId)

    L->>R: GET driver:status
    alt Status != ONLINE
        R-->>L: OFFLINE/ACTIVE
        L-->>W: Return 0 (failed)
    end

    L->>R: EXISTS driver:pendingRide
    alt Has pending
        R-->>L: EXISTS
        L-->>W: Return 0 (failed)
    end

    L->>R: EXISTS driver:currentRide
    alt Has active trip
        R-->>L: EXISTS
        L-->>W: Return 0 (failed)
    end

    Note over L: All checks passed!

    L->>R: SETEX driver:pendingRide rideId 90
    L->>R: SETEX lock:ride:rideId:driver 1 90
    L->>R: SREM hex:hexId:drivers driverId
    L->>R: DECR hex:hexId:count

    L-->>W: Return 1 (success)
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[NGINX / ALB]
    end

    subgraph "API Servers (Auto-scaled)"
        API1[API Server 1]
        API2[API Server 2]
        API3[API Server 3]
    end

    subgraph "Worker Servers (Auto-scaled)"
        W1[Worker Node 1<br/>- Ride Matching x5<br/>- Delivery Matching x5]
        W2[Worker Node 2<br/>- Ride Matching x5<br/>- Delivery Matching x5]
        W3[Worker Node 3<br/>- Inactivity Monitor<br/>- Timeout Handler x5]
    end

    subgraph "Redis Cluster (HA)"
        RM[Redis Master]
        RS1[Redis Replica 1]
        RS2[Redis Replica 2]
        SEN[Sentinel]
    end

    subgraph "Database (HA)"
        PGM[(PostgreSQL Primary)]
        PGS1[(PostgreSQL Standby)]
    end

    LB --> API1
    LB --> API2
    LB --> API3

    API1 --> RM
    API2 --> RM
    API3 --> RM

    W1 --> RM
    W2 --> RM
    W3 --> RM

    RM --> RS1
    RM --> RS2
    SEN --> RM
    SEN --> RS1
    SEN --> RS2

    API1 --> PGM
    API2 --> PGM
    API3 --> PGM

    PGM --> PGS1
```

## Monitoring Dashboard

```mermaid
graph TB
    subgraph "Metrics Collection"
        P[Prometheus]
    end

    subgraph "Application Metrics"
        AM[API Metrics]
        WM[Worker Metrics]
        RM[Redis Metrics]
        QM[Queue Metrics]
    end

    subgraph "Visualization"
        G[Grafana Dashboards]
    end

    subgraph "Alerting"
        AM1[PagerDuty]
        AM2[Slack]
    end

    AM --> P
    WM --> P
    RM --> P
    QM --> P

    P --> G
    P --> AM1
    P --> AM2

    G --> D1[Driver Status Dashboard]
    G --> D2[Queue Health Dashboard]
    G --> D3[Matching Performance]
    G --> D4[System Health]
```
