import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import '../models/match_state.dart';

/// Thin wrapper around the same Socket.io protocol
/// server/src/realtime/socket-gateway.ts speaks. This is the ONLY place in
/// the app that talks to the network — screens just call methods here and
/// listen to streams, they never touch socket_io_client directly. Keeping
/// that boundary is what makes it possible to swap transports later
/// without touching a single screen.
class SocketService {
  SocketService._();
  static final SocketService instance = SocketService._();

  socket_io.Socket? _socket;

  final _stateController = StreamController<MatchStateForViewer>.broadcast();
  final _chatController = StreamController<Map<String, dynamic>>.broadcast();
  final _errorController = StreamController<String>.broadcast();
  final _lobbyController = StreamController<String>.broadcast();

  Stream<MatchStateForViewer> get matchState => _stateController.stream;
  Stream<Map<String, dynamic>> get chatMessages => _chatController.stream;
  Stream<String> get errors => _errorController.stream;
  Stream<String> get lobbyJoined => _lobbyController.stream;

  String? userId;
  String? lastLobbyCode;

  Future<String> connect(String serverUrl, String displayName) {
    final completer = Completer<String>();
    _socket = socket_io.io(
      serverUrl,
      socket_io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'displayName': displayName, if (userId != null) 'userId': userId})
          .build(),
    );

    _socket!.onConnect((_) {});
    _socket!.on('identity', (data) {
      userId = data['userId'] as String;
      if (!completer.isCompleted) completer.complete(userId);
    });
    _socket!.on('match:state', (data) {
      _stateController.add(MatchStateForViewer.fromJson(Map<String, dynamic>.from(data as Map)));
    });
    _socket!.on('match:chat', (data) {
      _chatController.add(Map<String, dynamic>.from(data as Map));
    });
    _socket!.on('match:error', (data) {
      _errorController.add((data as Map)['reason']?.toString() ?? 'unknown_error');
    });
    _socket!.on('lobby:joined', (data) {
      final code = (data as Map)['code'] as String?;
      lastLobbyCode = code;
      if (code != null) _lobbyController.add(code);
    });

    _socket!.connect();
    return completer.future;
  }

  void quickMatch() => _socket?.emit('matchmaking:quick');

  void createPrivateRoom() => _socket?.emit('matchmaking:private:create');

  void joinByCode(String code) => _socket?.emit('matchmaking:private:join', {'code': code});

  void reconnectToMatch(String code) => _socket?.emit('match:reconnect', {'code': code});

  void submitVote(String choiceId) => _socket?.emit('match:vote', {'choiceId': choiceId});

  void submitAction(String actionId, {String? targetSeatId, int? goldOffer}) => _socket?.emit('match:action', {
        'actionId': actionId,
        if (targetSeatId != null) 'targetSeatId': targetSeatId,
        if (goldOffer != null) 'goldOffer': goldOffer,
      });

  void sendChat(String text) => _socket?.emit('match:chat', {'text': text});

  void requestRematch() => _socket?.emit('match:rematch');

  void dispose() {
    _socket?.dispose();
    _stateController.close();
    _chatController.close();
    _errorController.close();
    _lobbyController.close();
  }
}
