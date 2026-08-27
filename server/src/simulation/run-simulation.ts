import { findImbalancedRoles, simulateMatches } from "./simulator.js";

const matchCount = Number(process.argv[2] ?? 10_000);
const playerCount = Number(process.argv[3] ?? 8);

const summary = simulateMatches(matchCount, playerCount);

console.log(`\nSimulated ${summary.matches} matches at ${summary.playerCount} players each`);
console.log(`Average rounds per match: ${summary.averageRounds.toFixed(2)}\n`);
console.log("Win rate by role:");
for (const [roleId, rate] of Object.entries(summary.winRateByRole).sort()) {
  console.log(`  ${roleId.padEnd(14)} ${(rate * 100).toFixed(1)}%  (n=${summary.appearancesByRole[roleId]})`);
}

const imbalanced = findImbalancedRoles(summary);
if (imbalanced.length > 0) {
  console.log(`\n⚠️  Imbalanced roles (outside 15%-65% win rate): ${imbalanced.join(", ")}`);
} else {
  console.log("\n✅ No role outside the 15%-65% win-rate band.");
}
