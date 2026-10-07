(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const ui = {
    score: document.getElementById("score"),
    lives: document.getElementById("lives"),
    time: document.getElementById("time"),
    start: document.getElementById("startScreen"),
    pause: document.getElementById("pauseScreen"),
    gameOver: document.getElementById("gameOverScreen"),
    win: document.getElementById("winScreen"),
    stars: document.getElementById("winStars"),
    overScore: document.getElementById("overScore"),
    overTime: document.getElementById("overTime"),
    winScore: document.getElementById("winScore"),
    winTime: document.getElementById("winTime")
  };

  const keys = Object.create(null);
  const touch = { left: false, right: false };

  const WORLD = { width: 5200, height: 900 };
  const VIEW = { width: 1280, height: 720 };

  let scaleX = 1, scaleY = 1;
  let state = "menu";
  let lastTime = 0;
  let elapsed = 0;
  let cameraX = 0;
  let score = 0;
  let lives = 3;
  let checkpointX = 160;
  let checkpointY = 580;
  let respawnTimer = 0;
  let flashTimer = 0;
  let shakeTimer = 0;
  let finishBannerTimer = 0;

  const player = {
    x: 150, y: 500, w: 38, h: 54,
    vx: 0, vy: 0,
    speed: 5.1,
    jump: 13.8,
    maxJumps: 2,
    jumpsUsed: 0,
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    invincible: 0,
    anim: 0,
    facing: 1,
    spawnX: 150,
    spawnY: 500
  };

  let platforms = [];
  let hazards = [];
  let coins = [];
  let enemies = [];
  let checkpoints = [];
  let goal = null;
  let particles = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
    scaleX = canvas.width / VIEW.width;
    scaleY = canvas.height / VIEW.height;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  window.addEventListener("resize", resize);
  resize();

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function addPlatform(x, y, w, h = 42, type = "ground") {
    platforms.push({ x, y, w, h, type });
  }

  function addCoin(x, y) {
    coins.push({ x, y, r: 12, collected: false, bob: Math.random() * Math.PI * 2 });
  }

  function addHazard(x, y, w, h, type) {
    hazards.push({ x, y, w, h, type });
  }

  function addEnemy(x, y, minX, maxX, speed, color, type = "walker") {
    enemies.push({
      x, y, w: 42, h: 42,
      minX, maxX, vx: speed,
      speed: Math.abs(speed),
      direction: speed >= 0 ? 1 : -1,
      squashed: 0,
      dead: false,
      color,
      type,
      baseY: y,
      phase: Math.random() * 10
    });
  }

  function buildLevel() {
    platforms = [];
    hazards = [];
    coins = [];
    enemies = [];
    checkpoints = [];
    particles = [];

    // Chão e plataformas principais
    addPlatform(0, 650, 720, 250);
    addPlatform(800, 650, 610, 250);
    addPlatform(1490, 650, 720, 250);
    addPlatform(2290, 650, 650, 250);
    addPlatform(3030, 650, 790, 250);
    addPlatform(3910, 650, 1290, 250);

    addPlatform(500, 530, 150, 35, "floating");
    addPlatform(930, 500, 170, 35, "floating");
    addPlatform(1190, 420, 150, 35, "floating");
    addPlatform(1610, 500, 180, 35, "floating");
    addPlatform(1880, 430, 150, 35, "floating");
    addPlatform(2390, 520, 170, 35, "floating");
    addPlatform(2670, 430, 170, 35, "floating");
    addPlatform(3220, 500, 180, 35, "floating");
    addPlatform(3500, 405, 180, 35, "floating");
    addPlatform(4150, 500, 190, 35, "floating");
    addPlatform(4500, 430, 170, 35, "floating");
    addPlatform(4780, 520, 160, 35, "floating");

    // Obstáculos: espinhos, fogo, pedras e barreiras
    addHazard(675, 620, 90, 30, "spikes");
    addHazard(1095, 620, 105, 30, "fire");
    addHazard(1390, 615, 100, 35, "spikes");
    addHazard(2170, 620, 120, 30, "fire");
    addHazard(2870, 610, 120, 40, "rock");
    addHazard(3780, 615, 130, 35, "spikes");
    addHazard(4335, 610, 100, 40, "barrier");
    addHazard(4670, 620, 110, 30, "fire");

    // Moedas distribuídas pela fase
    [
      [270, 585], [390, 585], [555, 465], [850, 585], [970, 435],
      [1260, 355], [1550, 585], [1660, 435], [1930, 365],
      [2410, 455], [2720, 365], [3090, 585], [3270, 435],
      [3545, 345], [4020, 585], [4210, 435], [4550, 365],
      [4820, 455], [4990, 585]
    ].forEach(([x, y]) => addCoin(x, y));

    // Inimigos móveis
    addEnemy(380, 608, 240, 620, 1.25, "#b94dff");
    addEnemy(860, 608, 810, 1260, 1.55, "#ff5d62");
    addEnemy(1650, 608, 1510, 2050, 1.3, "#42b6ff");
    addEnemy(2460, 608, 2310, 2860, 1.7, "#ff8b42");
    addEnemy(3160, 608, 3050, 3750, 1.45, "#b94dff");
    addEnemy(4250, 608, 3970, 4520, 1.6, "#ff5d62");

    Object.assign(enemies[1], { type: "eraser", color: "#f58ab0" });
    Object.assign(enemies[5], { type: "eraser", color: "#f58ab0" });
    Object.assign(enemies[3], { type: "ruler", color: "#f2c230", w: 76, h: 26, y: 624, baseY: 624 });

    // Checkpoints
    checkpoints = [
      { x: 1550, y: 560, reached: false },
      { x: 3060, y: 560, reached: false },
      { x: 3940, y: 560, reached: false }
    ];

    buildExtras();
    goal = { x: 5060, y: 540, w: 48, h: 110 };
  }

  function resetGame() {
    buildLevel();
    score = 0;
    lives = 3;
    elapsed = 0;
    cameraX = 0;
    checkpointX = 150;
    checkpointY = 590;
    player.x = 150;
    player.y = 590 - player.h;
    player.vx = 0;
    player.vy = 0;
    player.invincible = 0;
    player.grounded = false;
    player.jumpsUsed = 0;
    player.facing = 1;
    player.anim = 0;
    state = "playing";
    respawnTimer = 0;
    flashTimer = 0;
    shakeTimer = 0;
    finishBannerTimer = 0;
    updateHud();
    hideAllOverlays();
  }

  function hideAllOverlays() {
    [ui.start, ui.pause, ui.gameOver, ui.win, quizUi.screen].forEach(el => el.classList.add("hidden"));
  }

  const popup = document.getElementById("scorePopup");
  function showScorePopup(text) {
    popup.textContent = text;
    popup.classList.remove("show");
    void popup.offsetWidth;
    popup.classList.add("show");
  }

  // ===== Extras: som, quiz, itens, combo, recorde =====
  const AC = window.AudioContext || window.webkitAudioContext;
  let actx = null;
  function beep(f1, f2, dur, type = "square", vol = 0.05, delay = 0) {
    try {
      actx = actx || new AC();
      if (actx.state === "suspended") actx.resume();
      const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  const sfx = {
    jump: () => beep(280, 620, 0.12),
    coin: () => { beep(880, 1100, 0.07); beep(1320, 1320, 0.1, "square", 0.05, 0.07); },
    stomp: () => beep(500, 120, 0.15, "square", 0.08),
    hurt: () => beep(320, 60, 0.4, "sawtooth", 0.08),
    item: () => [523, 659, 784].forEach((f, i) => beep(f, f, 0.1, "square", 0.05, i * 0.08)),
    good: () => [659, 880, 1175].forEach((f, i) => beep(f, f, 0.12, "square", 0.05, i * 0.1)),
    bad: () => beep(200, 130, 0.3, "sawtooth", 0.06),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => beep(f, f, 0.16, "square", 0.05, i * 0.14))
  };

  const QUIZ = [
    ["2 + 2 = ?", ["3", "4", "5"], 1], ["5 × 3 = ?", ["15", "12", "18"], 0],
    ["Capital do Brasil?", ["Rio de Janeiro", "Brasília", "Salvador"], 1],
    ["Dias de uma semana?", ["5", "6", "7"], 2], ["10 − 4 = ?", ["6", "5", "7"], 0],
    ["Maior planeta do sistema solar?", ["Terra", "Júpiter", "Marte"], 1],
    ["Água ferve a quantos °C?", ["50", "100", "200"], 1], ["Plural de “pão”?", ["pães", "pãos", "pões"], 0]
  ];
  const APPLE = ["....g...", "...gg...", ".##rr##.", "#rrRrrr#", "#rrrrrr#", "#rrrrrr#", ".#rrrr#.", "..#..#.."];
  const BELL = ["....Y....", "..#YYY#..", ".#YYYYY#.", ".#YWYYY#.", ".#YYYYY#.", "#YYYYYYY#", "#########", "....#...."];
  let items = [], boards = [], combo = 0, bellTimer = 0, quizCur = null;
  const quizUi = { screen: document.getElementById("quizScreen"), q: document.getElementById("quizQ"), opts: document.getElementById("quizOpts"), msg: document.getElementById("quizMsg") };

  function buildExtras() {
    items = [
      { x: 1850, y: 585, type: "apple" }, { x: 3300, y: 585, type: "apple" },
      { x: 1950, y: 380, type: "bell" }, { x: 4585, y: 375, type: "bell" }
    ].map(i => ({ ...i, taken: false }));
    const bank = [...QUIZ].sort(() => Math.random() - 0.5);
    boards = [
      { x: 1275, y: 566 },
      { x: 2050, y: 566 },
      { x: 2440, y: 436 },
      { x: 4230, y: 416 }
    ].map(({ x, y }, i) => ({ x, y, w: 110, h: 84, q: bank[i], done: false }));
    combo = 0; bellTimer = 0;
  }

  function collectItems() {
    for (const it of items) {
      if (it.taken) continue;
      if (!rectsOverlap(player, { x: it.x - 16, y: it.y - 16, w: 32, h: 32 })) continue;
      it.taken = true; sfx.item();
      burst(it.x, it.y, it.type === "apple" ? "#e03030" : "#ffd93b", 12);
      if (it.type === "apple") {
        if (lives < 3) { lives++; showScorePopup("MAÇÃ! +1 VIDA"); } else { score += 50; showScorePopup("MAÇÃ! = 50 PONTOS"); }
      } else { bellTimer = 6; showScorePopup("SINO! INIMIGOS LENTOS"); }
    }
  }

  function checkBoards() {
    for (const b of boards) if (!b.done && rectsOverlap(player, b)) { openQuiz(b); return; }
  }

  function openQuiz(b) {
    state = "quiz";
    Object.keys(keys).forEach(k => keys[k] = false); touch.left = touch.right = false;
    const [q, opts, ok] = b.q;
    const list = opts.map((t, i) => ({ t, ok: i === ok })).sort(() => Math.random() - 0.5);
    quizCur = { b, list, answered: false };
    quizUi.q.textContent = q; quizUi.msg.textContent = ""; quizUi.opts.innerHTML = "";
    list.forEach((o, i) => {
      const bt = document.createElement("button");
      bt.className = "main-btn quiz-opt"; bt.textContent = `${i + 1}) ${o.t}`;
      bt.onclick = () => answerQuiz(o.ok);
      quizUi.opts.appendChild(bt);
    });
    quizUi.screen.classList.remove("hidden");
  }

  function answerQuiz(ok) {
    if (!quizCur || quizCur.answered) return;
    quizCur.answered = true; quizCur.b.done = true;
    if (ok) { score += 300; if (lives < 3) lives++; sfx.good(); quizUi.msg.textContent = "ACERTOU! +300 PONTOS"; }
    else { sfx.bad(); quizUi.msg.textContent = "ERROU! Mais sorte na próxima lousa."; }
    setTimeout(() => {
      quizUi.screen.classList.add("hidden");
      if (state === "quiz") { state = "playing"; lastTime = performance.now(); showScorePopup(ok ? "= 300 PONTOS" : "SEM PONTOS"); }
    }, 1000);
  }

  function getBest() { try { return +localStorage.getItem("escola_best") || 0; } catch (e) { return 0; } }
  function saveBest() { try { if (score > getBest()) localStorage.setItem("escola_best", score); } catch (e) {} refreshBest(); }
  function refreshBest() { document.querySelectorAll(".best").forEach(el => el.textContent = String(getBest()).padStart(4, "0")); }
  refreshBest();

  function drawItems() {
    for (const it of items) {
      if (it.taken) continue;
      const bob = Math.round(Math.sin(elapsed * 4 + it.x) * 3);
      if (it.type === "apple") sprite(APPLE, { "#": "#5a1a10", r: "#e03030", R: "#ff9a9a", g: "#3f9a45" }, it.x - 16, it.y - 16 + bob, 4);
      else sprite(BELL, { "#": "#5a3a00", Y: "#ffd93b", W: "#fff3a0" }, it.x - 18, it.y - 16 + bob, 4);
    }
  }

  function drawBoards() {
    for (const b of boards) {
      px(b.x + 14, b.y + b.h - 8, 6, 8, "#2a1a10"); px(b.x + b.w - 20, b.y + b.h - 8, 6, 8, "#2a1a10");
      box(b.x, b.y, b.w, b.h - 8, b.done ? "#3a5a4a" : "#1f5a3c", "#6b4a2b");
      px(b.x + 4, b.y + 4, b.w - 8, b.h - 16, b.done ? "#3a5a4a" : "#1f5a3c");
      ctx.fillStyle = "#f4f7ee"; ctx.font = "bold 22px 'Courier New', monospace"; ctx.textAlign = "center";
      ctx.fillText(b.done ? "OK" : "?+?=?", b.x + b.w / 2, b.y + b.h / 2 + 2);
    }
  }

  function updateHud() {
    ui.score.textContent = String(score).padStart(4, "0");
    ui.lives.textContent = lives > 0 ? "♥ ".repeat(lives).trim() : "—";
    ui.time.textContent = formatTime(elapsed);
  }

  function startGame() {
    resetGame();
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      ui.pause.classList.remove("hidden");
    } else if (state === "paused") {
      state = "playing";
      ui.pause.classList.add("hidden");
      lastTime = performance.now();
    }
  }

  function queueJump() {
    if (state !== "playing") return;
    player.jumpBuffer = 0.14;
  }

  function inputAxis() {
    let axis = 0;
    if (keys.ArrowLeft || keys.a || touch.left) axis -= 1;
    if (keys.ArrowRight || keys.d || touch.right) axis += 1;
    return axis;
  }

  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "w", "a", "d", "p", "P"].includes(k)) {
      e.preventDefault();
    }
    keys[k] = true;
    if (state === "quiz" && quizCur && "123".includes(k) && quizCur.list[+k - 1]) answerQuiz(quizCur.list[+k - 1].ok);

    if (k === "ArrowUp" || k === "w" || k === " ") queueJump();
    if (k === "p" || k === "P") togglePause();
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  function bindHold(id, prop) {
    const el = document.getElementById(id);
    const down = (e) => {
      e.preventDefault();
      touch[prop] = true;
    };
    const up = (e) => {
      e.preventDefault();
      touch[prop] = false;
    };
    ["pointerdown", "touchstart"].forEach(ev => el.addEventListener(ev, down, { passive: false }));
    ["pointerup", "pointercancel", "pointerleave", "touchend"].forEach(ev => el.addEventListener(ev, up, { passive: false }));
  }

  bindHold("leftBtn", "left");
  bindHold("rightBtn", "right");

  const jumpButton = document.getElementById("jumpBtn");
  jumpButton.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    queueJump();
  });

  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("resumeBtn").addEventListener("click", togglePause);
  document.getElementById("restartBtn").addEventListener("click", startGame);
  document.getElementById("playAgainBtn").addEventListener("click", startGame);

  function update(dt) {
    if (state !== "playing") return;

    elapsed += dt;
    player.invincible = Math.max(0, player.invincible - dt);
    flashTimer = Math.max(0, flashTimer - dt);
    shakeTimer = Math.max(0, shakeTimer - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

    if (respawnTimer > 0) {
      respawnTimer -= dt;
      if (respawnTimer <= 0) {
        player.x = checkpointX;
        player.y = checkpointY - player.h;
        player.vx = 0;
        player.vy = 0;
        player.invincible = 1.5;
        state = "playing";
      }
      updateParticles(dt);
      updateHud();
      return;
    }

    const axis = inputAxis();
    const acceleration = player.grounded ? 0.85 : 0.62;

    if (axis !== 0) {
      player.vx += axis * acceleration;
      player.vx = clamp(player.vx, -player.speed, player.speed);
      player.facing = axis;
      player.anim += dt * (8 + Math.abs(player.vx));
    } else {
      player.vx *= player.grounded ? 0.78 : 0.96;
      if (Math.abs(player.vx) < 0.04) player.vx = 0;
      player.anim += dt * 2;
    }

    if (player.grounded) player.coyote = 0.11;
    else player.coyote = Math.max(0, player.coyote - dt);

    if (player.jumpBuffer > 0) {
      const canJumpOnGround = player.coyote > 0 && player.jumpsUsed < player.maxJumps;
      const canDoubleJump = !player.grounded && player.jumpsUsed < player.maxJumps && player.jumpsUsed > 0;
      if (canJumpOnGround || canDoubleJump) {
        player.vy = -player.jump;
        player.grounded = false;
        player.coyote = 0;
        player.jumpBuffer = 0;
        player.jumpsUsed += 1;
        burst(player.x + player.w / 2, player.y + player.h, "#ffffff", 5);
        sfx.jump();
      }
    }

    if (!(keys.ArrowUp || keys.w || keys[" "])) {
      if (player.vy < -5) player.vy += 0.35;
    }

    player.vy += 0.65;
    player.vy = Math.min(player.vy, 18);

    bellTimer = Math.max(0, bellTimer - dt);
    movePlayer(dt);
    if (player.grounded) combo = 0;
    updateEnemies(dt);
    collectCoins();
    collectItems();
    checkBoards();
    updateCheckpoints();
    handleHazards();
    handleEnemies();
    handleGoal();
    updateParticles(dt);

    cameraX = clamp(player.x - VIEW.width * 0.38, 0, WORLD.width - VIEW.width);
    updateHud();
  }

  function movePlayer(dt) {
    player.x += player.vx * 60 * dt;
    player.x = clamp(player.x, 0, WORLD.width - player.w);

    const previousBottom = player.y + player.h;
    player.y += player.vy * 60 * dt;
    player.grounded = false;

    // Colisão vertical com plataformas
    if (player.vy >= 0) {
      let best = null;
      for (const p of platforms) {
        const horizontal = player.x + player.w > p.x && player.x < p.x + p.w;
        const crossed = previousBottom <= p.y && player.y + player.h >= p.y;
        if (horizontal && crossed && (!best || p.y < best.y)) best = p;
      }
      if (best) {
        player.y = best.y - player.h;
        player.vy = 0;
        player.grounded = true;
        player.jumpsUsed = 0;
      }
    } else {
      for (const p of platforms) {
        const horizontal = player.x + player.w > p.x && player.x < p.x + p.w;
        const crossed = player.y <= p.y + p.h && player.y + player.h >= p.y + p.h;
        if (horizontal && crossed) {
          player.y = p.y + p.h;
          player.vy = 0.2;
        }
      }
    }

    // Colisão lateral simples com plataformas
    for (const p of platforms) {
      if (player.y + player.h <= p.y + 8 || player.y >= p.y + p.h - 8) continue;
      if (!rectsOverlap(player, p)) continue;

      if (player.vx > 0) player.x = p.x - player.w;
      if (player.vx < 0) player.x = p.x + p.w;
      player.vx = 0;
    }

    // Caiu em buraco
    if (player.y > WORLD.height + 80) loseLife();
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      if (e.dead) {
        e.squashed -= dt;
        continue;
      }
      if (e.squashed > 0) {
        e.squashed -= dt;
        if (e.squashed <= 0) e.dead = true;
        continue;
      }

      e.x += e.vx * 60 * dt * (bellTimer > 0 ? 0.3 : 1);
      if (e.x <= e.minX) {
        e.x = e.minX;
        e.vx = Math.abs(e.speed);
      }
      if (e.x >= e.maxX) {
        e.x = e.maxX;
        e.vx = -Math.abs(e.speed);
      }
      e.phase += dt * 7 * (bellTimer > 0 ? 0.3 : 1);
      if (e.type === "eraser") e.y = e.baseY - Math.abs(Math.sin(e.phase * 0.5)) * 55;
    }
  }

  function collectCoins() {
    for (const c of coins) {
      if (c.collected) continue;
      const box = { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
      if (rectsOverlap(player, box)) {
        c.collected = true;
        score += 100;
        sfx.coin();
        burst(c.x, c.y, "#ffd34d", 10);
      }
    }
  }

  function updateCheckpoints() {
    for (const cp of checkpoints) {
      if (!cp.reached && player.x + player.w / 2 >= cp.x) {
        cp.reached = true;
        checkpointX = cp.x + 15;
        checkpointY = cp.y + 90;
        score += 250;
        sfx.item();
        finishBannerTimer = 1.4;
        burst(cp.x + 10, cp.y + 35, "#42d879", 18);
      }
    }
    finishBannerTimer = Math.max(0, finishBannerTimer - 1 / 60);
  }

  function handleHazards() {
    if (player.invincible > 0) return;
    for (const h of hazards) {
      const hitbox = { x: h.x + 4, y: h.y + 5, w: h.w - 8, h: h.h - 5 };
      if (rectsOverlap(player, hitbox)) {
        loseLife();
        return;
      }
    }
  }

  function handleEnemies() {
    if (player.invincible > 0) return;

    for (const e of enemies) {
      if (e.dead || e.squashed > 0) continue;
      if (!rectsOverlap(player, e)) continue;

      const playerBottom = player.y + player.h;
      const enemyTop = e.y;

      if (player.vy > 0 && playerBottom - enemyTop < 25) {
        e.squashed = 0.42;
        player.y = e.y - player.h;
        player.vy = -8.5;
        combo++;
        const pts = 200 * Math.min(2 ** (combo - 1), 4);
        score += pts;
        sfx.stomp();
        showScorePopup(`= ${pts} PONTOS` + (combo > 1 ? ` COMBO x${combo}!` : ""));
        burst(e.x + e.w / 2, e.y + e.h / 2, e.color, 12);
      } else {
        loseLife();
        return;
      }
    }
  }

  function handleGoal() {
    if (!goal) return;
    if (rectsOverlap(player, goal)) winGame();
  }

  function loseLife() {
    if (state !== "playing" || player.invincible > 0 || respawnTimer > 0) return;

    lives -= 1;
    sfx.hurt();
    flashTimer = 0.35;
    shakeTimer = 0.35;
    burst(player.x + player.w / 2, player.y + player.h / 2, "#ff5c67", 16);

    if (lives <= 0) {
      state = "gameover";
      saveBest();
      ui.overScore.textContent = String(score).padStart(4, "0");
      ui.overTime.textContent = formatTime(elapsed);
      ui.gameOver.classList.remove("hidden");
    } else {
      respawnTimer = 0.45;
    }
    updateHud();
  }

  function winGame() {
    if (state !== "playing") return;
    state = "won";
    score += Math.max(0, 1000 - Math.floor(elapsed) * 5);
    ui.winScore.textContent = String(score).padStart(4, "0");
    ui.winTime.textContent = formatTime(elapsed);
    const stars = 1 + (score >= 2500) + (score >= 4000);
    ui.stars.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    saveBest();
    sfx.win();
    ui.win.classList.remove("hidden");
    burst(goal.x + 20, goal.y + 40, "#ffd34d", 35);
  }

  function burst(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 0.35 + Math.random() * 0.55,
        max: 0.9,
        size: 3 + Math.random() * 4,
        color
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      p.vy += 0.1;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function draw() {
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);

    ctx.save();
    if (shakeTimer > 0) {
      ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5);
    }

    drawSky();
    ctx.save();
    ctx.translate(-cameraX, 0);
    drawWorld();
    ctx.restore();

    if (flashTimer > 0) {
      ctx.fillStyle = `rgba(255, 75, 90, ${flashTimer * 0.28})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }

    if (finishBannerTimer > 0) {
      ctx.fillStyle = "rgba(10, 20, 28, .78)";
      ctx.fillRect(VIEW.width / 2 - 175, 84, 350, 48);
      ctx.fillStyle = "#7af19e";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.fillText("CHECKPOINT ALCANÇADO!", VIEW.width / 2, 115);
    }

    ctx.restore();
  }

  // ===== Estilo pixel art (corredor da escola) =====
  function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function box(x, y, w, h, c, o = "#2a1a10") { px(x - 2, y - 2, w + 4, h + 4, o); px(x, y, w, h, c); }
  function sprite(rows, pal, x, y, s) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) px(x + i * s, y + j * s, s, s, pal[ch]); }));
  }
  const STAR = [
    "....#....", "...#Y#...", "####Y####", "#YYYYYYY#", ".#YYYYY#.",
    "..#YYY#..", ".#YY#YY#.", ".#Y#.#Y#.", "..#...#.."
  ];

  function drawSky() {
    const W = VIEW.width;
    px(0, 0, W, VIEW.height, "#d8b13c");
    const off = -((cameraX * 0.4) % 360);
    for (let x = off - 360; x < W + 360; x += 360) {
      px(x, 76, 40, 400, "#e8c957"); px(x + 36, 76, 4, 400, "#a98424");
      px(x + 70, 130, 200, 346, "#e9cb62");
      px(x + 92, 168, 156, 250, "#4a3020");
      px(x + 104, 150, 132, 18, "#4a3020"); px(x + 116, 138, 108, 12, "#4a3020");
      px(x + 100, 176, 140, 234, "#7cc8ee"); px(x + 112, 160, 116, 16, "#7cc8ee"); px(x + 124, 150, 92, 10, "#7cc8ee");
      px(x + 116, 200, 46, 14, "#fff"); px(x + 190, 250, 40, 12, "#fff");
      px(x + 100, 340, 140, 70, "#4fa65a"); px(x + 120, 318, 40, 30, "#4fa65a"); px(x + 180, 324, 44, 26, "#3f8f4c");
      px(x + 167, 160, 6, 250, "#4a3020"); px(x + 100, 288, 140, 6, "#4a3020");
      px(x + 86, 418, 168, 10, "#8b6a3a");
      px(x + 296, 250, 30, 30, "#2a1a10"); px(x + 299, 253, 24, 24, "#f2f2f2"); px(x + 310, 257, 2, 10, "#222"); px(x + 310, 266, 8, 2, "#222");
      px(x + 290, 380, 16, 38, "#2a1a10"); px(x + 292, 382, 12, 34, "#d63a2f"); px(x + 288, 372, 20, 8, "#444");
    }
    px(0, 440, W, 140, "#c99b3c");
    for (let r = 0; r < 5; r++) {
      px(0, 440 + r * 28, W, 3, "#8a6a22");
      const bo = -((cameraX * 0.5) % 56) + (r % 2) * 28;
      for (let x = bo - 56; x < W + 56; x += 56) px(x, 440 + r * 28, 3, 28, "#8a6a22");
    }
    px(0, 436, W, 6, "#4a3020");
    px(0, 580, W, 140, "#9a5a42");
    const fo = -((cameraX * 0.7) % 80);
    for (let x = fo - 80; x < W + 80; x += 80) {
      for (let r = 0; r < 2; r++) px(x + ((r % 2) * 40), 580 + r * 40, 40, 40, (Math.round((x - fo) / 80) + r) % 2 ? "#a96a4e" : "#7f4a38");
    }
    px(0, 0, W, 76, "#6b4a2b"); px(0, 70, W, 6, "#3b2a18");
  }

  function drawWorld() {
    drawPlatforms();
    drawHazards();
    drawBoards();
    drawItems();
    drawCoins();
    drawCheckpoints();
    drawEnemies();
    drawGoal();
    drawPlayer();
    drawParticles();
  }

  function drawPlatforms() {
    const T = 64;
    for (const p of platforms) {
      if (p.type === "floating") {
        const red = ((p.x / 10) | 0) % 2 === 0;
        box(p.x, p.y, p.w, 30, red ? "#d63a2f" : "#2f9a4a");
        px(p.x + 8, p.y + 8, p.w - 12, 14, "#f4efe0");
        px(p.x + 8, p.y + 14, p.w - 12, 2, "#cfc7ae");
        px(p.x + 2, p.y + 2, 6, 26, red ? "#a82a22" : "#217a38");
        continue;
      }
      const bottom = Math.min(p.y + p.h, VIEW.height + 80);
      const startCol = Math.max(0, Math.floor((cameraX - p.x) / T));
      const endCol = Math.min(Math.ceil(p.w / T), Math.ceil((cameraX + VIEW.width - p.x) / T));
      for (let col = startCol; col < endCol; col++) {
        const w = Math.min(T, p.w - col * T);
        for (let y = p.y, row = 0; y < bottom; y += T, row++) {
          const g = (col * 7 + row * 3 + (p.x / 10 | 0)) % 3 === 0;
          const x = p.x + col * T;
          px(x, y, w, T, "#2a1a10");
          px(x + 3, y + 3, w - 6, T - 6, g ? "#3f9a45" : "#a8643c");
          px(x + 3, y + 3, w - 6, 6, g ? "#58b95e" : "#c07c50");
        }
      }
    }
  }

  function drawHazards() {
    for (const h of hazards) {
      if (h.type === "spikes") {
        const n = Math.max(2, Math.floor(h.w / 22)), sw = h.w / n;
        for (let i = 0; i < n; i++) {
          const x = h.x + i * sw + 2, w = sw - 4;
          px(x, h.y + 14, w, h.h - 14, "#f2c230"); px(x, h.y + 14, 3, h.h - 14, "#c99a14");
          px(x + 3, h.y + 7, w - 6, 7, "#e8c9a0"); px(x + 6, h.y, w - 12, 7, "#2a1a10");
        }
      } else if (h.type === "fire") {
        px(h.x, h.y + 18, h.w, h.h - 18, "#2a2f8f"); px(h.x + 10, h.y + 8, h.w - 20, 12, "#2a2f8f");
        px(h.x + 20, h.y + 2, 24, 8, "#2a2f8f"); px(h.x + 14, h.y + 22, 16, 4, "#6a73e0");
        px(h.x + h.w - 34, h.y + 14, 10, 4, "#6a73e0");
      } else if (h.type === "rock") {
        for (let x = h.x; x < h.x + h.w; x += 40) {
          box(x + 2, h.y, 34, 10, "#a8643c"); px(x + 6, h.y + 10, 4, h.h - 10, "#2a1a10"); px(x + 28, h.y + 10, 4, h.h - 10, "#2a1a10");
        }
      } else {
        const cols = ["#d63a2f", "#2f6fd0"];
        for (let i = 0, x = h.x; x < h.x + h.w; x += 33, i++) {
          box(x, h.y, 31, h.h, cols[i % 2]);
          px(x + 5, h.y + 8, 21, 2, "rgba(0,0,0,.35)"); px(x + 5, h.y + 14, 21, 2, "rgba(0,0,0,.35)");
        }
      }
    }
  }

  function drawCoins() {
    for (const c of coins) {
      if (c.collected) continue;
      const bob = Math.round(Math.sin(elapsed * 5 + c.bob) * 4);
      const star = ((c.x / 10) | 0) % 2 === 0;
      if (star) sprite(STAR, { "#": "#5a3a00", Y: "#ffd93b" }, c.x - 18, c.y - 18 + bob, 4);
      else {
        const w = Math.abs(Math.sin(elapsed * 4 + c.bob)) > .5 ? 14 : 8;
        px(c.x - w / 2 - 2, c.y - 16 + bob, w + 4, 32, "#7a5410");
        px(c.x - w / 2, c.y - 14 + bob, w, 28, "#ffd93b"); px(c.x - w / 2, c.y - 14 + bob, 3, 28, "#fff3a0");
      }
    }
  }

  function drawCheckpoints() {
    for (const cp of checkpoints) {
      ctx.fillStyle = "#4b3424";
      ctx.fillRect(cp.x, cp.y, 8, 90);
      ctx.fillStyle = cp.reached ? "#42d879" : "#f0f4f7";
      ctx.beginPath();
      ctx.moveTo(cp.x + 8, cp.y + 6);
      ctx.lineTo(cp.x + 55, cp.y + 18);
      ctx.lineTo(cp.x + 8, cp.y + 31);
      ctx.closePath();
      ctx.fill();
      if (cp.reached) {
        ctx.fillStyle = "rgba(66,216,121,.18)";
        ctx.fillRect(cp.x - 10, cp.y - 10, 75, 110);
      }
    }
  }

  function drawEnemies() {
    for (const e of enemies) {
      if (e.dead) continue;
      ctx.save();
      if (e.squashed > 0) {
        ctx.translate(e.x + e.w / 2, e.y + e.h);
        ctx.scale(1.18, 0.35);
        ctx.translate(-e.x - e.w / 2, -e.y - e.h);
      }
      if (e.type === "eraser") {
        box(e.x, e.y + 4, e.w, 34, "#f58ab0"); px(e.x, e.y + 26, e.w, 12, "#3b6fd0");
        px(e.x + 7, e.y + 11, 9, 8, "#fff"); px(e.x + 27, e.y + 11, 9, 8, "#fff");
        px(e.x + 11, e.y + 14, 4, 5, "#111"); px(e.x + 29, e.y + 14, 4, 5, "#111");
        px(e.x + 5, e.y + 8, 12, 3, "#2a1a10"); px(e.x + 26, e.y + 8, 12, 3, "#2a1a10");
        ctx.restore(); continue;
      }
      if (e.type === "ruler") {
        box(e.x, e.y, e.w, e.h, "#f2c230");
        for (let i = 0; i < 9; i++) px(e.x + 5 + i * 8, e.y, 2, i % 2 ? 7 : 12, "#2a1a10");
        px(e.x + 22, e.y + 13, 8, 7, "#fff"); px(e.x + 44, e.y + 13, 8, 7, "#fff");
        px(e.x + 26, e.y + 15, 4, 5, "#111"); px(e.x + 48, e.y + 15, 4, 5, "#111");
        ctx.restore(); continue;
      }
      const step = Math.floor(elapsed * 8 + e.phase) % 2 ? 2 : 0;
      px(e.x + 6, e.y + 38 - step, 8, 4, "#2a1a10"); px(e.x + 28, e.y + 36 + step, 8, 4, "#2a1a10");
      box(e.x, e.y, e.w, 38, "#f2a31b");
      px(e.x + 3, e.y + 3, 4, 32, "#ffc85a");
      px(e.x + 17, e.y + 2, 10, 34, "#8d969c"); px(e.x + 20, e.y + 2, 3, 34, "#c9d0d4");
      px(e.x + 7, e.y + 10, 9, 8, "#fff"); px(e.x + 28, e.y + 10, 9, 8, "#fff");
      px(e.x + 11, e.y + 13, 4, 5, "#111"); px(e.x + 29, e.y + 13, 4, 5, "#111");
      px(e.x + 6, e.y + 7, 11, 3, "#2a1a10"); px(e.x + 27, e.y + 7, 11, 3, "#2a1a10");
      px(e.x + 12, e.y + 28, 20, 3, "#2a1a10");
      ctx.restore();
    }
  }

  function drawGoal() {
    if (!goal) return;
    ctx.fillStyle = "#4b3424";
    ctx.fillRect(goal.x + 20, goal.y, 8, 110);
    ctx.fillStyle = "#ffdf4f";
    ctx.beginPath();
    ctx.moveTo(goal.x + 28, goal.y + 7);
    ctx.lineTo(goal.x + 76, goal.y + 22);
    ctx.lineTo(goal.x + 28, goal.y + 37);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffe98a";
    ctx.beginPath();
    ctx.arc(goal.x + 24, goal.y + 8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 223, 79, .18)";
    ctx.fillRect(goal.x - 20, goal.y - 10, 110, 130);
  }

  function drawPlayer() {
    if (respawnTimer > 0) return;
    if (player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0) return;

    const running = player.grounded && Math.abs(player.vx) > .4;
    const leg = running ? Math.round(Math.sin(player.anim) * 5) : 0;
    const air = !player.grounded;

    ctx.save();
    ctx.translate(Math.round(player.x + player.w / 2), Math.round(player.y));
    ctx.scale(player.facing, 1);

    px(-16, 52, 32, 4, "rgba(0,0,0,.2)");
    const l1 = air ? -3 : leg, l2 = air ? 4 : -leg;
    box(-12, 40, 10, 10 + l1, "#b7a26a"); box(2, 40, 10, 10 + l2, "#b7a26a");
    px(-14, 49 + l1, 14, 5, "#1f1f1f"); px(0, 49 + l2, 14, 5, "#1f1f1f");
    box(-22, 24, 9, 16, "#6b4a2b");
    box(-14, 22, 28, 19, "#2f6fd0");
    px(-14, 22, 28, 3, "#5a97ee");
    box(8, 25, 10, 7, "#f2c49b");
    box(-12, 6, 24, 17, "#f2c49b");
    px(-14, -2, 28, 9, "#8a5a2b"); px(-14, 3, 7, 11, "#8a5a2b"); px(4, 0, 10, 4, "#a8703a");
    px(5, 13, 4, 5, "#1b2330"); px(7, 19, 5, 2, "#a8574a");

    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    update(dt);
    draw();

    if (state === "playing" || state === "paused" || state === "gameover" || state === "won" || state === "quiz") {
      requestAnimationFrame(loop);
    }
  }

  // Tela inicial já renderiza o cenário parado.
  buildLevel();
  updateHud();
  draw();
})();
