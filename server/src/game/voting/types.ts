export interface VoteSubmission {
  seatId: string;
  choiceId: string;
  submittedAt: number;
}

export interface VoteTally {
  winningChoiceId: string;
  counts: Record<string, number>;
  /** true when the winner was picked by the CSPRNG because of a tie (or no votes at all). */
  tieBrokenByRng: boolean;
}
