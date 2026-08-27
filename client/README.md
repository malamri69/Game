# Unknown King — Flutter client (skeleton)

Screens: Login → Home → Lobby → Match (role reveal / event / voting /
secret actions / chat, all driven by one `MatchStateForViewer` stream) →
Result (end reveal + Rematch). Talks to the game server over the same
Socket.io protocol implemented in `server/src/realtime/socket-gateway.ts` —
`lib/models/match_state.dart` mirrors `server/src/realtime/public-view.ts`
field-for-field, and `lib/services/socket_service.dart` is the only file
that touches the network.

## Language

This client is English-only by product decision (there was a brief
Arabic/English toggle in an earlier pass; it was removed). All fixed UI
copy lives in `lib/l10n/app_strings.dart` — a plain `const` class, no
locale branching. The server still sends every role/event/action string
bilingual (`LocalizedText {ar, en}`, see `server/src/game/roles/types.ts`,
part of the core game engine's data model), but the client's
`LocalizedText` model (`lib/models/match_state.dart`) only parses and
renders `.en`. Re-adding a language switch later means restoring that
`.ar` field's use and a picker on `LoginScreen` — it's a small, contained
change, not a rearchitecture, since the server side never dropped Arabic.

## Status

Verified with a real Flutter 3.47.2 stable toolchain: `flutter analyze`
reports no issues, `flutter test` passes (`test/widget_test.dart` — the
app boots to the login screen, and the empty-name validation message
shows up), and `flutter build web` compiles cleanly end to end. The
`android/`, `ios/`, and `web/` platform scaffolding was generated via
`flutter create --platforms=web,android,ios .` against the existing
`lib/` and `pubspec.yaml` (which it left untouched); the default
placeholder branding it adds (`web/index.html`, `web/manifest.json`,
the Android app label) was updated to match the game. Not yet exercised:
an actual on-device/emulator run, or a live run against the game server
(no Android SDK, Chrome, or GTK dev libs were available to do either
in the environment this was checked from).

## Running it for real

```bash
flutter pub get
flutter analyze
flutter test
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
