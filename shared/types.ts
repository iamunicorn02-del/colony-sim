// ─── Shared types between server and client ───

export type HumanAction = 'idle' | 'moving' | 'eating' | 'resting';

export type Human = {
  id: string;
  name: string;
  cityId: string;
  x: number;
  y: number;
  hunger: number;   // 0-100
  energy: number;   // 0-100
  currentAction: HumanAction;
};

export type HumanState = Record<string, Human>;
