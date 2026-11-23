// Ember Duel — the deck: shuffling, drawing and discarding.
// One file, one job: everything about a pile of cards, and nothing about the rules.

/** A small deterministic random source, so a seed always shuffles the same way. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh shuffled deck from a list of card ids, each card a distinct instance. */
export function buildDeck(cardIds, rng) {
  const cards = cardIds.map((id, i) => ({ id, instance: `${id}-${i}` }));
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Draw `n` cards from a pile into a hand, reshuffling the discard when the deck runs out. Stops at `max` cards in hand. */
export function drawCards(pile, hand, n, rng, max = Infinity) {
  const drawn = [];
  for (let i = 0; i < n; i += 1) {
    if (hand.length >= max) break;
    if (pile.deck.length === 0) {
      if (pile.discard.length === 0) break;
      pile.deck = pile.discard;
      pile.discard = [];
      for (let k = pile.deck.length - 1; k > 0; k -= 1) {
        const j = Math.floor(rng() * (k + 1));
        [pile.deck[k], pile.deck[j]] = [pile.deck[j], pile.deck[k]];
      }
    }
    const card = pile.deck.pop();
    hand.push(card);
    drawn.push(card);
  }
  return drawn;
}
