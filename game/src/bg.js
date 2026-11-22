// Ember Court — background: a dark velvet table with drifting embers.
// Drawn on a fixed canvas behind the DOM table; purely decorative.
const EMBERS = 42;

export function startBackground(canvas) {
  const ctx = canvas.getContext('2d');
  const embers = [];
  let w = 0; let h = 0;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < EMBERS; i += 1) {
    embers.push({
      x: Math.random() * 1280, y: Math.random() * 720,
      r: 1 + Math.random() * 2.6, speed: 0.12 + Math.random() * 0.45,
      drift: (Math.random() - 0.5) * 0.35, alpha: 0.25 + Math.random() * 0.55,
      hue: 18 + Math.random() * 26,
    });
  }

  function drawTable() {
    const g = ctx.createRadialGradient(w / 2, h * 0.46, 60, w / 2, h * 0.46, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#3a1c0e');
    g.addColorStop(0.55, '#241109');
    g.addColorStop(1, '#0d0503');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // faint gold ring of the table
    ctx.strokeStyle = 'rgba(212,175,105,.10)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.46, w * 0.44, h * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function frame() {
    drawTable();
    for (const e of embers) {
      e.y -= e.speed; e.x += e.drift + Math.sin((e.y + e.r * 40) / 90) * 0.12;
      if (e.y < -6) { e.y = h + 6; e.x = Math.random() * w; }
      if (e.x < -6) e.x = w + 6;
      if (e.x > w + 6) e.x = -6;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${e.hue}, 95%, 60%, ${e.alpha})`;
      ctx.shadowColor = `hsla(${e.hue}, 95%, 55%, .9)`;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    requestAnimationFrame(frame);
  }
  frame();
}
