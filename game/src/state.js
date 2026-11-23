// Ember Duel — the game state: turns, playing cards, combat and winning.
// One file, one job: the rules, and nothing about drawing or input.

import {
  CARDS, ENERGY_MAX, ENERGY_PER_TURN, ENEMY_DECK, HAND_MAX, PLAYER_DECK, START_HAND, START_LIFE,
} from './config.js';
import { buildDeck, drawCards, makeRng } from './deck.js';
import { planEnemyTurn } from './ai.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

/** A fresh game, shuffled from the seed. */
export function createGame(seed = 1) {
  const rng = makeRng(seed);
  const game = {
    seed,
    rng,
    screen: SCREEN_TITLE,
    turn: 1,
    phase: 'player',
    redPlayedThisTurn: false,
    log: ['Welcome to Ember Duel.'],
    player: newFighter(PLAYER_DECK, rng, true),
    enemy: newFighter(ENEMY_DECK, rng, false),
    lastDamage: null,
    lastHeal: null,
  };
  drawCards(game.player, game.player.hand, START_HAND, rng, HAND_MAX);
  drawCards(game.enemy, game.enemy.hand, START_HAND, rng, HAND_MAX);
  return game;
}

function newFighter(deckIds, rng, isPlayer) {
  return {
    isPlayer,
    life: START_LIFE,
    maxLife: START_LIFE,
    block: 0,
    energy: ENERGY_PER_TURN,
    deck: buildDeck(deckIds, rng),
    discard: [],
    hand: [],
    played: [],
  };
}

/** Start a real game from the title screen: turn one, energy full, hand drawn. */
export function startGame(game) {
  game.screen = SCREEN_PLAY;
  game.turn = 1;
  game.phase = 'player';
  game.player.energy = ENERGY_PER_TURN;
  game.player.block = 0;
  game.redPlayedThisTurn = false;
  game.player.played = [];
  game.enemy.played = [];
  game.log = ['Turn 1 — your move. Play cards, then End Turn.'];
}

/** Damage after block: block absorbs what it can, the rest hits life. */
export function dealDamage(fighter, amount) {
  const absorbed = Math.min(fighter.block, amount);
  fighter.block -= absorbed;
  const hurt = amount - absorbed;
  fighter.life = Math.max(0, fighter.life - hurt);
  return { absorbed, hurt };
}

/** Play the card at `handIndex` from the player's hand. Returns false when it cannot be played. */
export function playCard(game, handIndex) {
  if (game.screen !== SCREEN_PLAY || game.phase !== 'player') return false;
  const hand = game.player.hand;
  if (handIndex < 0 || handIndex >= hand.length) return false;
  const card = hand[handIndex];
  const def = CARDS[card.id];
  if (def.cost > game.player.energy) return false;

  game.player.energy -= def.cost;
  hand.splice(handIndex, 1);
  game.player.played.push(card);
  game.player.discard.push(card);
  if (def.red) game.redPlayedThisTurn = true;

  const fx = def.effect;
  if (fx.damage) {
    // Ember Chain's bonus lands only when a red card was played earlier this turn.
    let damage = fx.damage;
    if (fx.comboDamage && game.redPlayedThisTurn) damage += fx.comboDamage;
    const result = dealDamage(game.enemy, damage);
    game.lastDamage = { target: 'enemy', amount: result.hurt, absorbed: result.absorbed };
    game.log.push(`${def.name} hits Frost for ${damage} (${result.absorbed} blocked).`);
  }
  if (fx.block) {
    game.player.block += fx.block;
    game.log.push(`${def.name}: +${fx.block} block.`);
  }
  if (fx.draw) {
    const drawn = drawCards(game.player, game.player.hand, fx.draw, game.rng, HAND_MAX);
    game.log.push(`${def.name}: drew ${drawn.length} card${drawn.length === 1 ? '' : 's'}.`);
  }
  if (fx.heal) {
    const healed = Math.min(fx.heal, game.player.maxLife - game.player.life);
    game.player.life += healed;
    game.lastHeal = { target: 'player', amount: healed };
    game.log.push(`${def.name}: healed ${healed} life.`);
  }
  checkEnd(game);
  return true;
}

/** End the player's turn: Frost shows its intent, plays, then a new turn begins. */
export function endTurn(game) {
  if (game.screen !== SCREEN_PLAY || game.phase !== 'player') return false;
  game.phase = 'enemy';
  game.enemy.played = [];
  const { plan, intent } = planEnemyTurn(game.enemy, game.player);
  game.intent = intent;
  game.log.push(intent);
  game.enemyPlan = plan;
  return true;
}

/** Resolve Frost's planned cards, one at a time, then start the player's next turn. */
export function resolveEnemyTurn(game) {
  if (game.screen !== SCREEN_PLAY || game.phase !== 'enemy') return;
  for (const card of game.enemyPlan || []) {
    const def = CARDS[card.id];
    if (def.cost > game.enemy.energy) continue;
    game.enemy.energy -= def.cost;
    const at = game.enemy.hand.indexOf(card);
    if (at >= 0) game.enemy.hand.splice(at, 1);
    game.enemy.played.push(card);
    game.enemy.discard.push(card);
    const fx = def.effect;
    if (fx.damage) {
      const result = dealDamage(game.player, fx.damage);
      game.lastDamage = { target: 'player', amount: result.hurt, absorbed: result.absorbed };
      game.log.push(`${def.name} hits you for ${fx.damage} (${result.absorbed} blocked).`);
    }
    if (fx.block) {
      game.enemy.block += fx.block;
      game.log.push(`Frost gains ${fx.block} block.`);
    }
    if (fx.draw) {
      drawCards(game.enemy, game.enemy.hand, fx.draw, game.rng, HAND_MAX);
    }
    if (checkEnd(game)) return;
  }
  startPlayerTurn(game);
}

/** A new player turn: energy refills, block fades, one card drawn. */
export function startPlayerTurn(game) {
  game.turn += 1;
  game.phase = 'player';
  game.player.energy = Math.min(ENERGY_MAX, ENERGY_PER_TURN);
  game.player.block = 0;
  game.enemy.block = 0;
  game.redPlayedThisTurn = false;
  game.player.played = [];
  game.enemy.played = [];
  game.intent = '';
  drawCards(game.player, game.player.hand, 1, game.rng, HAND_MAX);
  drawCards(game.enemy, game.enemy.hand, 1, game.rng, HAND_MAX);
  game.enemy.energy = ENERGY_PER_TURN;
  game.log.push(`Turn ${game.turn} — your move.`);
  checkEnd(game);
}

/** The win/loss check after any change of life. */
export function checkEnd(game) {
  if (game.enemy.life <= 0) {
    game.screen = SCREEN_WIN;
    game.log.push('Frost is beaten. Victory!');
    return true;
  }
  if (game.player.life <= 0) {
    game.screen = SCREEN_LOSS;
    game.log.push('Ember falls. Defeat.');
    return true;
  }
  return false;
}
