// Ember Duel — the numbers and the card catalogue.
// One file, one job: every constant and every card the game can play lives here,
// so the rules are readable in one place and the other files never hard-code them.

/** The table the game is drawn on (the screenshots are taken at this size). */
export const TABLE = { width: 1280, height: 800 };
/** Life both fighters start at. */
export const START_LIFE = 30;
/** Energy a fighter gains at the start of their turn. */
export const ENERGY_PER_TURN = 3;
/** The most energy a fighter can hold. */
export const ENERGY_MAX = 10;
/** Cards drawn at the start, and the most a hand can hold. */
export const START_HAND = 4;
export const HAND_MAX = 7;

/**
 * One card. `colour` is the card's band and `icon` its shape, so a card is told
 * apart by colour and shape, never by its text alone. `effect` is what the card
 * does when played: damage to the other fighter, block for its owner, cards drawn,
 * life healed, and (for Ember Chain) extra damage when a red card was already
 * played this turn.
 */
export const CARDS = {
  'ember-strike': {
    id: 'ember-strike', name: 'Ember Strike', colour: '#d92b1f', icon: '🔥',
    cost: 1, red: true, text: 'Deal 3 damage.',
    effect: { damage: 3 },
  },
  blaze: {
    id: 'blaze', name: 'Blaze', colour: '#f0562a', icon: '💥',
    cost: 2, red: true, text: 'Deal 6 damage.',
    effect: { damage: 6 },
  },
  'ash-shield': {
    id: 'ash-shield', name: 'Ash Shield', colour: '#2b6fd9', icon: '🛡',
    cost: 1, red: false, text: 'Gain 5 block.',
    effect: { block: 5 },
  },
  kindle: {
    id: 'kindle', name: 'Kindle', colour: '#f59e0b', icon: '✨',
    cost: 0, red: false, text: 'Draw 1 card.',
    effect: { draw: 1 },
  },
  wildfire: {
    id: 'wildfire', name: 'Wildfire', colour: '#a31621', icon: '🌋',
    cost: 3, red: true, text: 'Deal 9 damage.',
    effect: { damage: 9 },
  },
  'ember-chain': {
    id: 'ember-chain', name: 'Ember Chain', colour: '#7c3aed', icon: '⛓',
    cost: 2, red: false, text: 'Deal 2 damage. +4 if a red card was played this turn.',
    effect: { damage: 2, comboDamage: 4 },
  },
  rekindle: {
    id: 'rekindle', name: 'Rekindle', colour: '#16a34a', icon: '🌿',
    cost: 2, red: false, text: 'Heal 5 life.',
    effect: { heal: 5 },
  },
  frostbite: {
    id: 'frostbite', name: 'Frostbite', colour: '#38bdf8', icon: '❄',
    cost: 1, red: false, text: 'Deal 3 damage.',
    effect: { damage: 3 },
  },
  'ice-wall': {
    id: 'ice-wall', name: 'Ice Wall', colour: '#7dd3fc', icon: '🧊',
    cost: 1, red: false, text: 'Gain 4 block.',
    effect: { block: 4 },
  },
  chill: {
    id: 'chill', name: 'Chill', colour: '#a5d8ff', icon: '🌨',
    cost: 1, red: false, text: 'Deal 2 damage. Draw 1 card.',
    effect: { damage: 2, draw: 1 },
  },
  'deep-freeze': {
    id: 'deep-freeze', name: 'Deep Freeze', colour: '#60a5fa', icon: '💠',
    cost: 2, red: false, text: 'Deal 5 damage.',
    effect: { damage: 5 },
  },
};

/** The player's 20-card deck: four strikes, three of most, two of the big ones. */
export const PLAYER_DECK = [
  'ember-strike', 'ember-strike', 'ember-strike', 'ember-strike',
  'blaze', 'blaze', 'blaze',
  'ash-shield', 'ash-shield', 'ash-shield',
  'kindle', 'kindle', 'kindle',
  'wildfire', 'wildfire',
  'ember-chain', 'ember-chain', 'ember-chain',
  'rekindle', 'rekindle',
];

/** The opponent's 16-card deck. */
export const ENEMY_DECK = [
  'frostbite', 'frostbite', 'frostbite', 'frostbite', 'frostbite',
  'ice-wall', 'ice-wall', 'ice-wall', 'ice-wall',
  'chill', 'chill', 'chill', 'chill',
  'deep-freeze', 'deep-freeze', 'deep-freeze',
];
