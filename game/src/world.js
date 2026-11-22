// Ember Court — pure game logic, no DOM. A `World` owns the whole gauntlet:
// three duels in a row against the courtiers, with a hand, mana, block and burn.
// Every mutating method appends to `log` so the table can narrate what happened.
import { CARDS, GAME, OPPONENTS, PLAYER_DECK } from './config.js';
import { makeRng, shuffle } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

let nextUid = 1;

function buildDeck(counts) {
  const deck = [];
  for (const [id, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i += 1) deck.push({ uid: nextUid += 1, id });
  }
  return deck;
}

function makeSide(hp, deckCounts) {
  return {
    hp, maxHp: hp, block: 0, burn: 0, burnTurns: 0,
    deck: [], discard: [], hand: [], mana: 0, maxMana: 0,
    _deckCounts: deckCounts,
  };
}

/** A fresh side draw pile, shuffled with the world's rng. */
function freshDrawPile(side, rng) {
  return shuffle(buildDeck(side._deckCounts), rng);
}

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.rng = makeRng(this.seed);
    this.screen = SCREEN_TITLE;
    this.duelIndex = 0;          // which courtier we face (0..2)
    this.score = 0;
    this.damageDealt = 0;
    this.cardsPlayed = 0;
    this.turn = 0;               // turns inside the current duel
    this.duelsWon = 0;
    this.log = [];
    this.lastPlay = null;        // {by, cardId, text} for the floating banner
    this.player = makeSide(GAME.playerMaxHp, PLAYER_DECK);
    this.enemy = null;
    this.winner = null;          // 'player' | 'enemy' once a duel ends
    this.gameOver = false;
    this.victory = false;
  }

  /** Start a fresh gauntlet from the title screen. */
  startGame() {
    this.duelIndex = 0; this.score = 0; this.damageDealt = 0;
    this.cardsPlayed = 0; this.duelsWon = 0; this.gameOver = false; this.victory = false;
    this.player = makeSide(GAME.playerMaxHp, PLAYER_DECK);
    this.log = [];
    this.startDuel();
  }

  /** Open the duel against OPPONENTS[duelIndex]. */
  startDuel() {
    const opp = OPPONENTS[this.duelIndex];
    this.enemy = makeSide(opp.hp, opp.deck);
    this.enemy.name = opp.name; this.enemy.title = opp.title; this.enemy.blurb = opp.blurb;
    this.player.deck = freshDrawPile(this.player, this.rng);
    this.enemy.deck = freshDrawPile(this.enemy, this.rng);
    this.player.discard = []; this.enemy.discard = [];
    this.player.hand = []; this.enemy.hand = [];
    this.player.block = 0; this.enemy.block = 0;
    this.player.burn = 0; this.player.burnTurns = 0;
    this.enemy.burn = 0; this.enemy.burnTurns = 0;
    this.turn = 1;
    this.winner = null;
    this.screen = SCREEN_PLAY;
    this.log.push(`Duel ${this.duelIndex + 1} of 3 — ${opp.name}, ${opp.title}.`);
    this.beginPlayerTurn();
  }

  drawCards(side, n) {
    for (let i = 0; i < n; i += 1) {
      if (side.deck.length === 0) {
        if (side.discard.length === 0) break;
        side.deck = shuffle(side.discard, this.rng);
        side.discard = [];
      }
      side.hand.push(side.deck.pop());
    }
  }

  /** Burn ticks, block fades, mana refills, hand tops up. */
  beginPlayerTurn() {
    const p = this.player;
    p.block = 0;
    if (p.burnTurns > 0) {
      p.hp = Math.max(0, p.hp - p.burn);
      this.log.push(`Burn sears you for ${p.burn}.`);
      p.burnTurns -= 1;
      if (p.burnTurns === 0) p.burn = 0;
      if (p.hp <= 0) { this.endDuel('enemy'); return; }
    }
    p.maxMana = Math.min(GAME.maxMana, GAME.startMana + this.turn - 1);
    p.mana = p.maxMana;
    while (p.hand.length < GAME.handSize) this.drawCards(p, 1);
    if (p.hand.length === 0) this.drawCards(p, GAME.handSize);
  }

  beginEnemyTurn() {
    const e = this.enemy;
    e.block = 0;
    if (e.burnTurns > 0) {
      e.hp = Math.max(0, e.hp - e.burn);
      this.log.push(`${e.name} burns for ${e.burn}.`);
      e.burnTurns -= 1;
      if (e.burnTurns === 0) e.burn = 0;
      if (e.hp <= 0) { this.endDuel('player'); return; }
    }
    e.maxMana = Math.min(GAME.maxMana, GAME.startMana + this.turn - 1);
    e.mana = e.maxMana;
    while (e.hand.length < GAME.handSize) this.drawCards(e, 1);
    if (e.hand.length === 0) this.drawCards(e, GAME.handSize);
  }

  /** Damage that respects block; returns the hp actually lost. */
  dealDamage(target, amount, sourceName) {
    let left = amount;
    if (target.block > 0) {
      const absorbed = Math.min(target.block, left);
      target.block -= absorbed; left -= absorbed;
      if (absorbed > 0) this.log.push(`${sourceName}'s blow is blocked (${absorbed}).`);
    }
    if (left > 0) {
      target.hp = Math.max(0, target.hp - left);
      if (target === this.enemy) this.damageDealt += left;
    }
    return left;
  }

  applyCard(card, byPlayer) {
    const def = CARDS[card.id];
    const actor = byPlayer ? this.player : this.enemy;
    const target = byPlayer ? this.enemy : this.player;
    const who = byPlayer ? 'You' : this.enemy.name;
    actor.mana -= def.cost;
    actor.hand = actor.hand.filter((c) => c.uid !== card.uid);
    actor.discard.push(card);
    this.cardsPlayed += 1;
    let text = `${who} played ${def.name}.`;
    if (def.damage) {
      const hits = def.hits ?? 1;
      let total = 0;
      for (let h = 0; h < hits; h += 1) total += this.dealDamage(target, def.damage, who);
      if (total > 0) text += ` ${total} damage.`;
    }
    if (def.burn) {
      target.burn = def.burn; target.burnTurns = def.burnTurns;
      text += ` ${target === this.enemy ? this.enemy.name : 'You'} burn${target === this.enemy ? 's' : ''} for ${def.burn}.`;
    }
    if (def.block) { actor.block += def.block; text += ` +${def.block} Block.`; }
    if (def.heal) {
      const healed = Math.min(actor.maxHp - actor.hp, def.heal);
      actor.hp += healed; text += ` Restored ${healed}.`;
    }
    this.log.push(text);
    this.lastPlay = { by: byPlayer ? 'player' : 'enemy', cardId: card.id, text };
    if (target.hp <= 0) this.endDuel(byPlayer ? 'player' : 'enemy');
  }

  /** Play a card from the player's hand by uid. Returns false when illegal. */
  playCard(uid) {
    if (this.screen !== SCREEN_PLAY || this.winner) return false;
    const card = this.player.hand.find((c) => c.uid === uid);
    if (!card) return false;
    const def = CARDS[card.id];
    if (this.player.mana < def.cost) {
      this.log.push(`Not enough mana for ${def.name} (${def.cost} needed).`);
      return false;
    }
    this.applyCard(card, true);
    return true;
  }

  /** Value of a card to the side playing it, used by the AI and the autopilot. */
  static cardValue(def, actor, target) {
    let v = 0;
    if (def.damage) v += def.damage * (def.hits ?? 1) * (target.hp <= (def.damage * (def.hits ?? 1)) ? 2.5 : 1);
    if (def.burn) v += def.burn * def.burnTurns * 1.2;
    if (def.block) v += def.block * (actor.hp < actor.maxHp * 0.45 ? 1.1 : 0.55);
    if (def.heal) v += Math.min(def.heal, actor.maxHp - actor.hp) * (actor.hp < actor.maxHp * 0.4 ? 1.6 : 0.7);
    return v / Math.max(1, def.cost);
  }

  /** The AI's turn: greedy best-value card while mana allows, then hand back. */
  aiTurn() {
    if (this.screen !== SCREEN_PLAY || this.winner) return;
    this.beginEnemyTurn();
    if (this.winner) return;
    const e = this.enemy;
    let guard = 0;
    while (guard < 12) {
      guard += 1;
      const affordable = e.hand.filter((c) => CARDS[c.id].cost <= e.mana);
      if (affordable.length === 0) break;
      let best = null; let bestV = -1;
      for (const c of affordable) {
        const v = World.cardValue(CARDS[c.id], e, this.player);
        if (v > bestV) { bestV = v; best = c; }
      }
      if (!best || bestV <= 0.7) break;
      this.applyCard(best, false);
      if (this.winner) return;
    }
    this.log.push(`${e.name} ends the turn.`);
    this.turn += 1;
    this.beginPlayerTurn();
  }

  /** End the player's turn and hand over to the AI. */
  endTurn() {
    if (this.screen !== SCREEN_PLAY || this.winner) return;
    this.log.push('You end your turn.');
    this.aiTurn();
  }

  endDuel(winner) {
    this.winner = winner;
    if (winner === 'player') {
      this.duelsWon += 1;
      const bonus = GAME.winScorePerDuel + this.player.hp * 2;
      this.score += bonus;
      this.log.push(`${this.enemy.name} is defeated! +${bonus} score.`);
      if (this.duelIndex >= OPPONENTS.length - 1) {
        this.victory = true; this.gameOver = true; this.screen = SCREEN_WIN;
        this.score += this.player.hp * 3;
        this.log.push(`The Ember Court is yours. Final score ${this.score}.`);
      } else {
        this.duelIndex += 1;
        const healed = Math.min(GAME.playerMaxHp - this.player.hp, GAME.betweenDuelHeal);
        this.player.hp += healed;
        this.log.push(`You catch your breath (+${healed} health) and face the next courtier.`);
        this.startDuel();
      }
    } else {
      this.gameOver = true; this.screen = SCREEN_LOSE;
      this.log.push(`You fall to ${this.enemy.name}. Final score ${this.score}.`);
    }
  }
}
