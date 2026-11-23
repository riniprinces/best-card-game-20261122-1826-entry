// Ember Duel — the opponent's brain and its intent.
// One file, one job: Frost's choices, and the line that tells the player what
// Frost is about to do, so the player can read it and counter with block.

import { CARDS, ENERGY_PER_TURN } from './config.js';

/** How much a card is worth to Frost, in the current position. */
function scoreCard(cardId, enemy, player) {
  const card = CARDS[cardId];
  const fx = card.effect;
  let score = 0;
  if (fx.damage) {
    // Damage past the player's block is worth most; damage into block still chips it.
    const pastBlock = Math.max(0, fx.damage - player.block);
    score += pastBlock * 2 + Math.min(fx.damage, player.block) * 0.5;
  }
  if (fx.block) score += enemy.life < 12 ? fx.block * 1.5 : fx.block * 0.8;
  if (fx.draw) score += 1.2;
  if (fx.heal) score += enemy.life < 15 ? 3 : 0.5;
  return score;
}

/**
 * The cards Frost will play this turn, in order, from what it can afford.
 * It spends its energy on its best card first, then a second one when it still
 * has energy and a good card left. Returns the plan and the intent line.
 */
export function planEnemyTurn(enemy, player) {
  const energy = ENERGY_PER_TURN;
  const affordable = enemy.hand
    .map((c) => ({ card: c, def: CARDS[c.id], value: scoreCard(c.id, enemy, player) }))
    .filter((x) => x.def.cost <= energy)
    .sort((a, b) => b.value - a.value || a.def.cost - b.def.cost);
  const plan = [];
  let left = energy;
  for (const pick of affordable) {
    if (pick.def.cost > left) continue;
    if (plan.length >= 2) break;
    plan.push(pick.card);
    left -= pick.def.cost;
  }
  return { plan, intent: intentLine(plan, player) };
}

/** The line on the table before Frost acts, in plain words. */
function intentLine(plan, player) {
  if (plan.length === 0) return 'Frost gathers its strength…';
  const parts = plan.map((c) => {
    const def = CARDS[c.id];
    const fx = def.effect;
    if (fx.damage && fx.block) return `${def.name} (${fx.damage} damage, ${fx.block} block)`;
    if (fx.damage) return `${def.name} for ${fx.damage}`;
    if (fx.block) return `${def.name} (+${fx.block} block)`;
    return def.name;
  });
  const totalDamage = plan.reduce((n, c) => n + (CARDS[c.id].effect.damage || 0), 0);
  const throughBlock = Math.max(0, totalDamage - player.block);
  const warning = throughBlock > 0 ? ` — ${throughBlock} will get through your block` : '';
  return `Frost will play ${parts.join(' and ')}${warning}`;
}
