// Ember Court — screenshot scenes. Each one plays the real rules forward from a
// fresh world with a simple autopilot, so every frame is what a short game really
// looks like and the same seed always stages the same frame.
import { CARDS } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE, World } from './world.js';

/** Greedy pilot: play the best-value affordable card until none is worth it. */
function playGreedy(world, reckless) {
  let guard = 0;
  while (guard < 12 && world.screen === SCREEN_PLAY && !world.winner) {
    guard += 1;
    const affordable = world.player.hand.filter((c) => CARDS[c.id].cost <= world.player.mana);
    let best = null; let bestV = -1;
    for (const c of affordable) {
      const def = CARDS[c.id];
      if (reckless && !def.damage) continue;
      const v = World.cardValue(def, world.player, world.enemy);
      if (v > bestV) { bestV = v; best = c; }
    }
    if (!best || bestV <= 0.4) break;
    world.playCard(best.uid);
  }
}

/** Play whole turns until `stop(world)` is true, the game ends, or turns run out. */
function runTurns(world, stop, maxTurns, reckless) {
  let played = 0;
  while (played < maxTurns && world.screen === SCREEN_PLAY && !world.winner && !stop(world)) {
    playGreedy(world, reckless);
    if (world.screen !== SCREEN_PLAY || world.winner) break;
    world.endTurn();
    played += 1;
  }
  return stop(world);
}

function freshGame(seed) {
  const world = new World(seed);
  world.startGame();
  return world;
}

/**
 * Stage the named scene on a fresh world and return it.
 * start: title screen over a table already mid-duel.
 * play:  a mid-duel table, turn 4 of the first duel.
 * clash: a tense late duel — second courtier, challenger hurt, both low.
 * win:   the victory screen, after a full gauntlet won by the autopilot.
 */
export function stageShot(name, seed) {
  if (name === 'start') {
    const world = freshGame(seed);
    runTurns(world, (w) => w.turn >= 3, 6, false);
    world.screen = SCREEN_TITLE;
    return world;
  }
  if (name === 'play') {
    const world = freshGame(seed);
    runTurns(world, (w) => w.turn >= 4, 8, false);
    return world;
  }
  if (name === 'clash') {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const world = freshGame(seed + attempt * 7);
      runTurns(world, (w) => w.duelsWon >= 1, 40, false);
      if (world.screen !== SCREEN_PLAY) continue;
      runTurns(world, (w) => w.player.hp <= 13 || w.enemy.hp <= 10, 10, true);
      if (world.screen === SCREEN_PLAY && (world.player.hp <= 16 || world.enemy.hp <= 12)) return world;
    }
    const world = freshGame(seed);
    runTurns(world, (w) => w.duelsWon >= 1, 40, false);
    runTurns(world, (w) => w.turn >= 6, 10, false);
    return world;
  }
  if (name === 'win') {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const world = freshGame(seed + attempt);
      runTurns(world, () => false, 200, false);
      if (world.screen === 'win') return world;
    }
    return null;
  }
  return freshGame(seed);
}

/** Headless self-test: play full gauntlets with the greedy pilot across seeds. */
export function selfTest(seedBase, games) {
  const out = { games: 0, wins: 0, losses: 0, errors: [], scores: [] };
  for (let i = 0; i < games; i += 1) {
    try {
      const world = freshGame(seedBase + i);
      runTurns(world, () => false, 300, false);
      out.games += 1;
      if (world.screen === 'win') { out.wins += 1; out.scores.push(world.score); }
      else if (world.screen === 'lose') { out.losses += 1; out.scores.push(world.score); }
      else out.errors.push(`seed ${seedBase + i}: ended on ${world.screen}`);
    } catch (err) {
      out.errors.push(`seed ${seedBase + i}: ${err.message}`);
    }
  }
  // A passive player (never plays a card) must lose: proves the loss path is live.
  try {
    const world = freshGame(seedBase + 1000);
    let n = 0;
    while (world.screen === SCREEN_PLAY && n < 60) { world.endTurn(); n += 1; }
    out.passiveLoss = world.screen === 'lose';
    if (!out.passiveLoss) out.errors.push(`passive player ended on ${world.screen}`);
  } catch (err) {
    out.errors.push(`passive: ${err.message}`);
  }
  return out;
}
