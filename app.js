const h = React.createElement;
const { useState, useEffect, useRef, useCallback } = React;

// ============================================================
// NIVELES — los mazes viven en config.js (CONFIG.levels), no aqui.
// Cada nivel trae su propio maze, pastillas de poder, y posicion
// inicial del jugador y de los fantasmas. Para agregar los tuyos,
// edita CONFIG.levels en config.js (ahi esta el formato explicado).
// # pared . coca (comida) o pastilla de poder (punto blanco)
// espacio = camino libre sin comida (casa de fantasmas)
// ============================================================

// datos del nivel actualmente cargado — se recalculan cada vez que
// se llama loadLevelDef(), por eso son "let" y no "const"
let MAZE_ROWS = [];
let ROWS = 0;
let COLS = 0;
let PLAYER_START = { r: 0, c: 0 };
let GHOST_HOME = { r: 0, c: 0 };
let GHOST_START = [];

const GHOST_DEFS = [
  { name: "Hachiware", img: ENEMY_IMAGES.hachiware },
  { name: "Chiikawa", img: ENEMY_IMAGES.chiikawa },
  { name: "Usagi", img: ENEMY_IMAGES.usagi },
];

// estampa las pastillas de poder (powerSpots del nivel) sobre el maze
function applyPowerSpots(rawMaze, powerSpots) {
  return rawMaze.map((row, r) => {
    const spots = (powerSpots || []).filter(([pr]) => pr === r).map(([, pc]) => pc);
    if (!spots.length) return row;
    const chars = row.split("");
    spots.forEach((c) => { chars[c] = "o"; });
    return chars.join("");
  });
}

// carga el nivel CONFIG.levels[index]: actualiza MAZE_ROWS/ROWS/COLS/
// PLAYER_START/GHOST_HOME/GHOST_START y regresa {grid, dotsLeft}
function loadLevelDef(index) {
  const def = CONFIG.levels[index];
  MAZE_ROWS = applyPowerSpots(def.maze, def.powerSpots);
  ROWS = MAZE_ROWS.length;
  COLS = MAZE_ROWS[0].length;
  PLAYER_START = def.playerStart;
  GHOST_HOME = def.ghostHome;
  GHOST_START = def.ghostStart;
  return parseMaze();
}

function parseMaze() {
  const grid = [];
  let dotsLeft = 0;
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const ch = MAZE_ROWS[r][c];
      row.push(ch);
      if (ch === "." || ch === "o") dotsLeft++;
    }
    grid.push(row);
  }
  return { grid, dotsLeft };
}

function isWalkable(grid, r, c) {
  if (r < 0 || r >= ROWS) return false;
  if (c < 0) c = COLS - 1;
  if (c >= COLS) c = 0;
  return grid[r][c] !== "#";
}

// mapa de distancias (BFS) desde un punto fijo del laberinto — se usa
// para que los fantasmas comidos siempre encuentren el camino de
// regreso a la casa, sin quedarse atascados rebotando entre paredes
function buildDistanceMap(grid, target) {
  const dist = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity));
  dist[target.r][target.c] = 0;
  const queue = [[target.r, target.c]];
  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    const d = dist[r][c];
    for (const k of DIR_KEYS) {
      const m = DIRS[k];
      const nr = r + m.dr;
      const nc = nr < 0 || nr >= ROWS ? c : (c + m.dc + COLS) % COLS;
      if (nr < 0 || nr >= ROWS) continue;
      if (grid[nr][nc] === "#") continue;
      if (dist[nr][nc] > d + 1) {
        dist[nr][nc] = d + 1;
        queue.push([nr, nc]);
      }
    }
  }
  return dist;
}

const DIRS = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
const DIR_KEYS = Object.keys(DIRS);

const TILE = 30;
// velocidades y duracion del modo vulnerable: definidas en config.js
const SPEED_PLAYER = CONFIG.speedPlayer;
const SPEED_GHOST = CONFIG.speedGhost;
const SPEED_GHOST_FRIGHT = CONFIG.speedGhostFright;
const SPEED_GHOST_EATEN = CONFIG.speedGhostEaten;
const FRIGHT_MS = CONFIG.frightMs;

function AvatarView() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const px = 10;
    canvas.width = AV_W * px;
    canvas.height = AV_H * px;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSprite(ctx, AVATAR, 0, 0, px);
  }, []);
  return h(
    "div",
    { className: "avatar-view" },
    h("canvas", { ref: canvasRef, className: "avatar-canvas" }),
    h(
      "p",
      { className: "avatar-caption" },
      CONFIG.texts.avatarCaption
    )
  );
}

