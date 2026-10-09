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
    overTitle: document.getElementById("overTitle"),
    overMessage: document.getElementById("overMessage"),
    win: document.getElementById("winScreen"),
    stars: document.getElementById("winStars"),
    grade: document.getElementById("winGrade"),
    mission: document.getElementById("winMission"),
    finalSummary: document.getElementById("finalSummary"),
    objective: document.getElementById("objective"),
    inventory: document.getElementById("inventory"),
    levelSelect: document.getElementById("levelSelect"),
    characterSelect: document.getElementById("characterSelect"),
    progressSummary: document.getElementById("progressSummary"),
    overScore: document.getElementById("overScore"),
    overTime: document.getElementById("overTime"),
    winScore: document.getElementById("winScore"),
    winTime: document.getElementById("winTime")
  };

  const keys = Object.create(null);
  const touch = { left: false, right: false };

  const LEVELS = [
    { name: "Sala de Aula", theme: "classroom", timeLimit: 120, targetCoins: 10 },
    { name: "Corredor", theme: "corridor", timeLimit: 115, targetCoins: 12 },
    { name: "Sala do Diretor", theme: "office", timeLimit: 110, targetCoins: 12 },
    { name: "Laboratório", theme: "lab", timeLimit: 105, targetCoins: 13 },
    { name: "Biblioteca", theme: "library", timeLimit: 105, targetCoins: 14 },
    { name: "Pátio", theme: "yard", timeLimit: 100, targetCoins: 15 },
    { name: "Desafio Final", theme: "final", timeLimit: 150, targetCoins: 12 }
  ];
  const CHARACTERS = [
    { id: "atleta", name: "Atleta", speed: 5.8, jump: 13.2, lives: 3 },
    { id: "inventora", name: "Inventora", speed: 5.1, jump: 14.1, lives: 3 },
    { id: "monitor", name: "Monitor", speed: 4.8, jump: 13.2, lives: 4 }
  ];
  let levelIndex = 0;
  let selectedLevel = 0;
  let selectedCharacter = "atleta";
  let hardMode = false;
  let profile = { unlocked: 1, completed: [], stars: {}, records: {} };

  const WORLD = { width: 5200, height: 900 };
  const VIEW = { width: 1280, height: 720 };

  let scaleX = 1, scaleY = 1;
  let state = "menu";
  let loopRunning = false;
  let lastTime = 0;
  let elapsed = 0;
  let campaignTime = 0;
  let cameraX = 0;
  let score = 0;
  let levelStartScore = 0;
  let lives = 3;
  let maxLives = 3;
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
    standingOn: null,
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
  let collectibles = [];
  let interactables = [];
  let inventory = [];
  let bagCapacity = 1;
  let keysCollected = 0;
  let coinCount = 0;
  let mission = { damageTaken: false, books: 0, secrets: 0, medals: 0 };
  let effects = { energy: 0, shoes: 0, shield: 0, star: 0, clock: 0 };
  let enemies = [];
  let checkpoints = [];
  let boss = null;
  let bossArena = null;
  let mech = { t: 0, wind: 0, windTimer: 6, dark: false, books: [], bookTimer: 3 };
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
    platforms.push({ x, y, w, h, type, baseX: x, phase: Math.random() * 6, range: type === "moving" ? 100 : 0, active: false });
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
    collectibles = [];
    interactables = [];
    inventory = [];
    bagCapacity = 1;
    keysCollected = 0;
    coinCount = 0;
    mission = { damageTaken: false, books: 0, secrets: 0, medals: 0 };
    effects = { energy: 0, shoes: 0, shield: 0, star: 0, clock: 0 };
    enemies = [];
    checkpoints = [];
    boss = null;
    bossArena = null;
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
    if (levelIndex === 1) addPlatform(1390, 460, 150, 35, "moving");
    if (levelIndex === 3) addPlatform(2800, 465, 155, 35, "moving");
    if (levelIndex === 5) addPlatform(3640, 450, 170, 35, "moving");
    if (levelIndex === 4) platforms.push({ x: 2970, y: 500, w: 150, h: 35, type: "secret", revealed: false });

    const hazardSets = [
      [[675, 620, 90, 30, "spikes"], [1095, 620, 105, 30, "fire"], [1390, 615, 100, 35, "spikes"], [2170, 620, 120, 30, "fire"], [2870, 610, 120, 40, "rock"], [3780, 615, 130, 35, "spikes"], [4335, 610, 100, 40, "barrier"], [4670, 620, 110, 30, "fire"]],
      [[650, 610, 100, 40, "barrier"], [1080, 620, 110, 30, "spikes"], [1710, 610, 105, 40, "barrier"], [2160, 620, 120, 30, "fire"], [2870, 610, 120, 40, "rock"], [3650, 620, 130, 30, "spikes"], [4335, 610, 100, 40, "barrier"]],
      [[675, 610, 90, 40, "rock"], [1095, 620, 105, 30, "spikes"], [1710, 610, 110, 40, "barrier"], [2170, 620, 120, 30, "fire"], [2870, 610, 120, 40, "rock"], [3540, 610, 100, 40, "barrier"], [4335, 610, 100, 40, "barrier"]],
      [[675, 620, 90, 30, "fire"], [1095, 610, 105, 40, "rock"], [1710, 620, 100, 30, "spikes"], [2170, 610, 120, 40, "fire"], [2870, 610, 120, 40, "rock"], [3780, 620, 130, 30, "fire"], [4335, 610, 100, 40, "barrier"]],
      [[675, 620, 90, 30, "spikes"], [1095, 610, 105, 40, "rock"], [1710, 620, 110, 30, "spikes"], [2170, 620, 120, 30, "fire"], [2870, 610, 120, 40, "barrier"], [3780, 615, 130, 35, "spikes"], [4335, 610, 100, 40, "barrier"]],
      [[650, 610, 120, 40, "rock"], [1095, 620, 105, 30, "fire"], [1710, 610, 110, 40, "barrier"], [2170, 620, 120, 30, "spikes"], [2870, 610, 120, 40, "rock"], [3650, 610, 130, 40, "barrier"], [4335, 610, 100, 40, "rock"], [4670, 620, 110, 30, "fire"]],
      [[675, 620, 90, 30, "spikes"], [1095, 620, 105, 30, "fire"], [1710, 610, 110, 40, "barrier"], [2170, 610, 120, 40, "rock"], [2870, 620, 120, 30, "fire"], [3780, 610, 130, 40, "spikes"]]
    ];
    hazardSets[levelIndex].forEach(([x, y, w, h, type]) => addHazard(x, y, w, h, type));
    mech = { t: 0, wind: 0, windTimer: 6, dark: false, books: [], bookTimer: 3 };
    if (levelIndex === 3) [1250, 2800, 3500, 4250].forEach((x, i) => { addHazard(x, 620, 110, 30, "acid"); hazards[hazards.length - 1].offset = i * 1.0; });
    if (hardMode) addHazard(4940, 620, 75, 30, "spikes");

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

    if ([1, 3, 5].includes(levelIndex)) {
      Object.assign(enemies[0], { type: "robot", color: "#55a9b5" });
      Object.assign(enemies[4], { type: "inspector", color: "#a34a39" });
    }
    Object.assign(enemies[1], { type: "eraser", color: "#f58ab0" });
    Object.assign(enemies[5], { type: "eraser", color: "#f58ab0" });
    Object.assign(enemies[3], { type: "ruler", color: "#f2c230", w: 76, h: 26, y: 624, baseY: 624 });

    if (levelIndex === LEVELS.length - 1) {
      enemies = [];
      bossArena = { left: 4420, right: 5160, entered: false, locked: false };
      addEnemy(4650, 550, 4540, 5000, 1.1, "#a93d34", "boss");
      Object.assign(enemies[0], { w: 92, h: 100, health: 4, maxHealth: 4, attackTimer: 2, double: true, finalTeacher: true });
      boss = enemies[0];
    } else if (levelIndex === 2) {
      // Chefe: o Diretor (precisa ser derrotado para liberar a saída)
      addEnemy(4650, 550, 4440, 4860, 0.9, "#3b4a6b", "boss");
      boss = enemies[enemies.length - 1];
      Object.assign(boss, { w: 92, h: 100, health: 3, maxHealth: 3, attackTimer: 2.6, director: true });
    }

    // Checkpoints
    checkpoints = [
      { x: 1550, y: 560, reached: false },
      { x: 3060, y: 560, reached: false },
      { x: 3940, y: 560, reached: false }
    ];

    buildExtras();
    goal = { x: 5060, y: 540, w: 48, h: 110 };
  }

  function resetGame(keepRun = false) {
    const previousScore = score;
    const previousLives = lives;
    if (!keepRun) campaignTime = 0;
    buildLevel();
    const character = CHARACTERS.find(item => item.id === selectedCharacter) || CHARACTERS[0];
    player.speed = character.speed;
    player.jump = character.jump;
    maxLives = hardMode ? Math.max(1, character.lives - 1) : character.lives;
    score = keepRun ? previousScore : 0;
    levelStartScore = score;
    lives = keepRun ? Math.min(previousLives, maxLives) : maxLives;
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
    ui.overTitle.textContent = "Você ficou sem vidas";
    ui.overMessage.textContent = "As vidas da equipe acabaram.";
    updateHud();
    hideAllOverlays();
  }

  function setShellBlur(enabled) {
    const canvasEl = document.getElementById("gameCanvas");
    const hudEl = document.getElementById("hud");
    canvasEl.classList.toggle("blurred", enabled);
    hudEl.classList.toggle("blurred", enabled);
  }

  function hideAllOverlays() {
    [ui.start, ui.pause, ui.gameOver, ui.win, quizUi.screen].forEach(el => el.classList.add("hidden"));
    setShellBlur(false);
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
    const pickups = [
      [{ x: 1850, y: 585, type: "jelly" }, { x: 1950, y: 380, type: "clock" }],
      [{ x: 970, y: 435, type: "energy" }, { x: 1260, y: 355, type: "shoes" }],
      [{ x: 1660, y: 435, type: "shield" }, { x: 3545, y: 345, type: "backpack" }],
      [{ x: 1260, y: 355, type: "star" }, { x: 3270, y: 435, type: "energy" }],
      [{ x: 1930, y: 365, type: "shoes" }, { x: 3545, y: 345, type: "jelly" }],
      [{ x: 1950, y: 380, type: "clock" }, { x: 4210, y: 435, type: "shield" }],
      [{ x: 2720, y: 365, type: "star" }, { x: 4585, y: 375, type: "backpack" }]
    ];
    items = pickups[levelIndex].map(item => ({ ...item, taken: false }));

    const bookX = [555, 1260, 1930, 2720, 3270, 3545, 4820][levelIndex];
    collectibles = [
      { x: bookX, y: bookX === 555 ? 465 : 365, type: "book", collected: false },
      { x: 4020, y: 585, type: "medal", collected: false },
      { x: 3090, y: 585, type: "key", collected: false },
      { x: 3010, y: 465, type: "secret", collected: false, hidden: levelIndex === 4 }
    ];

    const doorX = [930, 1640, 1880, 2390, 3140, 4020, 4335][levelIndex];
    const door = { x: doorX, y: 520, w: 30, h: 130, type: "door", open: false };
    const lever = { x: doorX - 85, y: 602, w: 26, h: 42, type: "lever", active: false, door };
    const button = { x: doorX + 110, y: 610, w: 32, h: 32, type: "button", active: false };
    const crate = { x: doorX + 175, y: 612, w: 38, h: 38, type: "crate" };
    platforms.push(door, crate);
    interactables = [lever, button, door, crate, { x: 3010, y: 455, w: 28, h: 38, type: "secret", active: false }];

    const subj = (window.LEVEL_SUBJECTS || [])[levelIndex];
    const B = window.QUIZ_BANK;
    let pool = QUIZ, subjName = "GERAL";
    if (B) {
      if (subj === "mix" || !B[subj]) { pool = Object.values(B).flatMap(m => m.q); subjName = "MISTO"; }
      else { pool = B[subj].q; subjName = B[subj].nome; }
    }
    const bank = [...pool].sort(() => Math.random() - 0.5);
    boards = [
      { x: 1275, y: 566 },
      { x: 2050, y: 566 },
      { x: 2440, y: 436 },
      { x: 4230, y: 416 }
    ].map(({ x, y }, i) => ({ x, y, w: 110, h: 84, q: bank[i], subject: subjName, done: false }));
    combo = 0; bellTimer = 0;
  }

  function collectItems() {
    for (const it of items) {
      if (it.taken) continue;
      if (!rectsOverlap(player, { x: it.x - 16, y: it.y - 16, w: 32, h: 32 })) continue;
      if (it.type === "backpack") {
        it.taken = true;
        bagCapacity = 2;
        showScorePopup("MOCHILA! 2 ESPAÇOS");
      } else if (inventory.length < bagCapacity) {
        it.taken = true;
        inventory.push(it.type);
        showScorePopup(`${itemName(it.type)}! PRESSIONE Q`);
      } else {
        showScorePopup("INVENTÁRIO CHEIO! PRESSIONE Q");
      }
      if (it.taken) { sfx.item(); burst(it.x, it.y, it.type === "jelly" ? "#e03030" : "#ffd93b", 12); }
    }
  }

  function itemName(type) {
    return { jelly: "GELEIA", energy: "ENERGÉTICO", shoes: "TÊNIS", shield: "ESCUDO", star: "ESTRELA", clock: "RELÓGIO", backpack: "MOCHILA" }[type] || type.toUpperCase();
  }

  function useItem() {
    if (state !== "playing" || inventory.length === 0) return;
    const item = inventory.shift();
    if (item === "jelly") lives = Math.min(maxLives, lives + 1);
    if (item === "energy") effects.energy = 8;
    if (item === "shoes") effects.shoes = 10;
    if (item === "shield") effects.shield = 1;
    if (item === "star") effects.star = 10;
    if (item === "clock") effects.clock = 8;
    sfx.item();
    showScorePopup(item === "jelly" ? "VIDA RECUPERADA" : `${itemName(item)} ATIVADO`);
    updateHud();
  }

  function interact() {
    if (state !== "playing") return;
    const px = player.x + player.w / 2;
    const nearby = interactables
      .filter(item => Math.abs(px - (item.x + item.w / 2)) < 90 && Math.abs(player.y - item.y) < 130)
      .sort((a, b) => Math.abs(px - (a.x + a.w / 2)) - Math.abs(px - (b.x + b.w / 2)))[0];
    if (!nearby) return;
    if (nearby.type === "lever") {
      nearby.active = !nearby.active;
      nearby.door.open = nearby.active || keysCollected > 0;
      showScorePopup(nearby.door.open ? "PORTA ABERTA" : "PORTA FECHADA");
    } else if (nearby.type === "button") {
      nearby.active = !nearby.active;
      platforms.filter(platform => platform.type === "moving").forEach(platform => { platform.active = nearby.active; });
      showScorePopup(nearby.active ? "PLATAFORMAS ATIVADAS" : "PLATAFORMAS PARADAS");
    } else if (nearby.type === "door") {
      if (keysCollected > 0) { nearby.open = true; keysCollected -= 1; showScorePopup("PORTA DESTRANCADA"); }
      else showScorePopup("PRECISA DE UMA CHAVE");
    } else if (nearby.type === "crate") {
      nearby.x = clamp(nearby.x + player.facing * 48, 0, WORLD.width - nearby.w);
      showScorePopup("CAIXA EMPURRADA");
    } else if (nearby.type === "secret") {
      nearby.active = true;
      platforms.filter(platform => platform.type === "secret").forEach(platform => { platform.revealed = true; });
      const secret = collectibles.find(item => item.type === "secret");
      if (secret) secret.hidden = false;
      showScorePopup("PASSAGEM SECRETA REVELADA");
    }
    sfx.item();
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
    const bd = quizUi.screen.querySelector(".badge"); if (bd) bd.textContent = "LOUSA · " + (b.subject || "GERAL");
    quizUi.q.textContent = q; quizUi.msg.textContent = ""; quizUi.opts.innerHTML = "";
    list.forEach((o, i) => {
      const bt = document.createElement("button");
      bt.className = "main-btn quiz-opt"; bt.textContent = `${i + 1}) ${o.t}`;
      bt.onclick = () => answerQuiz(o.ok);
      o.bt = bt;
      quizUi.opts.appendChild(bt);
    });
    const hb = document.createElement("button");
    hb.className = "secondary-btn"; hb.textContent = "DICA (H) · -100 PONTOS";
    hb.onclick = hintQuiz; quizCur.hintBtn = hb;
    quizUi.opts.appendChild(hb);
    quizUi.screen.classList.remove("hidden");
    setShellBlur(true);
  }

  function hintQuiz() {
    if (!quizCur || quizCur.answered || quizCur.hinted) return;
    if (score < 100) { quizUi.msg.textContent = "PRECISA DE 100 PONTOS PARA A DICA"; return; }
    const wrong = quizCur.list.filter(o => !o.ok && !o.gone);
    if (wrong.length < 2) return;
    const o = wrong[0];
    o.gone = true; o.bt.disabled = true; o.bt.style.opacity = ".3"; o.bt.style.textDecoration = "line-through";
    quizCur.hinted = true; quizCur.hintBtn.disabled = true;
    score -= 100; updateHud(); sfx.item();
    quizUi.msg.textContent = "UMA RESPOSTA ERRADA FOI ELIMINADA";
  }

  function quizConsequence(ok, b) {
    if (boss && !boss.dead) {
      if (ok && boss.health > 1) {
        boss.health -= 1;
        return ` · CHEFE ENFRAQUECIDO ${boss.health}/${boss.maxHealth || 3}! (o golpe final é pulando nele)`;
      }
      if (!ok) boss.attackTimer = 0;
    }
    if (ok) {
      if (Math.random() < 0.3 && inventory.length < bagCapacity) {
        const t = ["jelly", "energy", "shoes", "shield", "star", "clock"][Math.floor(Math.random() * 6)];
        inventory.push(t); updateHud();
        return ` · GANHOU ${itemName(t)}!`;
      }
      return "";
    }
    const p = player.standingOn;
    if (p && p.w >= 140 && p.type !== "door") {
      const left = player.x + player.w / 2 > p.x + p.w / 2;
      const x = left ? p.x : p.x + p.w - 42;
      addEnemy(x, p.y - 42, p.x, p.x + p.w - 42, 1.3, "#7a5cc4");
      return " · UM INIMIGO APARECEU!";
    }
    elapsed += 5;
    return " · -5 SEGUNDOS!";
  }

  function answerQuiz(ok) {
    if (!quizCur || quizCur.answered) return;
    quizCur.answered = true; quizCur.b.done = true;
    const extra = quizConsequence(ok, quizCur.b);
    if (ok) { awardPoints(300); if (lives < maxLives) lives++; sfx.good(); quizUi.msg.textContent = "ACERTOU! +300 PONTOS" + extra; }
    else { sfx.bad(); quizUi.msg.textContent = "ERROU!" + extra; }
    setTimeout(() => {
      quizUi.screen.classList.add("hidden");
      setShellBlur(false);
      if (state === "quiz") { state = "playing"; lastTime = performance.now(); showScorePopup(ok ? "= 300 PONTOS" : "SEM PONTOS"); }
    }, 1000);
  }

  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem("escola_progress_v2"));
      if (saved && Array.isArray(saved.completed)) return { ...profile, ...saved };
    } catch (e) {}
    return profile;
  }

  function saveProfile() {
    try { localStorage.setItem("escola_progress_v2", JSON.stringify(profile)); } catch (e) {}
  }

  function renderMenu() {
    ui.levelSelect.innerHTML = "";
    LEVELS.forEach((level, index) => {
      const button = document.createElement("button");
      const locked = index >= profile.unlocked;
      button.className = `level-card${selectedLevel === index ? " selected" : ""}`;
      button.disabled = locked;
      const completed = profile.completed.includes(index);
      const record = profile.records[index];
      const phaseRecord = record ? `${String(record.bestScore).padStart(4, "0")} PTS · ${Number.isFinite(record.bestTime) ? formatTime(record.bestTime) : "--:--"}` : `${level.targetCoins} MOEDAS · ${formatTime(level.timeLimit)}`;
      button.title = record ? `Melhor pontuação ${record.bestScore}; melhor tempo ${formatTime(record.bestTime)}` : `Missão: ${level.targetCoins} moedas em até ${formatTime(level.timeLimit)}`;
      button.innerHTML = `${locked ? "🔒 " : completed ? "✓ " : ""}${index + 1}. ${level.name}<small>${"★".repeat(profile.stars[index] || 0)}${"☆".repeat(3 - (profile.stars[index] || 0))}<br>${phaseRecord}</small>`;
      button.onclick = () => { selectedLevel = index; renderMenu(); };
      ui.levelSelect.appendChild(button);
    });
    ui.characterSelect.innerHTML = "";
    CHARACTERS.forEach(character => {
      const button = document.createElement("button");
      button.className = `character-option${selectedCharacter === character.id ? " selected" : ""}`;
      button.textContent = character.name;
      button.title = `Velocidade ${character.speed.toFixed(1)} · pulo ${character.jump.toFixed(1)} · ${character.lives} vidas`;
      button.onclick = () => { selectedCharacter = character.id; renderMenu(); };
      ui.characterSelect.appendChild(button);
    });
    document.getElementById("hardMode").checked = hardMode;
    const bestCampaign = Number.isFinite(profile.bestCampaignTime) ? ` · MELHOR TEMPO ${formatTime(profile.bestCampaignTime)}` : "";
    ui.progressSummary.textContent = `FASES ${profile.completed.length}/${LEVELS.length} · MELHOR PONTUAÇÃO ${String(getBest()).padStart(4, "0")}${bestCampaign}`;
    document.getElementById("startBtn").textContent = selectedLevel === LEVELS.length - 1 ? "ENFRENTAR DESAFIO" : "INICIAR AULA";
  }

  function getBest() { try { return +localStorage.getItem("escola_best") || 0; } catch (e) { return 0; } }
  function saveBest() {
    const record = profile.records[levelIndex] || { bestScore: 0, bestTime: null };
    record.bestScore = Math.max(record.bestScore, score - levelStartScore);
    record.bestTime = Number.isFinite(record.bestTime) ? Math.min(record.bestTime, elapsed) : elapsed;
    profile.records[levelIndex] = record;
    if (score > getBest()) { try { localStorage.setItem("escola_best", score); } catch (e) {} }
    saveProfile();
    refreshBest();
  }
  function refreshBest() {
    document.querySelectorAll(".best").forEach(el => el.textContent = String(getBest()).padStart(4, "0"));
    if (ui.levelSelect) renderMenu();
  }
  profile = loadProfile();
  refreshBest();

  function drawItems() {
    for (const it of items) {
      if (it.taken) continue;
      const bob = Math.round(Math.sin(elapsed * 4 + it.x) * 3);
      const colors = { jelly: "#e64a4a", energy: "#40b9d7", shoes: "#e5cf53", shield: "#54a8e0", star: "#ffd43b", clock: "#a47bd1", backpack: "#4f9c62" };
      box(it.x - 15, it.y - 15 + bob, 30, 30, colors[it.type] || "#ffd93b");
      ctx.fillStyle = "#fff"; ctx.font = "bold 16px 'Courier New', monospace"; ctx.textAlign = "center";
      ctx.fillText(({ jelly: "+", energy: "E", shoes: "T", shield: "S", star: "★", clock: "◷", backpack: "M" })[it.type], it.x, it.y + 6 + bob);
    }
  }

  function drawCollectibles() {
    for (const item of collectibles) {
      if (item.collected || item.hidden) continue;
      const symbols = { book: "L", medal: "M", key: "K", secret: "?" };
      const colors = { book: "#4a86bd", medal: "#e2b942", key: "#d5a33d", secret: "#ce76c3" };
      box(item.x - 12, item.y - 16, 24, 30, colors[item.type]);
      ctx.fillStyle = "#fff"; ctx.font = "bold 18px 'Courier New', monospace"; ctx.textAlign = "center";
      ctx.fillText(symbols[item.type], item.x, item.y + 6);
    }
  }

  function drawInteractables() {
    for (const item of interactables) {
      if (item.type === "crate" || item.type === "door") continue;
      if (item.type === "secret" && levelIndex === 4 && !item.active) continue;
      const color = item.type === "lever" ? (item.active ? "#58cf77" : "#e2b942") : item.type === "button" ? "#e75b59" : "#bb78ce";
      box(item.x, item.y, item.w, item.h, color);
      ctx.fillStyle = "#fff"; ctx.font = "bold 12px 'Courier New', monospace"; ctx.textAlign = "center";
      ctx.fillText(item.type === "lever" ? "E" : item.type === "button" ? "!" : "?", item.x + item.w / 2, item.y - 6);
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
    ui.objective.textContent = `MOEDAS ${coinCount}/${LEVELS[levelIndex].targetCoins} · LIVROS ${mission.books}/1`;
    ui.inventory.textContent = inventory.length ? `${itemName(inventory[0])}${inventory.length > 1 ? ` +${inventory.length - 1}` : ""}` : "VAZIO";
  }

  function startGame() {
    if (selectedLevel >= profile.unlocked) return;
    levelIndex = selectedLevel;
    resetGame();
    lastTime = performance.now();
    requestGameLoop();
  }

  function requestGameLoop() {
    if (loopRunning) return;
    loopRunning = true;
    requestAnimationFrame(loop);
  }

  function nextLevel() {
    if (levelIndex >= LEVELS.length - 1) return showMap();
    levelIndex += 1;
    selectedLevel = levelIndex;
    resetGame(true);
    lastTime = performance.now();
    hideAllOverlays();
    renderMenu();
  }

  function showMap() {
    state = "menu";
    hideAllOverlays();
    ui.start.classList.remove("hidden");
    setShellBlur(true);
    renderMenu();
    draw();
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      ui.pause.classList.remove("hidden");
      setShellBlur(true);
    } else if (state === "paused") {
      state = "playing";
      ui.pause.classList.add("hidden");
      setShellBlur(false);
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
    if (state === "quiz" && quizCur && "123".includes(k) && quizCur.list[+k - 1] && !quizCur.list[+k - 1].gone) answerQuiz(quizCur.list[+k - 1].ok);
    if (state === "quiz" && (k === "h" || k === "H")) hintQuiz();

    if (k === "ArrowUp" || k === "w" || k === " ") queueJump();
    if (k === "p" || k === "P") togglePause();
    if (k === "e" || k === "E") interact();
    if (k === "q" || k === "Q") useItem();
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

  document.getElementById("interactBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); interact(); });
  document.getElementById("itemBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); useItem(); });

  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("resumeBtn").addEventListener("click", togglePause);
  document.getElementById("restartBtn").addEventListener("click", startGame);
  document.getElementById("playAgainBtn").addEventListener("click", startGame);
  document.getElementById("nextLevelBtn").addEventListener("click", nextLevel);
  document.getElementById("winMapBtn").addEventListener("click", showMap);
  document.getElementById("pauseMapBtn").addEventListener("click", showMap);
  document.getElementById("hardMode").addEventListener("change", e => { hardMode = e.target.checked; renderMenu(); });

  function update(dt) {
    if (state !== "playing") return;

    elapsed += dt;
    player.invincible = Math.max(0, player.invincible - dt);
    flashTimer = Math.max(0, flashTimer - dt);
    shakeTimer = Math.max(0, shakeTimer - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    Object.keys(effects).forEach(key => { effects[key] = Math.max(0, effects[key] - dt); });
    if (hardMode && elapsed > LEVELS[levelIndex].timeLimit * 0.75) {
      state = "gameover";
      ui.overTitle.textContent = "Tempo esgotado";
      ui.overMessage.textContent = "O limite de tempo do Hard Mode foi atingido.";
      saveBest();
      ui.overScore.textContent = String(score).padStart(4, "0");
      ui.overTime.textContent = formatTime(elapsed);
      ui.gameOver.classList.remove("hidden");
      setShellBlur(true);
      return;
    }

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
      const speedLimit = player.speed * (effects.energy > 0 ? 1.55 : 1);
      player.vx = clamp(player.vx, -speedLimit, speedLimit);
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
        player.vy = -player.jump * (effects.shoes > 0 ? 1.35 : 1);
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
    updateMovingPlatforms(dt);
    movePlayer(dt);
    if (player.grounded) combo = 0;
    updateMechanic(dt);
    updateEnemies(dt);
    collectCoins();
    collectCollectibles();
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

    if (bossArena) {
      if (!bossArena.entered && player.x + player.w >= bossArena.left) {
        bossArena.entered = true;
        bossArena.locked = true;
        player.x = bossArena.left + 20;
        checkpointX = bossArena.left + 50;
        checkpointY = 650;
        showScorePopup("ARENA FECHADA! DERROTE O PROFESSOR BREU");
      }
      if (bossArena.locked && player.x < bossArena.left + 20) {
        player.x = bossArena.left + 20;
        player.vx = 0;
      }
      if (player.x + player.w > bossArena.right - 20) {
        player.x = bossArena.right - 20 - player.w;
        player.vx = 0;
      }
    }

    const previousBottom = player.y + player.h;
    player.y += player.vy * 60 * dt;
    player.grounded = false;
    player.standingOn = null;

    // Colisão vertical com plataformas
    if (player.vy >= 0) {
      let best = null;
      for (const p of platforms) {
        if (p.open || (p.type === "secret" && !p.revealed)) continue;
        const horizontal = player.x + player.w > p.x && player.x < p.x + p.w;
        const crossed = previousBottom <= p.y && player.y + player.h >= p.y;
        if (horizontal && crossed && (!best || p.y < best.y)) best = p;
      }
      if (best) {
        player.y = best.y - player.h;
        player.vy = 0;
        player.grounded = true;
        player.standingOn = best;
        player.jumpsUsed = 0;
      }
    } else {
      for (const p of platforms) {
        if (p.open || (p.type === "secret" && !p.revealed)) continue;
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
      if (p.open || (p.type === "secret" && !p.revealed)) continue;
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

      const slowFactor = effects.clock > 0 || bellTimer > 0 ? 0.3 : 1;
      if (e.type === "inspector" && Math.abs(player.x - e.x) < 420) e.vx = Math.sign(player.x - e.x) * e.speed;
      else if (e.type === "inspector") e.vx = Math.sign(e.vx || 1) * e.speed;
      e.x += e.vx * 60 * dt * slowFactor * (hardMode ? 1.25 : 1);
      if (e.x <= e.minX) {
        e.x = e.minX;
        e.vx = Math.abs(e.speed);
      }
      if (e.x >= e.maxX) {
        e.x = e.maxX;
        e.vx = -Math.abs(e.speed);
      }
      e.phase += dt * 7 * slowFactor;
      if (e.type === "eraser") e.y = e.baseY - Math.abs(Math.sin(e.phase * 0.5)) * 55;
      if (e.type === "boss") {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          const attackX = clamp(player.x + player.w / 2 - 28, 0, WORLD.width - 56);
          const attackType = e.finalTeacher ? "chalk" : "fire";
          addHazard(attackX, 618, 56, 32, attackType);
          hazards[hazards.length - 1].ttl = 0.8;
          if (e.double) {
            const second = clamp(attackX + (Math.random() < 0.5 ? -140 : 140), 0, WORLD.width - 56);
            addHazard(second, 618, 56, 32, attackType);
            hazards[hazards.length - 1].ttl = 0.8;
          }
          e.attackTimer = hardMode ? 1.3 : 2.1;
        }
      }
    }
    hazards = hazards.filter(hazard => {
      if (hazard.ttl === undefined) return true;
      hazard.ttl -= dt;
      return hazard.ttl > 0;
    });
  }

  function updateMovingPlatforms(dt) {
    for (const platform of platforms) {
      if (platform.type !== "moving" || !platform.active) continue;
      const previousX = platform.x;
      platform.phase += dt * 1.6;
      platform.x = platform.baseX + Math.sin(platform.phase) * platform.range;
      if (player.grounded && player.standingOn === platform) player.x += platform.x - previousX;
    }
  }

  function awardPoints(points) { score += Math.round(points * (effects.star > 0 ? 2 : 1)); }

  function collectCoins() {
    for (const c of coins) {
      if (c.collected) continue;
      const box = { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
      if (rectsOverlap(player, box)) {
        c.collected = true;
        coinCount += 1;
        awardPoints(100);
        sfx.coin();
        burst(c.x, c.y, "#ffd34d", 10);
      }
    }
  }

  function collectCollectibles() {
    for (const item of collectibles) {
      if (item.collected || item.hidden) continue;
      if (!rectsOverlap(player, { x: item.x - 14, y: item.y - 18, w: 28, h: 36 })) continue;
      item.collected = true;
      if (item.type === "book") { mission.books += 1; awardPoints(200); showScorePopup("LIVRO ENCONTRADO! +200"); }
      if (item.type === "medal") { mission.medals += 1; awardPoints(500); showScorePopup("MEDALHA! +500"); }
      if (item.type === "key") { keysCollected += 1; awardPoints(100); showScorePopup("CHAVE ENCONTRADA"); }
      if (item.type === "secret") { mission.secrets += 1; awardPoints(300); showScorePopup("SEGREDO DESCOBERTO!"); }
      sfx.coin();
    }
  }

  function updateCheckpoints() {
    for (const cp of checkpoints) {
      if (!cp.reached && player.x + player.w / 2 >= cp.x) {
        cp.reached = true;
        checkpointX = cp.x + 15;
        checkpointY = cp.y + 90;
        awardPoints(250);
        sfx.item();
        finishBannerTimer = 1.4;
        burst(cp.x + 10, cp.y + 35, "#42d879", 18);
      }
    }
    finishBannerTimer = Math.max(0, finishBannerTimer - 1 / 60);
  }

  // Mecânica própria de cada fase: Corredor (luzes), Laboratório (ácido), Pátio (vento)
  function updateMechanic(dt) {
    mech.t += dt;
    if (levelIndex === 1) {
      const dark = mech.t % 9 > 6;
      if (dark !== mech.dark) { mech.dark = dark; showScorePopup(dark ? "AS LUZES APAGARAM!" : "LUZES DE VOLTA"); }
    }
    if (levelIndex === 3) for (const h of hazards) if (h.type === "acid") h.off = (mech.t + h.offset) % 4 >= 2;
    if (levelIndex === 4) {
      mech.bookTimer -= dt;
      if (mech.bookTimer <= 0) {
        mech.books.push({ x: clamp(player.x + (Math.random() - 0.3) * 400, 0, WORLD.width - 40), y: -40, warn: 0.9 });
        mech.bookTimer = hardMode ? 1.5 : 2.3;
      }
      mech.books = mech.books.filter(b => {
        if (b.warn > 0) { b.warn -= dt; return true; }
        b.y += 720 * dt;
        if (player.invincible <= 0 && rectsOverlap(player, { x: b.x, y: b.y, w: 36, h: 26 })) {
          if (effects.shield > 0) { effects.shield = 0; player.invincible = 0.8; showScorePopup("ESCUDO BLOQUEOU O LIVRO"); }
          else loseLife();
          return false;
        }
        return b.y < 720;
      });
    }
    if (levelIndex === 5) {
      mech.windTimer -= dt;
      if (mech.windTimer <= 0) {
        mech.wind = mech.wind ? 0 : (Math.random() < 0.5 ? -1 : 1);
        mech.windTimer = mech.wind ? 2.5 : 6;
        if (mech.wind) showScorePopup(mech.wind > 0 ? "VENTO FORTE →" : "← VENTO FORTE");
      }
      if (mech.wind) player.vx += mech.wind * 0.18 * dt * 60;
    }
  }

  function drawMechanic() {
    if (levelIndex === 1 && (mech.dark || (mech.t % 9 > 5.5 && Math.floor(mech.t * 10) % 2))) {
      const sx = player.x - cameraX + player.w / 2, sy = player.y + player.h / 2;
      const g = ctx.createRadialGradient(sx, sy, 60, sx, sy, 190);
      g.addColorStop(0, "rgba(5,10,25,0)"); g.addColorStop(1, "rgba(5,10,25," + (mech.dark ? 0.94 : 0.3) + ")");
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    if (levelIndex === 4) for (const b of mech.books) {
      const sx = b.x - cameraX;
      if (b.warn > 0) {
        ctx.fillStyle = "rgba(239,92,92," + (Math.floor(mech.t * 10) % 2 ? 0.25 : 0.1) + ")";
        ctx.fillRect(sx - 4, 80, 44, 580);
        px(sx + 14, 90, 8, 22, "#ef5c5c"); px(sx + 14, 118, 8, 8, "#ef5c5c");
      } else box(sx, b.y, 36, 26, "#2f6fd0"), px(sx + 5, b.y + 8, 26, 3, "#f5fafc");
    }
    if (levelIndex === 5 && mech.wind) {
      ctx.fillStyle = "rgba(255,255,255,.7)";
      for (let i = 0; i < 14; i++) ctx.fillRect(((mech.t * 400 * mech.wind + i * 97) % VIEW.width + VIEW.width) % VIEW.width, 110 + (i * 53) % 520, 40, 3);
    }
  }

  function handleHazards() {
    if (player.invincible > 0) return;
    for (const h of hazards) {
      if (h.off) continue;
      const hitbox = { x: h.x + 4, y: h.y + 5, w: h.w - 8, h: h.h - 5 };
      if (rectsOverlap(player, hitbox)) {
        if (effects.shield > 0) { effects.shield = 0; player.invincible = 0.8; showScorePopup("ESCUDO BLOQUEOU O PERIGO"); return; }
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
        if (e.type === "boss") {
          e.health -= 1;
          player.y = e.y - player.h;
          player.vy = -10;
          if (e.health <= 0) {
            e.dead = true;
            if (e.finalTeacher && bossArena) bossArena.locked = false;
            awardPoints(1500);
            showScorePopup(e.director ? "DIRETOR DERROTADO! SAÍDA LIBERADA" : e.finalTeacher ? "PROFESSOR BREU DERROTADO!" : "CHEFE DERROTADO!");
          }
          else showScorePopup(`ACERTO! CHEFE ${e.health}/${e.maxHealth || 3}`);
          sfx.stomp();
          continue;
        }
        e.squashed = 0.42;
        player.y = e.y - player.h;
        player.vy = -8.5;
        combo++;
        const pts = 200 * Math.min(2 ** (combo - 1), 4);
        awardPoints(pts);
        sfx.stomp();
        showScorePopup(`= ${pts} PONTOS` + (combo > 1 ? ` COMBO x${combo}!` : ""));
        burst(e.x + e.w / 2, e.y + e.h / 2, e.color, 12);
      } else {
        if (effects.shield > 0) { effects.shield = 0; player.invincible = 0.8; continue; }
        loseLife();
        return;
      }
    }
  }

  function handleGoal() {
    if (!goal) return;
    if (boss && !boss.dead) return;
    if (rectsOverlap(player, goal)) winGame();
  }

  function loseLife() {
    if (state !== "playing" || player.invincible > 0 || respawnTimer > 0) return;

    mission.damageTaken = true;
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
      setShellBlur(true);
    } else {
      respawnTimer = 0.45;
    }
    updateHud();
  }

  function winGame() {
    if (state !== "playing") return;
    state = "won";
    const level = LEVELS[levelIndex];
    const timeLimit = level.timeLimit * (hardMode ? 0.75 : 1);
    awardPoints(Math.max(0, 800 - Math.floor(elapsed) * 4));
    campaignTime += elapsed;
    const coinsMet = coinCount >= level.targetCoins;
    const timeMet = elapsed <= timeLimit;
    const bookMet = mission.books > 0;
    const secretMet = levelIndex !== 4 || mission.secrets > 0;
    const noDamage = !mission.damageTaken;
    const missionComplete = coinsMet && timeMet && bookMet && secretMet && noDamage;
    const grade = missionComplete ?
      (coinCount >= level.targetCoins + 4 && elapsed < timeLimit * 0.65 && mission.medals > 0 ? "S" : "A") :
      (coinCount >= Math.ceil(level.targetCoins * 0.7) && bookMet ? "B" : "C");
    const stars = grade === "S" ? 3 : grade === "A" ? 2 : grade === "B" ? 1 : 0;
    const isFinal = levelIndex === LEVELS.length - 1;
    if (!profile.completed.includes(levelIndex)) profile.completed.push(levelIndex);
    profile.unlocked = Math.max(profile.unlocked, Math.min(LEVELS.length, levelIndex + 2));
    profile.stars[levelIndex] = Math.max(profile.stars[levelIndex] || 0, stars);
    const totalStars = Object.values(profile.stars).reduce((sum, count) => sum + count, 0);
    const campaignGrade = totalStars >= 18 ? "S" : totalStars >= 12 ? "A" : totalStars >= 6 ? "B" : "C";
    if (isFinal) {
      const previousBest = Number(profile.bestCampaignTime);
      profile.bestCampaignTime = Number.isFinite(previousBest) ? Math.min(previousBest, campaignTime) : campaignTime;
    }
    saveProfile();
    saveBest();
    ui.winScore.textContent = String(score).padStart(4, "0");
    ui.winTime.textContent = formatTime(isFinal ? campaignTime : elapsed);
    ui.grade.textContent = isFinal ? campaignGrade : grade;
    ui.mission.textContent = isFinal ? `CAMPANHA CONCLUÍDA · ${profile.completed.length}/${LEVELS.length} FASES · ${totalStars}/21 ESTRELAS` :
      `MISSÃO ${missionComplete ? "CONCLUÍDA" : "PARCIAL"} · MOEDAS ${coinCount}/${level.targetCoins} · LIVROS ${mission.books} · ${mission.damageTaken ? "VIDA PERDIDA" : "SEM PERDAS"}`;
    ui.stars.textContent = isFinal ? `${totalStars}/21 ★` : "★".repeat(stars) + "☆".repeat(3 - stars);
    document.getElementById("nextLevelBtn").classList.toggle("hidden", isFinal);
    document.getElementById("playAgainBtn").textContent = isFinal ? "REJOGAR DESAFIO FINAL" : "REJOGAR FASE";
    ui.finalSummary.innerHTML = isFinal ? `<span class="campaign-total">TOTAL ${String(score).padStart(4, "0")} PTS<br>TEMPO ${formatTime(campaignTime)}<br>RECORDE ${formatTime(profile.bestCampaignTime)}</span>` + LEVELS.map((entry, index) => {
      const record = profile.records[index];
      return `<span>${entry.name}<br>${"★".repeat(profile.stars[index] || 0)}${"☆".repeat(3 - (profile.stars[index] || 0))}${record ? `<br>${String(record.bestScore).padStart(4, "0")} pts · ${formatTime(record.bestTime)}` : ""}</span>`;
    }).join("") : "";
    sfx.win();
    ui.win.classList.remove("hidden");
    setShellBlur(true);
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
    drawMechanic();

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
    drawStageProps();
    drawBossArena();
    drawPlatforms();
    drawHazards();
    drawInteractables();
    drawBoards();
    drawItems();
    drawCollectibles();
    drawCoins();
    drawCheckpoints();
    drawEnemies();
    drawGoal();
    drawPlayer();
    drawParticles();
  }

  function drawBossArena() {
    if (!bossArena) return;

    const { left, right, locked } = bossArena;
    px(left + 20, 44, right - left - 40, 606, "#354b52");
    for (let y = 88; y < 620; y += 54) {
      px(left + 22, y, right - left - 44, 3, "#405960");
      px(left + 170, y + 3, 3, 51, "#405960");
      px(left + 430, y + 3, 3, 51, "#405960");
    }
    box(left - 12, 0, 32, 650, "#6b4a2b", "#3b2a18");
    box(right - 20, 0, 32, 650, "#6b4a2b", "#3b2a18");
    px(left + 20, 36, right - left - 40, 12, "#3b2a18");
    ctx.fillStyle = "#f4c95d";
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ARENA DO PROFESSOR BREU", (left + right) / 2, 76);

    if (locked) {
      px(left - 4, 0, 12, 650, "#9a7043");
      for (let y = 8; y < 650; y += 42) {
        px(left - 4, y, 12, 5, "#d8bd78");
      }
      px(left - 18, 310, 40, 12, "#d8bd78");
    }
  }

  function drawStageProps() {
    const theme = LEVELS[levelIndex].theme;
    for (let x = 100; x < WORLD.width; x += 620) {
      if (theme === "classroom") {
        box(x + 110, 520, 106, 13, "#a8643c");
        px(x + 120, 533, 8, 44, "#4b3424"); px(x + 198, 533, 8, 44, "#4b3424");
        box(x + 290, 548, 52, 10, "#6b4a2b"); px(x + 298, 558, 6, 26, "#4b3424");
      } else if (theme === "corridor") {
        for (let i = 0; i < 5; i++) {
          box(x + 70 + i * 72, 350, 58, 180, i % 2 ? "#416d7a" : "#567b85");
          px(x + 80 + i * 72, 375, 38, 3, "#d4d9cd"); px(x + 80 + i * 72, 408, 38, 3, "#d4d9cd");
          px(x + 115 + i * 72, 435, 5, 5, "#f4c95d");
        }
      } else if (theme === "office") {
        box(x + 100, 515, 150, 24, "#744c39"); px(x + 116, 539, 10, 70, "#493326"); px(x + 224, 539, 10, 70, "#493326");
        box(x + 300, 420, 72, 118, "#9a5a42"); px(x + 312, 433, 48, 8, "#e2c36b"); px(x + 312, 455, 48, 5, "#e2c36b");
      } else if (theme === "lab") {
        box(x + 100, 525, 170, 18, "#5c7180"); px(x + 112, 543, 8, 60, "#344a56"); px(x + 250, 543, 8, 60, "#344a56");
        ctx.fillStyle = "rgba(74, 209, 177, .7)"; ctx.fillRect(x + 132, 470, 32, 52);
        ctx.fillStyle = "rgba(227, 96, 114, .72)"; ctx.fillRect(x + 184, 482, 26, 40);
        box(x + 130, 466, 36, 6, "#dbe8e6"); box(x + 182, 478, 30, 6, "#dbe8e6");
      } else if (theme === "library") {
        box(x + 90, 310, 260, 220, "#6b4a2b");
        for (let row = 0; row < 3; row++) {
          px(x + 100, 365 + row * 54, 240, 7, "#a8643c");
          for (let book = 0; book < 8; book++) px(x + 108 + book * 28, 326 + row * 54, 16, 38, ["#b43f36", "#d5a33d", "#326e62", "#426f9e"][book % 4]);
        }
      } else if (theme === "yard") {
        px(x + 160, 355, 18, 160, "#704b2e"); px(x + 120, 330, 96, 80, "#478c4c");
        px(x + 130, 300, 76, 62, "#5ca858"); box(x + 300, 535, 112, 14, "#9a5a42");
      } else {
        box(x + 90, 250, 30, 320, "#6b4a2b"); box(x + 350, 250, 30, 320, "#6b4a2b");
        px(x + 145, 280, 160, 12, "#f4c95d"); px(x + 180, 292, 90, 48, "#9d3e35");
        ctx.fillStyle = "#ffd93b"; ctx.font = "bold 24px 'Courier New', monospace"; ctx.textAlign = "center";
        ctx.fillText("★", x + 225, 328);
      }
    }
  }

  function drawPlatforms() {
    const T = 64;
    for (const p of platforms) {
      if (p.open || (p.type === "secret" && !p.revealed)) continue;
      if (p.type === "door") {
        box(p.x, p.y, p.w, p.h, "#8a5a2b"); px(p.x + 6, p.y + 10, p.w - 12, p.h - 20, "#b8763f");
        px(p.x + p.w - 10, p.y + p.h / 2, 4, 4, "#ffd93b");
        continue;
      }
      if (p.type === "crate") { box(p.x, p.y, p.w, p.h, "#a8643c"); px(p.x + 6, p.y + 6, p.w - 12, 4, "#d2955b"); continue; }
      if (p.type === "floating" || p.type === "moving" || p.type === "secret") {
        const red = ((p.x / 10) | 0) % 2 === 0;
        box(p.x, p.y, p.w, 30, p.type === "moving" ? "#3b82a0" : red ? "#d63a2f" : "#2f9a4a");
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
      } else if (h.type === "chalk") {
        ctx.fillStyle = "rgba(214, 230, 220, .85)";
        ctx.beginPath();
        ctx.arc(h.x + 13, h.y + 22, 10, 0, Math.PI * 2);
        ctx.arc(h.x + 27, h.y + 13, 13, 0, Math.PI * 2);
        ctx.arc(h.x + 43, h.y + 21, 11, 0, Math.PI * 2);
        ctx.fill();
        px(h.x + 12, h.y + 19, 4, 3, "#fff");
        px(h.x + 30, h.y + 10, 5, 3, "#fff");
        px(h.x + 42, h.y + 18, 4, 3, "#fff");
      } else if (h.type === "acid") {
        const warn = h.off && (mech.t + h.offset) % 4 > 3.5 && Math.floor(mech.t * 12) % 2;
        const top = h.off ? 20 : 6;
        px(h.x, h.y + top, h.w, h.h - top, h.off ? (warn ? "#9dff6b" : "#3d7a3a") : "#7dff4a");
        if (!h.off) for (let x = h.x + 8; x < h.x + h.w - 8; x += 24) px(x, h.y + 2, 8, 6, "#d6ffb0");
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
      if (e.type === "boss") {
        if (e.finalTeacher) {
          ctx.fillStyle = "rgba(25, 38, 48, .28)";
          ctx.beginPath();
          ctx.ellipse(e.x + e.w / 2, e.y + e.h - 2, 48, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          box(e.x + 6, e.y + 50, 80, 48, "#244b4b", "#172d38");
          px(e.x + 28, e.y + 54, 36, 44, "#d7ddd1");
          px(e.x + 42, e.y + 58, 9, 29, "#aa5860");
          px(e.x + 24, e.y + 91, 18, 7, "#172d38");
          px(e.x + 54, e.y + 91, 18, 7, "#172d38");
          box(e.x + 14, e.y + 10, 64, 46, "#b8c5bd", "#263b42");
          px(e.x + 18, e.y + 4, 16, 10, "#dce4dc");
          px(e.x + 38, e.y + 1, 17, 12, "#dce4dc");
          px(e.x + 60, e.y + 5, 15, 10, "#dce4dc");
          px(e.x + 22, e.y + 24, 18, 5, "#263b42");
          px(e.x + 52, e.y + 24, 18, 5, "#263b42");
          px(e.x + 24, e.y + 31, 13, 11, "#8ce3dc");
          px(e.x + 55, e.y + 31, 13, 11, "#8ce3dc");
          px(e.x + 29, e.y + 33, 5, 7, "#172d38");
          px(e.x + 59, e.y + 33, 5, 7, "#172d38");
          px(e.x + 39, e.y + 46, 16, 3, "#6b3b45");
          ctx.save();
          ctx.translate(e.x + 79, e.y + 68);
          ctx.rotate(-0.32);
          box(-3, -26, 6, 38, "#d7bd78", "#604b34");
          px(-4, -30, 8, 5, "#dce4dc");
          ctx.restore();
          box(e.x + 12, e.y - 14, 68, 7, "#172d38");
          px(e.x + 14, e.y - 12, 64 * e.health / (e.maxHealth || 4), 3, "#73d8cb");
          ctx.fillStyle = "#f5fafc";
          ctx.font = "bold 9px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.fillText("PROFESSOR BREU", e.x + e.w / 2, e.y - 19);
          ctx.restore();
          continue;
        }
        box(e.x, e.y + 12, e.w, e.h - 12, e.director ? "#3b4a6b" : "#9d3e35");
        px(e.x + 10, e.y, e.w - 20, 18, e.director ? "#d8d8d8" : "#e2b942");
        if (e.director) { px(e.x + 38, e.y + 52, 16, 40, "#ef5c5c"); px(e.x + 16, e.y + 30, 24, 4, "#2a1a10"); px(e.x + 52, e.y + 30, 24, 4, "#2a1a10"); }
        px(e.x + 20, e.y + 36, 14, 12, "#fff"); px(e.x + 60, e.y + 36, 14, 12, "#fff");
        px(e.x + 25, e.y + 40, 6, 7, "#1b2330"); px(e.x + 65, e.y + 40, 6, 7, "#1b2330");
        px(e.x + 28, e.y + 70, 38, 5, "#2a1a10");
        box(e.x + 12, e.y - 14, 68, 7, "#2a1a10");
        px(e.x + 14, e.y - 12, 64 * e.health / (e.maxHealth || 3), 3, "#ef5c5c");
        ctx.restore(); continue;
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
      const bodyColor = e.type === "robot" ? "#55a9b5" : e.type === "inspector" ? "#a34a39" : "#f2a31b";
      box(e.x, e.y, e.w, 38, bodyColor);
      px(e.x + 3, e.y + 3, 4, 32, e.type === "robot" ? "#a4eff0" : "#ffc85a");
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
    const shirt = selectedCharacter === "atleta" ? "#d94e47" : selectedCharacter === "inventora" ? "#3ca58b" : "#426f9e";

    ctx.save();
    ctx.translate(Math.round(player.x + player.w / 2), Math.round(player.y));
    ctx.scale(player.facing, 1);

    px(-16, 52, 32, 4, "rgba(0,0,0,.2)");
    const l1 = air ? -3 : leg, l2 = air ? 4 : -leg;
    box(-12, 40, 10, 10 + l1, "#b7a26a"); box(2, 40, 10, 10 + l2, "#b7a26a");
    px(-14, 49 + l1, 14, 5, "#1f1f1f"); px(0, 49 + l2, 14, 5, "#1f1f1f");
    box(-22, 24, 9, 16, "#6b4a2b");
    box(-14, 22, 28, 19, shirt);
    px(-14, 22, 28, 3, "#9fd9cb");
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
    } else loopRunning = false;
  }

  // Tela inicial já renderiza o cenário parado.
  buildLevel();
  updateHud();
  draw();
})();
