// Ember Court — DOM rendering. The table is real DOM (readable cards, clickable
// hands); the felt and drifting embers live on a background canvas (bg.js).
import { CARDS, KIND_STYLE, OPPONENTS } from './config.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';

const SVG = {
  blade: '<svg viewBox="0 0 24 24"><path d="M4 20 L15 9 M15 9 L19 3 L21 5 L16 11 M15 9 L13 7 M6 18 L8 20 M13 13 L17 17" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M14 4 L20 4 L20 10 Z" fill="currentColor" opacity=".55"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 2 C13.5 5.5 18 7.5 18 13 A6 6 0 1 1 6 13 C6 10.5 7.5 9 8.5 7 C9.5 8.5 11 8 12 2 Z" fill="currentColor"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2 L20 5 V12 C20 17 16.5 20.5 12 22 C7.5 20.5 4 17 4 12 V5 Z" fill="currentColor"/><path d="M8.5 12 L11 14.5 L15.5 9.5" stroke="rgba(0,0,0,.45)" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21 C6.5 16.5 3 12.8 3 8.8 A4.6 4.6 0 0 1 12 6.2 A4.6 4.6 0 0 1 21 8.8 C21 12.8 17.5 16.5 12 21 Z" fill="currentColor"/></svg>',
  crown: '<svg viewBox="0 0 24 24"><path d="M3 18 L4 7 L9 11 L12 4 L15 11 L20 7 L21 18 Z" fill="currentColor"/></svg>',
};

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function hpBar(side) {
  const wrap = el('div', 'hpbar');
  const pct = Math.max(0, Math.round((side.hp / side.maxHp) * 100));
  const fill = el('div', 'hpfill');
  fill.style.width = `${pct}%`;
  fill.style.background = pct > 50
    ? 'linear-gradient(90deg,#16a34a,#4ade80)'
    : pct > 25 ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#b91c1c,#ef4444)';
  wrap.appendChild(fill);
  const label = el('div', 'hplabel', `${side.hp} / ${side.maxHp}`);
  wrap.appendChild(label);
  return wrap;
}

function badges(side) {
  const wrap = el('div', 'badges');
  if (side.block > 0) wrap.appendChild(el('span', 'badge block', `🛡 ${side.block} Block`));
  if (side.burnTurns > 0) wrap.appendChild(el('span', 'badge burn', `🔥 Burn ${side.burn} × ${side.burnTurns}`));
  return wrap;
}

/** One face-up card. `playable` lights it up; `onPlay` fires on click. */
export function cardElement(card, playable, onPlay) {
  const def = CARDS[card.id];
  const style = KIND_STYLE[def.kind];
  const node = el('div', `card kind-${def.kind}${playable ? ' playable' : ''}`);
  node.style.setProperty('--ca', style.a);
  node.style.setProperty('--cb', style.b);
  node.style.setProperty('--cac', style.accent);
  node.style.setProperty('--cglow', style.glow);
  const cost = el('div', 'cost', String(def.cost));
  node.appendChild(cost);
  node.appendChild(el('div', 'card-name', def.name));
  const art = el('div', 'card-art');
  art.innerHTML = SVG[def.kind];
  node.appendChild(art);
  const stats = el('div', 'card-stats');
  if (def.damage) stats.appendChild(el('span', 'stat dmg', `⚔ ${def.damage}${def.hits ? '×' + def.hits : ''}`));
  if (def.block) stats.appendChild(el('span', 'stat blk', `🛡 ${def.block}`));
  if (def.heal) stats.appendChild(el('span', 'stat heal', `♥ ${def.heal}`));
  if (def.burn) stats.appendChild(el('span', 'stat burn', `🔥 ${def.burn}/${def.burnTurns}t`));
  node.appendChild(stats);
  node.appendChild(el('div', 'card-text', def.text));
  if (onPlay) node.addEventListener('click', () => onPlay(card.uid));
  return node;
}

/** A face-down card back, as the opponent's hand shows. */
function cardBack() {
  const node = el('div', 'card back');
  node.innerHTML = '<div class="back-emblem">♛</div><div class="back-word">EMBER<br>COURT</div>';
  return node;
}

function manaRow(mana, maxMana) {
  const wrap = el('div', 'mana');
  for (let i = 0; i < maxMana; i += 1) {
    const gem = el('div', `gem${i < mana ? ' full' : ''}`);
    wrap.appendChild(gem);
  }
  wrap.appendChild(el('span', 'mana-label', `${mana}/${maxMana} mana`));
  return wrap;
}

