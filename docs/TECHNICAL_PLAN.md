# الملك المجهول (The Unknown King) — Complete Technical Plan

Status: living document, updated as phases land. See `README.md` for current build status.

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Game server | Node.js 20 + TypeScript | Authoritative, single-threaded-per-match simplicity, huge realtime ecosystem, cheap to test/simulate (needed for section 63's 10k-match simulator). |
| Realtime transport | Socket.io (WebSocket, fallback to polling) | Rooms map 1:1 to matches; built-in reconnect/ack semantics fit section 33/68. |
| API (non-realtime: auth, profile, leaderboard) | Express + REST, JSON | Simple, boring, easy to secure and rate-limit. |
| Database | PostgreSQL via Prisma ORM | Relational fits the entity list in section 49 (users, matches, votes, actions...); Prisma gives us migrations + type safety. |
| Cache / ephemeral match state | In-memory per-process `GameStateStore` (Phase 2), Redis later if we shard across processes | MVP runs one game-server process; Redis is a drop-in swap behind the same interface when we need horizontal scaling. |
| AI (bots) | Rule-based / Utility AI (TypeScript) | Section 30 explicitly forbids LLM-per-decision. LLM is an optional, server-side-only upgrade for bot dialogue flavor text later. |
| Mobile client | Flutter (Dart) | Section 47: UI-heavy social game favors Flutter/RN over a full game engine; no 2D physics/animation needs that justify Unity. |
| Auth | JWT access token + refresh token, argon2 password hashing | Standard, stateless-enough for a game server that also needs socket auth. |
| Deployment target | Containerized Node service (Docker) behind a load balancer; Postgres managed instance | Keeps game-server instances stateless-enough to restart; matches pin to one instance via sticky routing on `matchId`. |

## 2. High-Level Architecture

```
Mobile Client (Flutter)
      |  REST (auth, profile, leaderboard, matchmaking ticket)
      |  WebSocket (Socket.io — everything match-related)
      v
API Gateway (Express)
      |
      +-- Auth Service (JWT issue/verify, argon2)
      +-- Matchmaking Service (queue, room codes, bot backfill)
      +-- Game Server (authoritative)
             +-- Game State Machine (per match)
             +-- Role System
             +-- Event System
             +-- Action / Resolution Engine
             +-- Voting System
             +-- Economy (Gold, Reputation)
             +-- AI Controller (bots)
             +-- Chat (moderated)
      |
      v
PostgreSQL (Users, Profiles, Matches, Players, Roles, MatchEvents,
            Actions, Votes, Rewards, Inventory, Friendships, Reports,
            Statistics, Seasons, Leaderboards)
```

Golden rule (sections 8, 17, 26, 32, 68): **the client never decides outcomes.** Every action a client sends is a *request*; the server validates, queues, resolves via priority, and broadcasts only the information each recipient is entitled to.

## 3. Game State Machine

Implemented as an explicit finite state machine (`server/src/game/state-machine`), one instance per match:

```
LOBBY -> MATCHMAKING -> ROLE_ASSIGNMENT -> ROLE_REVEAL -> ROUND_START ->
EVENT -> DISCUSSION -> VOTING -> SECRET_ACTIONS -> RESOLUTION ->
CONSEQUENCES -> NEXT_ROUND (loops to ROUND_START) -> FINAL_EVENT ->
FINAL_DECISION -> REVEAL -> REWARDS -> REMATCH
```

Every transition is server-timed (section 10, 68: no client clock trust). Each state has a `durationMs` pulled from `config/game.config.json`, not hardcoded.

## 4. Database Schema (Prisma models, summarized)

`User, Profile, Season, Match, MatchPlayer, RoleAssignment, MatchEvent, PlayerAction, Vote, Alliance, SecretDeal, Reward, InventoryItem, Friendship, Report, Statistic, Leaderboard`

Key rules:
- `RoleAssignment.roleId` and secret fields are **never** selected in any query that serves a client directly — a dedicated `PublicPlayerView` DTO strips them.
- `Match.rngSeed` stores the CSPRNG seed used for role assignment (audit trail, not reproducibility of secret info).
- `PlayerAction` and `Vote` store the resolved-visibility flag per viewer so we don't leak hidden info via logs replayed to clients.

Full Prisma schema lives in `server/prisma/schema.prisma` (added as the DB-touching phases land).

## 5. APIs (summary)

REST:
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- `GET /profile/me`, `GET /leaderboard`
- `POST /match/quick`, `POST /match/private`, `POST /match/join/:code`

WebSocket events (namespaced `match:*`), all server-authoritative:
- `match:join`, `match:state` (full state push, filtered per-viewer)
- `match:vote`, `match:action`, `match:chat`
- `match:event` (broadcast), `match:resolution` (broadcast, filtered)
- `match:disconnect`, `match:reconnect`

## 6. AI Architecture

Each bot holds a private `AIKnowledge` model (Known Facts, Suspicions, Beliefs, Goals, Relationships, Memory, Strategy, Risk Level) — populated **only** from information the server would legally reveal to that seat. Decisions run through a Utility AI scorer (`server/src/game/ai/decision-engine.ts`): each candidate action gets scored from the bot's personality weights (Politician/Aggressive/Deceiver/Coward/Opportunist/Analyst, section 28) + current knowledge, highest score wins with randomized jitter so bots aren't deterministic. LLM usage, if ever added, is confined to flavor-text dialogue generation, server-side only, never decision-making.

## 7. Folder Structure

```
/server
  /prisma
  /src
    /config
    /auth
    /matchmaking
    /game
      /state-machine
      /roles
      /events
      /actions
      /voting
      /economy
      /ai
      /resolution
    /realtime
    /chat
    /profile
    /leaderboard
    /analytics
    /security
    /simulation
  /tests
/client (Flutter app — added in Phase 9)
/docs
```

## 8. Testing Strategy

- Unit tests (Jest/vitest): role assignment, win conditions, action validation, voting tally, event resolution, economy, AI scoring, reconnect logic.
- Integration tests: full match lifecycle over an in-process Socket.io harness.
- **Match Simulator** (`server/src/simulation`): runs N bot-vs-bot matches headless, aggregates win rates per role, flags imbalance (section 63/64).

## 9. Deployment (MVP)

Single Docker Compose stack for now: `game-server`, `postgres`. `docker-compose.yml` + `.env.example` at repo root. Documented in `README.md`'s Deployment section as it lands.

## 9b. Balance Simulator Findings (section 63/64, first pass)

`npm run simulate -- 10000 8` runs 10,000 bots-only 8-player matches through
the same `MatchManager` a real match uses and reports win rate by role.
First run surfaced two real bugs, both fixed in the engine itself (not
special-cased for the simulator):

1. **Hidden-identity leak suppressed every role ability.** The AI utility
   scorer's "friendly" target formula started from a much higher baseline
   than its "hostile" one, so generic social actions (bribe/alliance)
   out-scored every role's own ability by default — even an "aggressive"
   Traitor would bribe instead of attack. Fixed by giving a bot's own role
   ability a structural bonus and putting `protect` on the same
   suspicion-seeking curve as `attack`/`investigate` (a Guardian should
   shield whoever looks threatened, the same seat a Traitor is drawn to —
   that overlap is what lets protection actually block something).
2. **Merchant's `trade` always succeeded**, making 500 gold / 3 trades
   trivial. Added a 70% success chance, same shape as `steal`.

After both fixes (10k matches, 8 players):

| Role | Win rate |
|---|---|
| King / Citizen / Commander | 91.7% (all three share the "king survives" condition) |
| Traitor | 8.3% |
| Guardian | 2.4% |
| Investigator | 34.2% |
| Spy | 35.1% |
| Merchant | 35.4% |

Merchant/Investigator/Spy landed in a healthy band. King/Citizen/Commander
and Traitor/Guardian are still linked and skewed: the Traitor doesn't know
the King's identity by design (section 6) and today's bots have no
chat-based deduction to narrow it down, so they rarely land an attack on
the actual King — which is also why Guardian rarely gets a block credit.
This is a **known, tracked balance item**, not a silent gap: a real fix
needs either a smarter deduction heuristic (e.g. weighting "who benefits
from royal orders over time" as a weak king-tell) or human playtest data,
which a bots-only simulator can't fully substitute for. Re-running
`npm run simulate` after any AI or economy change is the way to check this
number, not intuition.

## 10. Build Order (this repo follows section 71 literally)

Phase 1 Architecture (this doc) → Phase 2 Core Engine & State Machine → Phase 3 Roles → Phase 4 Events → Phase 5 Actions → Phase 6 Voting → Phase 7 AI → Phase 8 Realtime Multiplayer → Phase 9 UI (Flutter) → Phase 10 Matchmaking → Phase 11 Testing → Phase 12 Balancing → Phase 13 Polish.

Each phase landed as its own commit(s), tests passing before the next
phase started (section 72). Status: Phases 1-8, 10, 12 fully implemented
and tested (84 tests, including a real Socket.io integration test).
Phase 9 (Flutter) is a written-but-unverified skeleton — no Flutter
toolchain was available to build/run it, see `client/README.md`. Phase 11
(testing) is covered throughout rather than as a separate pass — see the
root `README.md`'s "Testing philosophy" section for what's covered.
Phase 13 (polish/README/deployment) landed as the root `README.md`,
`docker-compose.yml`, `server/Dockerfile`, and `server/.env.example`.
Not built: the DB/auth/analytics layer (schema designed in
`server/prisma/schema.prisma`, not wired into the running server), voice
chat, cosmetics, seasons, and the extended role roster — all explicitly
out of MVP scope per sections 6-7, 54-55.
