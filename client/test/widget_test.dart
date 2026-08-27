import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:unknown_king/main.dart';

void main() {
  testWidgets('app boots to the login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const UnknownKingApp());

    expect(find.text('The Unknown King'), findsOneWidget);
    expect(find.text('Enter'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
  });

  testWidgets('login screen shows a validation error for an empty name', (WidgetTester tester) async {
    await tester.pumpWidget(const UnknownKingApp());

    await tester.tap(find.text('Enter'));
    await tester.pump();

    expect(find.text('Enter your name first'), findsOneWidget);
  });
}