export function render(world, ui, handlers) {
  const { header, enemyArea, centerArea, playerArea, handArea, overlay } = ui;

  header.innerHTML = '';
  header.appendChild(el('div', 'brand', '♛ EMBER COURT'));
  header.appendChild(el('div', 'duel-tag', world.screen === SCREEN_PLAY
    ? `Duel ${world.duelIndex + 1} of ${OPPONENTS.length} — ${world.enemy ? world.enemy.name : ''}`
    : world.screen === SCREEN_TITLE ? 'A duel of cunning and cinders' : 'The court has spoken'));
  const scoreBox = el('div', 'score-box');
  scoreBox.appendChild(el('span', 'score-label', 'SCORE'));
  scoreBox.appendChild(el('span', 'score-value', String(world.score)));
  header.appendChild(scoreBox);

  enemyArea.innerHTML = '';
  if (world.enemy) {
    const e = world.enemy;
    const portrait = el('div', 'portrait');
    portrait.innerHTML = SVG.crown;
    const info = el('div', 'side-info');
    info.appendChild(el('div', 'side-name', e.name));
    info.appendChild(el('div', 'side-title', e.title));
    info.appendChild(hpBar(e));
    info.appendChild(badges(e));
    enemyArea.appendChild(portrait);
    enemyArea.appendChild(info);
    const backs = el('div', 'enemy-hand');
    for (let i = 0; i < e.hand.length; i += 1) backs.appendChild(cardBack());
    backs.appendChild(el('div', 'deck-count', `Deck ${e.deck.length}`));
    enemyArea.appendChild(backs);
  }

  centerArea.innerHTML = '';
  const last = world.log[world.log.length - 1] ?? '';
  centerArea.appendChild(el('div', 'log-line', last));
  if (world.lastPlay) {
    const banner = el('div', `last-play ${world.lastPlay.by}`, world.lastPlay.text);
    centerArea.appendChild(banner);
  }
  if (world.screen === SCREEN_PLAY) {
    const endBtn = el('button', 'end-turn', 'End Turn  →');
    endBtn.addEventListener('click', handlers.endTurn);
    centerArea.appendChild(endBtn);
    centerArea.appendChild(el('div', 'hint', 'Click a glowing card to play it. Block fades at the start of your turn; Burn ticks at the start of the afflicted turn.'));
  }

  playerArea.innerHTML = '';
  const p = world.player;
  const pInfo = el('div', 'side-info player-info');
  pInfo.appendChild(el('div', 'side-name', 'You — the Challenger'));
  pInfo.appendChild(hpBar(p));
  pInfo.appendChild(badges(p));
  playerArea.appendChild(pInfo);
  playerArea.appendChild(manaRow(p.mana, p.maxMana));

  handArea.innerHTML = '';
  if (p.hand.length > 0) {
    const fan = el('div', 'hand');
    p.hand.forEach((card, i) => {
      const def = CARDS[card.id];
      const node = cardElement(card, world.screen === SCREEN_PLAY && p.mana >= def.cost, world.screen === SCREEN_PLAY ? handlers.playCard : null);
      const mid = (p.hand.length - 1) / 2;
      node.style.setProperty('--tilt', `${(i - mid) * 3.5}deg`);
      node.style.setProperty('--lift', `${Math.abs(i - mid) * 7}px`);
      fan.appendChild(node);
    });
    handArea.appendChild(fan);
    handArea.appendChild(el('div', 'deck-count', `Draw pile ${p.deck.length} · Discard ${p.discard.length}`));
  }

  overlay.innerHTML = '';
  if (world.screen === SCREEN_TITLE) {
    const panel = el('div', 'panel title-panel');
    panel.appendChild(el('div', 'crown-big', '♛'));
    panel.appendChild(el('h1', 'game-title', 'EMBER COURT'));
    panel.appendChild(el('div', 'tagline', 'A duel of cunning and cinders — outplay three courtiers, card by card.'));
    const rules = el('div', 'rules');
    rules.innerHTML = '<b>How to play</b><br>• Each turn you gain mana and draw up to 5 cards.<br>• Click a glowing card to play it — attacks hit the courtier, shields block, fire burns.<br>• Block fades when your next turn starts. Burn ticks at the start of a turn.<br>• Beat all three courtiers to take the court. Your health carries over — mend wisely.';
    panel.appendChild(rules);
    const start = el('button', 'big-btn', 'Take Your Seat at the Table');
    start.addEventListener('click', handlers.start);
    panel.appendChild(start);
    panel.appendChild(el('div', 'fine', 'An original game · No cards were harmed'));
    overlay.appendChild(panel);
    overlay.classList.add('show');
  } else if (world.screen === SCREEN_WIN) {
    const panel = el('div', 'panel win-panel');
    panel.appendChild(el('div', 'crown-big', '♛'));
    panel.appendChild(el('h1', 'game-title', 'THE COURT IS YOURS'));
    panel.appendChild(el('div', 'tagline', `You defeated all three courtiers. The Ember King bows — the throne is yours.`));
    panel.appendChild(statGrid(world));
    const again = el('button', 'big-btn', 'Play Again');
    again.addEventListener('click', handlers.start);
    panel.appendChild(again);
    overlay.appendChild(panel);
    overlay.classList.add('show');
  } else if (world.screen === SCREEN_LOSE) {
    const panel = el('div', 'panel lose-panel');
    panel.appendChild(el('div', 'crown-big dim', '♛'));
    panel.appendChild(el('h1', 'game-title', 'THE COURT PREVAILS'));
    panel.appendChild(el('div', 'tagline', `${world.enemy ? world.enemy.name : 'The court'} stands over your fallen cards. The embers dim — for now.`));
    panel.appendChild(statGrid(world));
    const again = el('button', 'big-btn', 'Challenge Again');
    again.addEventListener('click', handlers.start);
    panel.appendChild(again);
    overlay.appendChild(panel);
    overlay.classList.add('show');
  } else {
    overlay.classList.remove('show');
  }
}

function statGrid(world) {
  const grid = el('div', 'stats');
  const rows = [
    ['Final score', String(world.score)],
    ['Duels won', `${world.duelsWon} / ${OPPONENTS.length}`],
    ['Damage dealt', String(world.damageDealt)],
    ['Cards played', String(world.cardsPlayed)],
  ];
  for (const [k, v] of rows) {
    grid.appendChild(el('div', 'stat-k', k));
    grid.appendChild(el('div', 'stat-v', v));
  }
  return grid;
}