function wrapCol(c) {
  if (c < 0) return COLS - 1;
  if (c >= COLS) return 0;
  return c;
}

function pickChase(pool, from, target, away) {
  let best = pool[0];
  let bestScore = -Infinity;
  for (const d of pool) {
    const m = DIRS[d];
    const nr = from.r + m.dr, nc = wrapCol(from.c + m.dc);
    let dist = Math.abs(nr - target.r) + Math.abs(nc - target.c);
    const score = away ? dist : -dist;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

function PacmanGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const musicRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [ui, setUi] = useState({ score: 0, lives: 3, status: "ready", level: 1, levelCount: CONFIG.levels.length }); // ready | playing | levelComplete | won | lost

  // musica de fondo (CONFIG.music.src) — arranca en loop y se queda
  // sonando durante todo el juego, entre niveles y todo. Si el
  // navegador bloquea el autoplay, arranca en cuanto el usuario
  // toca una tecla o la pantalla (requisito de los navegadores).
  useEffect(() => {
    if (!CONFIG.music.src) return;
    const audio = new Audio(CONFIG.music.src);
    audio.loop = CONFIG.music.loop;
    audio.volume = CONFIG.music.volume;
    musicRef.current = audio;
    const tryPlay = () => audio.play().catch(() => {});
    tryPlay();
    window.addEventListener("keydown", tryPlay, { once: true });
    window.addEventListener("pointerdown", tryPlay, { once: true });
    return () => {
      window.removeEventListener("keydown", tryPlay);
      window.removeEventListener("pointerdown", tryPlay);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (musicRef.current) musicRef.current.muted = muted;
  }, [muted]);

  const initGame = useCallback(() => {
    const level = 0;
    const { grid, dotsLeft } = loadLevelDef(level);
    stateRef.current = {
      level,
      grid,
      dotsLeft,
      homeDist: buildDistanceMap(grid, GHOST_HOME),
      score: 0,
      lives: CONFIG.livesStart,
      player: { r: PLAYER_START.r, c: PLAYER_START.c, dir: null, facing: "left", want: "left", progress: 0 },
      ghosts: GHOST_START.map((g, i) => ({
        r: g.r, c: g.c, dir: null, facing: "up", progress: 0,
        def: GHOST_DEFS[i], alive: true, frightUntil: 0,
      })),
      frightTimer: 0,
      status: "playing",
      mouthOpen: true,
      mouthT: 0,
    };
    setUi({ score: 0, lives: CONFIG.livesStart, status: "playing", level: level + 1, levelCount: CONFIG.levels.length });
  }, []);

  // avanza al siguiente nivel manteniendo puntos y vidas
  const goNextLevel = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    const level = s.level + 1;
    const { grid, dotsLeft } = loadLevelDef(level);
    s.level = level;
    s.grid = grid;
    s.dotsLeft = dotsLeft;
    s.homeDist = buildDistanceMap(grid, GHOST_HOME);
    s.player = { r: PLAYER_START.r, c: PLAYER_START.c, dir: null, facing: "left", want: "left", progress: 0 };
    s.ghosts = GHOST_START.map((g, i) => ({
      r: g.r, c: g.c, dir: null, facing: "up", progress: 0,
      def: GHOST_DEFS[i], alive: true, frightUntil: 0,
    }));
    s.frightTimer = 0;
    s.status = "playing";
    setUi({ score: s.score, lives: s.lives, status: "playing", level: level + 1, levelCount: CONFIG.levels.length });
  }, []);

  useEffect(() => { initGame(); }, [initGame]);

  // --- controles de teclado ---
  useEffect(() => {
    const onKey = (e) => {
      const map = {
        ArrowUp: "up", w: "up", W: "up",
        ArrowDown: "down", s: "down", S: "down",
        ArrowLeft: "left", a: "left", A: "left",
        ArrowRight: "right", d: "right", D: "right",
      };
      const dir = map[e.key];
      if (dir && stateRef.current) {
        e.preventDefault();
        stateRef.current.player.want = dir;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setWant = (dir) => {
    if (stateRef.current) stateRef.current.player.want = dir;
  };

  const eatAt = (s, r, c) => {
    const cell = s.grid[r][c];
    if (cell === ".") {
      s.grid[r][c] = " ";
      s.score += 10;
      s.dotsLeft--;
      playSound("eatDot");
    } else if (cell === "o") {
      s.grid[r][c] = " ";
      s.score += 50;
      s.dotsLeft--;
      s.frightTimer = Date.now() + FRIGHT_MS;
      s.ghosts.forEach((g) => { if (g.alive) g.frightUntil = s.frightTimer; });
      playSound("eatPower");
    }
    if (s.dotsLeft <= 0) {
      const hasNextLevel = s.level < CONFIG.levels.length - 1;
      s.status = hasNextLevel ? "levelComplete" : "won";
      playSound("win");
    }
  };

  const visualPos = (e) => {
    if (!e.dir) return { vr: e.r, vc: e.c };
    const m = DIRS[e.dir];
    return { vr: e.r + m.dr * e.progress, vc: e.c + m.dc * e.progress };
  };

  const resolveCollisions = (s) => {
    const p = s.player;
    const pv = visualPos(p);
    for (const g of s.ghosts) {
      if (!g.alive) continue;
      const gv = visualPos(g);
      const dist = Math.hypot(gv.vr - pv.vr, gv.vc - pv.vc);
      if (dist < 0.6) {
        const isFright = Date.now() < g.frightUntil;
        if (isFright) {
          g.alive = false;
          g.frightUntil = 0;
          s.score += 200;
          playSound("eatGhost");
        } else {
          s.lives -= 1;
          playSound("death");
          if (s.lives <= 0) {
            s.status = "lost";
          } else {
            p.r = PLAYER_START.r; p.c = PLAYER_START.c; p.dir = null; p.facing = "left"; p.want = "left"; p.progress = 0;
            s.ghosts.forEach((gg, i) => {
              gg.r = GHOST_START[i].r; gg.c = GHOST_START[i].c;
              gg.dir = null; gg.progress = 0; gg.alive = true; gg.frightUntil = 0;
            });
          }
          return;
        }
      }
    }
  };

  // decide la proxima direccion de un fantasma parado exactamente sobre una celda
  const decideGhostDir = (s, g) => {
    if (!g.alive) {
      const pool = DIR_KEYS.filter((d) => isWalkable(s.grid, g.r + DIRS[d].dr, wrapCol(g.c + DIRS[d].dc)));
      if (!pool.length) return null;
      if (g.r === GHOST_HOME.r && g.c === GHOST_HOME.c) {
        g.alive = true;
        g.frightUntil = 0;
      }
      // usa el mapa de distancias BFS: siempre progresa hacia la casa,
      // nunca se queda rebotando entre paredes
      let best = pool[0], bestD = Infinity;
      for (const d of pool) {
        const m = DIRS[d];
        const nr = g.r + m.dr, nc = wrapCol(g.c + m.dc);
        const dd = s.homeDist[nr][nc];
        if (dd < bestD) { bestD = dd; best = d; }
      }
      return best;
    }
    const noReverse = DIR_KEYS.filter((d) =>
      d !== OPPOSITE[g.facing] && isWalkable(s.grid, g.r + DIRS[d].dr, wrapCol(g.c + DIRS[d].dc))
    );
    const pool = noReverse.length ? noReverse : DIR_KEYS.filter((d) =>
      isWalkable(s.grid, g.r + DIRS[d].dr, wrapCol(g.c + DIRS[d].dc))
    );
    if (!pool.length) return null;
    const isFright = Date.now() < g.frightUntil;
    if (Math.random() < 0.65) {
      return pickChase(pool, g, s.player, isFright);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const decidePlayerDir = (s, p) => {
    if (p.want && isWalkable(s.grid, p.r + DIRS[p.want].dr, wrapCol(p.c + DIRS[p.want].dc))) return p.want;
    if (p.facing && isWalkable(s.grid, p.r + DIRS[p.facing].dr, wrapCol(p.c + DIRS[p.facing].dc))) return p.facing;
    return null;
  };

  // avanza una entidad basada en tiles con interpolacion continua (movimiento fluido)
  const stepEntity = (s, e, speed, dt, decideDir, onArrive) => {
    if (e.dir) {
      e.progress += speed * dt;
      let guard = 0;
      while (e.progress >= 1 && guard++ < 4) {
        e.progress -= 1;
        e.r += DIRS[e.dir].dr;
        e.c = wrapCol(e.c + DIRS[e.dir].dc);
        if (onArrive) onArrive(e);
        const next = decideDir(s, e);
        if (next && isWalkable(s.grid, e.r + DIRS[next].dr, wrapCol(e.c + DIRS[next].dc))) {
          e.dir = next;
          e.facing = next;
        } else {
          e.dir = null;
          e.progress = 0;
          break;
        }
      }
    } else {
      const next = decideDir(s, e);
      if (next && isWalkable(s.grid, e.r + DIRS[next].dr, wrapCol(e.c + DIRS[next].dc))) {
        e.dir = next;
        e.facing = next;
      }
    }
  };

  // --- loop principal (requestAnimationFrame, movimiento continuo) ---
  useEffect(() => {
    let raf;
    let last = performance.now();
    let uiAccum = 0;
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = stateRef.current;
      if (s && s.status === "playing") {
        s.mouthT += dt;
        s.mouthOpen = Math.floor(s.mouthT * 9) % 2 === 0;

        stepEntity(s, s.player, SPEED_PLAYER, dt, decidePlayerDir, (p) => eatAt(s, p.r, p.c));
        s.ghosts.forEach((g) => {
          const isFright = g.alive && Date.now() < g.frightUntil;
          const speed = !g.alive ? SPEED_GHOST_EATEN : isFright ? SPEED_GHOST_FRIGHT : SPEED_GHOST;
          stepEntity(s, g, speed, dt, decideGhostDir, null);
        });
        resolveCollisions(s);

        uiAccum += dt;
        if (uiAccum > 0.12) {
          uiAccum = 0;
          setUi({ score: s.score, lives: s.lives, status: s.status, level: s.level + 1, levelCount: CONFIG.levels.length });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // --- render ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const visPos = (e) => {
      if (!e.dir) return { vr: e.r, vc: e.c };
      const m = DIRS[e.dir];
      return { vr: e.r + m.dr * e.progress, vc: e.c + m.dc * e.progress };
    };
    const draw = () => {
      const s = stateRef.current;
      // el tamano del canvas depende del nivel actual (COLS/ROWS
      // pueden cambiar entre niveles si sus mazes tienen otro tamano)
      if (canvas.width !== COLS * TILE) canvas.width = COLS * TILE;
      if (canvas.height !== ROWS * TILE) canvas.height = ROWS * TILE;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#0c0d14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (s) {
        // paredes
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (s.grid[r][c] === "#") {
              ctx.fillStyle = CONFIG.colors.wallFill;
              ctx.fillRect(c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4);
              ctx.fillStyle = CONFIG.colors.wallHighlight;
              ctx.fillRect(c * TILE + 2, r * TILE + 2, TILE - 4, 3);
            }
          }
        }
        // comida: cocas pequenas; pastillas de poder: solo un punto blanco
        const dotPx = Math.max(3, Math.floor(TILE / 7));
        const pulse = 0.75 + 0.25 * Math.sin(Date.now() / 180);
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const cell = s.grid[r][c];
            if (cell === ".") {
              drawSprite(
                ctx, COKE_BOTTLE,
                c * TILE + (TILE - COKE_W * dotPx) / 2,
                r * TILE + (TILE - COKE_H * dotPx) / 2,
                dotPx
              );
            } else if (cell === "o") {
              ctx.fillStyle = "#ffffff";
              ctx.globalAlpha = pulse;
              ctx.beginPath();
              ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, TILE * 0.22, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          }
        }
        // fantasmas
        const ghostPx = (TILE / GHOST_W) * 1.55;
        s.ghosts.forEach((g) => {
          const { vr, vc } = visPos(g);
          if (!g.alive) {
            // ojos regresando a casa tras ser comidos
            drawSprite(
              ctx, eyes,
              vc * TILE + (TILE - GHOST_W * ghostPx) / 2,
              vr * TILE + (TILE - GHOST_W * ghostPx) / 2,
              ghostPx * 0.85
            );
            return;
          }
          const isFright = Date.now() < g.frightUntil;
          ctx.save();
          if (isFright) {
            // asustado: sigue siendo pixel art por codigo, no hay
            // imagen para este estado
            ctx.globalAlpha = 0.7;
            drawSprite(
              ctx,
              ghostBody("blueD").concat(eyes),
              vc * TILE + (TILE - GHOST_W * ghostPx) / 2,
              vr * TILE + (TILE - GHOST_W * ghostPx) / 2 - GHOST_YOFF * ghostPx * 0.55,
              ghostPx
            );
          } else if (g.def.img && g.def.img.complete && g.def.img.naturalWidth) {
            // enemigo normal: imagen real (tu pixel art), no rects
            const img = g.def.img;
            const w = TILE * 1.3;
            const hh = w * (img.naturalHeight / img.naturalWidth);
            ctx.drawImage(
              img,
              vc * TILE + (TILE - w) / 2,
              vr * TILE + (TILE - hh) / 2 - hh * 0.12,
              w,
              hh
            );
          }
          ctx.restore();
        });
        // jugador (pac-man clasico redondo)
        const p = s.player;
        const { vr, vc } = visPos(p);
        const cx = vc * TILE + TILE / 2;
        const cy = vr * TILE + TILE / 2;
        const rad = TILE * 0.42;
        const angles = { right: 0, down: 90, left: 180, up: 270 };
        const baseAngle = (angles[p.facing] || 0) * Math.PI / 180;
        const mouth = s.mouthOpen ? 0.24 : 0.02;
        ctx.fillStyle = "#ffd23f";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, rad, baseAngle + mouth * Math.PI, baseAngle + (2 - mouth) * Math.PI);
        ctx.closePath();
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const status = ui.status;

  return h(
    "div",
    { className: "game-wrap" },
    h(
      "div",
      { className: "hud" },
      h("div", { className: "hud-item" }, CONFIG.texts.scoreLabel, h("b", null, ui.score)),
      h("div", { className: "hud-item" }, CONFIG.texts.livesLabel, h("b", null, CONFIG.livesIcon.repeat(Math.max(ui.lives, 0)))),
      CONFIG.levels.length > 1 && h("div", { className: "hud-item" }, CONFIG.texts.levelLabel, h("b", null, ui.level + "/" + ui.levelCount)),
      CONFIG.music.src && h("button", { className: "tc-btn", onClick: () => setMuted((m) => !m) }, muted ? "🔇" : "🔊"),
    ),
    h(
      "div",
      { className: "canvas-shell" },
      h("canvas", { ref: canvasRef, className: "game-canvas" }),
      (status === "won" || status === "lost" || status === "levelComplete") &&
        h(
          "div",
          { className: "overlay" },
          h(
            "p",
            { className: "overlay-title" },
            status === "won" ? CONFIG.texts.wonTitle :
            status === "levelComplete" ? CONFIG.texts.levelCompleteTitle :
            CONFIG.texts.lostTitle
          ),
          h("p", null, CONFIG.texts.scoreLabel + ui.score),
          status === "levelComplete"
            ? h("button", { className: "btn", onClick: goNextLevel }, CONFIG.texts.nextLevelBtn)
            : h("button", { className: "btn", onClick: initGame }, CONFIG.texts.playAgain)
        )
    ),
    h(
      "div",
      { className: "touch-controls" },
      h("div", { className: "tc-row" },
        h("button", { className: "tc-btn", onClick: () => setWant("up") }, "▲")
      ),
      h("div", { className: "tc-row" },
        h("button", { className: "tc-btn", onClick: () => setWant("left") }, "◀"),
        h("button", { className: "tc-btn", onClick: () => setWant("down") }, "▼"),
        h("button", { className: "tc-btn", onClick: () => setWant("right") }, "▶")
      )
    ),
    h("p", { className: "hint" }, CONFIG.texts.hint)
  );
}

function App() {
  const [tab, setTab] = useState("juego");
  // aplica CONFIG.colors.accent al borde/glow del canvas y a los
  // botones tactiles (variable --blue en style.css), sin tocar el CSS
  useEffect(() => {
    document.documentElement.style.setProperty("--blue", CONFIG.colors.accent);
  }, []);
  return h(
    "div",
    { className: "app" },
    h(
      "header",
      { className: "app-header" },
      h("h1", null, CONFIG.texts.title),
      h("p", { className: "subtitle" }, CONFIG.texts.subtitle)
    ),
    h(
      "nav",
      { className: "tabs" },
      h("button", { className: "tab" + (tab === "juego" ? " active" : ""), onClick: () => setTab("juego") }, CONFIG.texts.tabGame),
      h("button", { className: "tab" + (tab === "avatar" ? " active" : ""), onClick: () => setTab("avatar") }, CONFIG.texts.tabAvatar)
    ),
    h("main", null, tab === "juego" ? h(PacmanGame) : h(AvatarView)),
    h("footer", { className: "app-footer" }, CONFIG.texts.footer)
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(h(App));