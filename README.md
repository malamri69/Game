# 👑 الملك المجهول — The Unknown King

A 5-8 minute mobile multiplayer social deduction game. Not "find the
traitor" — every seat has its own secret win condition, and the King is
hidden among the players, not announced. See `docs/TECHNICAL_PLAN.md` for
the full design/architecture doc; this file is the practical "how do I run
it" one.

## Repo layout

```
/docs             Technical plan (stack, architecture, DB, APIs, AI, balance findings)
/server           Node.js + TypeScript authoritative game server
  /src/game       State machine, roles, events, actions, voting, resolution, AI
  /src/matchmaking  Quick Match / private rooms / bot backfill / rematch
  /src/realtime   Socket.io gateway + per-viewer state redaction
  /src/simulation Bots-vs-bots balance simulator (section 63)
  /prisma         DB schema (designed, not yet wired in — see file header)
  /tests          84 tests: unit + a real Socket.io integration test
/client           Flutter mobile client (see client/README.md)
/demo             Zero-server browser demo: the real engine, playable solo against bots
```

## Play it right now (no server, no install)

```bash
cd server
npm install
npm run build:browser-demo
```

Open the resulting `demo/play.html` directly in a browser. This is the
*actual* game engine — the same `MatchManager`, roles, events, resolution
engine, and AI the server runs — compiled to run standalone in a browser
tab (`server/scripts/build-browser-demo.mjs`, entry point
`server/src/browser-entry.ts`). You take one seat, bots fill the other
seven, and every mechanic (voting, secret actions, betrayal, win
conditions) is the real thing, not a mock. No account, no network call
after the page loads, nothing saved between visits.

## Quick start — server

```bash
cd server
npm install
npm test              # 84 tests, ~1-2s (plus one ~10s real-socket integration test)
npm run dev            # starts the game server on :3000
npm run simulate -- 10000 8   # balance simulator: N matches, N players/match
```

`npm run dev` gives you a real, playable-over-the-wire game server: connect
a Socket.io client, `matchmaking:quick`, and you'll be in a match with bots
filling the rest of the table within `botBackfillWaitMs`
(`server/src/config/game.config.json`). See
`server/src/realtime/socket-gateway.ts` for the full event protocol, or
`server/tests/integration/socket-gateway.test.ts` for a working example
client flow.

## Quick start — client

See `client/README.md`. Verified with a real Flutter 3.47.2 toolchain
(`flutter analyze` clean, `flutter test` passing, `flutter build web`
compiles) — not yet run on an actual device/emulator or against a live
server, for lack of an Android SDK or usable browser display in the
environment this was checked from.

## What's actually implemented (Definition of Done, section 75)

Playable end-to-end **against a real server, over a real socket, with
bots**: connect → Quick Match → get a secret role + secret info → the
match runs through 3-4 rounds of events/discussion/voting/secret actions
→ betrayal, alliances, bribery, theft all have real mechanical effects →
win conditions are evaluated per-role at the end → REMATCH carries the
human roster into a fresh match. All of that is exercised by
`server/tests/match-manager.test.ts` (fast, simulated clock) and
`server/tests/integration/socket-gateway.test.ts` (real HTTP + real
Socket.io + real client). `demo/play.html` (see above) is the same claim
made playable by hand, click by click, with no server involved.

**Not implemented** (tracked gaps, not silently skipped):
- No persistent accounts/auth/leaderboards/analytics — `server/prisma/schema.prisma`
  is the designed schema; the running server is in-memory per match.
- No voice chat, cosmetics store, seasons, or the extended role roster
  (sections 6-7 explicitly scope those out of MVP).
- The Flutter client is an unbuilt skeleton (see above).
- Balance is a known work-in-progress: the section-63 simulator caught
  and fixed two real bugs (an AI scoring bug that suppressed every role
  ability, and an unconditionally-successful Merchant trade); a residual
  imbalance between King/Citizen/Commander and Traitor/Guardian is
  documented in `docs/TECHNICAL_PLAN.md` section 9b as an open item.

## Deployment

```bash
docker compose up --build
```

Brings up the game server (`server/Dockerfile`, multi-stage build) and a
Postgres instance for when the Prisma layer gets wired in. Copy
`server/.env.example` to `server/.env` first if you need to override
`PORT` or `DATABASE_URL`.

## Testing philosophy

Every phase in `docs/TECHNICAL_PLAN.md` section 10 landed with passing
tests before the next phase started (section 72). `server/tests/` covers:
role assignment + win conditions, event catalog integrity, action
validation, the resolution engine's priority system (including that
hidden actors actually stay hidden), voting/tie-breaking, the AI
knowledge model (bots never learn more than a human in the same seat
would), full match lifecycles (including a disconnected human being
covered by AI until they reconnect), lobby/matchmaking/rematch, and one
full-stack Socket.io integration test.
