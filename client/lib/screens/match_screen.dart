import 'dart:async';
import 'package:flutter/material.dart';
import '../l10n/app_strings.dart';
import '../models/match_state.dart';
import '../services/socket_service.dart';
import '../widgets/player_card.dart';
import 'result_screen.dart';

class MatchScreen extends StatefulWidget {
  const MatchScreen({super.key});

  @override
  State<MatchScreen> createState() => _MatchScreenState();
}

class _MatchScreenState extends State<MatchScreen> {
  MatchStateForViewer? _state;
  final List<Map<String, dynamic>> _chat = [];
  final _chatController = TextEditingController();
  late final StreamSubscription _stateSub;
  late final StreamSubscription _chatSub;

  @override
  void initState() {
    super.initState();
    _stateSub = SocketService.instance.matchState.listen(_onState);
    _chatSub = SocketService.instance.chatMessages.listen((msg) {
      if (mounted) setState(() => _chat.add(msg));
    });
  }

  void _onState(MatchStateForViewer state) {
    if (!mounted) return;
    setState(() => _state = state);
    if ((state.state == 'REVEAL' || state.state == 'REWARDS') && state.result != null) {
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => ResultScreen(state: state)));
    }
  }

  @override
  void dispose() {
    _stateSub.cancel();
    _chatSub.cancel();
    _chatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = _state;
    if (state == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final locale = Localizations.localeOf(context);
    final s = AppStrings(locale);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            _TopBar(state: state, s: s),
            const Divider(height: 1),
            Expanded(child: _MiddleContent(state: state, s: s, locale: locale)),
            _BottomPanel(
              state: state,
              s: s,
              locale: locale,
              chat: _chat,
              chatController: _chatController,
              onSendChat: () {
                final text = _chatController.text.trim();
                if (text.isEmpty) return;
                SocketService.instance.sendChat(text);
                _chatController.clear();
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  final MatchStateForViewer state;
  final AppStrings s;
  const _TopBar({required this.state, required this.s});

  @override
  Widget build(BuildContext context) {
    final seconds = state.remainingMs != null ? (state.remainingMs! / 1000).ceil() : null;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(s.round(state.round, state.totalRounds), style: const TextStyle(color: Colors.grey)),
          Text(s.phaseLabel(state.state), style: const TextStyle(fontWeight: FontWeight.bold)),
          if (seconds != null)
            Text('⏱ ${seconds}s', style: TextStyle(color: seconds <= 5 ? Colors.redAccent : Colors.white)),
        ],
      ),
    );
  }
}

class _MiddleContent extends StatelessWidget {
  final MatchStateForViewer state;
  final AppStrings s;
  final Locale locale;
  const _MiddleContent({required this.state, required this.s, required this.locale});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (state.state == 'ROLE_REVEAL' && state.ownRole != null) _RoleReveal(state: state, s: s, locale: locale),
          if (state.currentEvent != null && state.state != 'ROLE_REVEAL')
            _EventCard(event: state.currentEvent!, locale: locale),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: state.players.map((p) => PlayerCard(player: p, s: s)).toList(),
          ),
        ],
      ),
    );
  }
}

class _RoleReveal extends StatelessWidget {
  final MatchStateForViewer state;
  final AppStrings s;
  final Locale locale;
  const _RoleReveal({required this.state, required this.s, required this.locale});

  @override
  Widget build(BuildContext context) {
    final role = state.ownRole!;
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Text(s.kingdomAwakens, style: const TextStyle(fontSize: 16, color: Colors.grey)),
            const SizedBox(height: 12),
            Text('${s.yourRolePrefix}${role.name.of(locale)}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(role.objective.of(locale), textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(role.abilityDescription.of(locale), textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
            if (state.ownSecretInfo != null) ...[
              const SizedBox(height: 16),
              Text(s.secretIntel, style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(state.ownSecretInfo!.of(locale), textAlign: TextAlign.center),
            ],
          ],
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final PublicEvent event;
  final Locale locale;
  const _EventCard({required this.event, required this.locale});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(event.name.of(locale), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text(event.description.of(locale)),
          ],
        ),
      ),
    );
  }
}

