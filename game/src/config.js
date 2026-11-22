// Ember Court — configuration: card definitions, opponents, tuning.
// All numbers are the game's own balance; nothing here is copied from another game.
export const GAME = {
  title: 'Ember Court',
  playerMaxHp: 30,
  handSize: 5,
  startMana: 3,
  maxMana: 10,
  betweenDuelHeal: 10,
  winScorePerDuel: 150,
};

// One card definition. kind drives art + rules; value is the headline number.
export const CARDS = {
  strike:  { id: 'strike',  name: 'Ember Slash', kind: 'blade', cost: 2, damage: 6,  text: 'Deal 6 damage.' },
  heavy:   { id: 'heavy',   name: 'Royal Cleave', kind: 'blade', cost: 4, damage: 10,  text: 'Deal 10 damage.' },
  flurry:  { id: 'flurry',  name: 'Triple Flourish', kind: 'blade', cost: 3, damage: 2, hits: 3, text: 'Deal 2 damage, three times.' },
  ember:   { id: 'ember',   name: 'Cinder Hex',  kind: 'flame', cost: 2, damage: 3, burn: 2, burnTurns: 2, text: 'Deal 3 damage. Burn 2 for 2 turns.' },
  guard:   { id: 'guard',   name: 'Court Guard', kind: 'shield', cost: 1, block: 6,  text: 'Gain 6 Block.' },
  bulwark: { id: 'bulwark', name: 'Iron Bulwark', kind: 'shield', cost: 3, block: 12, text: 'Gain 12 Block.' },
  mend:    { id: 'mend',    name: 'Phoenix Mend', kind: 'heart', cost: 2, heal: 8,   text: 'Restore 8 health.' },
  drain:   { id: 'drain',   name: 'Soul Tithe',  kind: 'flame', cost: 3, damage: 4, heal: 5, text: 'Deal 4 damage. Restore 5 health.' },
};

// A full 24-card deck, as counts per card id.
export const PLAYER_DECK = {
  strike: 6, heavy: 3, flurry: 2, ember: 4, guard: 4, bulwark: 2, mend: 2, drain: 1,
};

// The three courtiers of the gauntlet. Each has its own deck flavour and temper.
export const OPPONENTS = [
  {
    id: 'ash', name: 'Squire Ash', title: 'The Kindling Squire', hp: 24,
    deck: { strike: 6, heavy: 1, flurry: 1, ember: 3, guard: 4, bulwark: 2, mend: 3, drain: 1 },
    blurb: 'Young, eager, and far too fond of his shield.',
  },
  {
    id: 'cinder', name: 'Lady Cinder', title: 'Duchess of the Hearth', hp: 30,
    deck: { strike: 6, heavy: 3, flurry: 2, ember: 5, guard: 4, bulwark: 2, mend: 1, drain: 1 },
    blurb: 'She burns first and apologises never.',
  },
  {
    id: 'king', name: 'The Ember King', title: 'Sovereign of the Court', hp: 38,
    deck: { strike: 5, heavy: 5, flurry: 3, ember: 5, guard: 3, bulwark: 1, mend: 1, drain: 1 },
    blurb: 'Three hundred years undefeated. Until tonight.',
  },
];

// Kind -> palette used by the card art (two-stop gradient + accent).
export const KIND_STYLE = {
  blade:  { a: '#7f1d1d', b: '#dc2626', accent: '#fca5a5', glow: 'rgba(239,68,68,.55)' },
  flame:  { a: '#7c2d12', b: '#ea580c', accent: '#fdba74', glow: 'rgba(249,115,22,.55)' },
  shield: { a: '#1e3a5f', b: '#2563eb', accent: '#93c5fd', glow: 'rgba(59,130,246,.55)' },
  heart:  { a: '#4c0519', b: '#db2777', accent: '#f9a8d4', glow: 'rgba(219,39,119,.55)' },
};
