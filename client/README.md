# Unknown King — Flutter client (skeleton)

Screens: Login → Home → Lobby → Match (role reveal / event / voting /
secret actions / chat, all driven by one `MatchStateForViewer` stream) →
Result (end reveal + Rematch). Talks to the game server over the same
Socket.io protocol implemented in `server/src/realtime/socket-gateway.ts` —
`lib/models/match_state.dart` mirrors `server/src/realtime/public-view.ts`
field-for-field, and `lib/services/socket_service.dart` is the only file
that touches the network.

## Status

This was written without a Flutter/Dart toolchain available in the build
environment — there is no `flutter`/`dart` binary in this sandbox, so
**none of this has been run, built, or analyzed**. The Dart source is
believed syntactically correct (checked by hand + a bracket-balance pass),
but treat it as an unverified skeleton, not a tested app, until someone
runs the steps below on a real machine.

## Running it for real

```bash
flutter pub get
flutter analyze
flutter run --dart-define=SERVER_URL=http://<your-game-server-host>:3000
```

Point `SERVER_URL` at a running instance of `server/` (`npm run dev` there
first, per the root README).

## What's intentionally not here yet

Per the MVP scope in `docs/TECHNICAL_PLAN.md` (sections 54-55): no
leaderboard/profile screens (stubbed as "coming soon" — there's no
DB-backed user/stats service yet), no voice chat, no cosmetics/store, no
animations beyond what Material gives for free. Auth is a client-supplied
display name, matching the server's current minimal-auth stand-in.