class _BottomPanel extends StatefulWidget {
  final MatchStateForViewer state;
  final AppStrings s;
  final Locale locale;
  final List<Map<String, dynamic>> chat;
  final TextEditingController chatController;
  final VoidCallback onSendChat;

  const _BottomPanel({
    required this.state,
    required this.s,
    required this.locale,
    required this.chat,
    required this.chatController,
    required this.onSendChat,
  });

  @override
  State<_BottomPanel> createState() => _BottomPanelState();
}

class _BottomPanelState extends State<_BottomPanel> {
  String? _selectedActionId;

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    if (state.state == 'VOTING' || state.state == 'FINAL_DECISION') {
      return _buildVoting(state);
    }
    if (state.state == 'SECRET_ACTIONS') {
      return _buildActions(state);
    }
    if (state.state == 'DISCUSSION') {
      return _buildChat();
    }
    return const SizedBox(height: 16);
  }

  Widget _buildVoting(MatchStateForViewer state) {
    final choices = state.currentEvent?.choices ?? [];
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        alignment: WrapAlignment.center,
        children: choices
            .map((c) => FilledButton(
                  onPressed: () => SocketService.instance.submitVote(c.id),
                  child: Text(c.label.of(widget.locale)),
                ))
            .toList(),
      ),
    );
  }

  Widget _buildActions(MatchStateForViewer state) {
    final s = widget.s;
    final roleActionId = state.ownRole != null ? _abilityActionIdFor(state.ownRole!.roleId) : null;
    final roleActionLabel = roleActionId != null ? s.roleAbilityLabels[roleActionId] : null;
    final availableActions = <MapEntry<String, String>>[
      if (roleActionId != null && roleActionLabel != null) MapEntry(roleActionId, roleActionLabel),
      ...s.openActionLabels.entries,
    ];

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: availableActions
                .map((a) => ChoiceChip(
                      label: Text(a.value),
                      selected: _selectedActionId == a.key,
                      onSelected: (_) => setState(() => _selectedActionId = a.key),
                    ))
                .toList(),
          ),
          if (_selectedActionId != null) ...[
            const SizedBox(height: 8),
            Text(s.pickATarget, style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 4),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              alignment: WrapAlignment.center,
              children: state.players
                  .where((p) => p.alive)
                  .map((p) => ActionChip(
                        label: Text(p.displayName),
                        onPressed: () {
                          SocketService.instance.submitAction(_selectedActionId!, targetSeatId: p.seatId);
                          setState(() => _selectedActionId = null);
                        },
                      ))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }

  /// Client-side mirror of each role's abilityActionId (server/src/game/
  /// roles/catalog.ts) — just enough to know which button to show; the
  /// server is still the sole authority on what's actually legal.
  String? _abilityActionIdFor(String roleId) {
    const map = {
      'king': 'royal_order',
      'traitor': 'attack',
      'investigator': 'investigate',
      'guardian': 'protect',
      'merchant': 'trade',
      'spy': 'spy',
      'commander': 'sabotage',
    };
    return map[roleId];
  }

  Widget _buildChat() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.chat.isNotEmpty)
            SizedBox(
              height: 100,
              child: ListView.builder(
                reverse: true,
                itemCount: widget.chat.length,
                itemBuilder: (context, i) {
                  final msg = widget.chat[widget.chat.length - 1 - i];
                  return Text('${msg['seatId']}: ${msg['text']}', style: const TextStyle(fontSize: 13));
                },
              ),
            ),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: widget.chatController,
                  decoration: InputDecoration(hintText: widget.s.typeAMessage, border: const OutlineInputBorder()),
                  onSubmitted: (_) => widget.onSendChat(),
                ),
              ),
              IconButton(icon: const Icon(Icons.send), onPressed: widget.onSendChat),
            ],
          ),
        ],
      ),
    );
  }
}
