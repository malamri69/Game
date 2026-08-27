/// Config is data, not code (mirrors the server's own rule — see
/// server/src/config). Swap this for the deployed game server's URL, or
/// wire it to `--dart-define=SERVER_URL=...` at build time.
const String kServerUrl = String.fromEnvironment('SERVER_URL', defaultValue: 'http://localhost:3000');
