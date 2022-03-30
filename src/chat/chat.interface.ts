const chatType = {
  common: 1,
  question: 2,
} as const;

const stateType = {
  disconnect: 'disconnect',
  connect: 'connect',
  correct: 'correct',
  incorrect: 'incorrect',
  question: 'question',
  away: 'away',
} as const;

type chatType = typeof chatType[keyof typeof chatType];
type stateType = typeof stateType[keyof typeof stateType];

export { chatType, stateType };
