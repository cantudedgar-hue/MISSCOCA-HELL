const h = React.createElement;
const { useState, useEffect, useRef, useCallback } = React;

// ============================================================
// MAZE
// # pared · . coca (comida) · o coca grande (power pellet)
// espacio = camino libre sin comida (casa de fantasmas)
// ============================================================
const MAZE_ROWS = [
  "###############",
  "#......#......#",
  "#.####.#.####.#",
  "#o####.#.####o#",
  "#.............#",
  "#.###.#.#.###.#",
  "#.....#.#.....#",
  "#....##.##....#",
  "#....     ....#",
  "#....##.##....#",
  "#.....#.#.....#",
  "#.###.#.#.###.#",
  "#.............#",
  "#o####.#.####o#",
  "#.####.#.####.#",
  "#......#......#",
  "###############",
];
const ROWS = MAZE_ROWS.length;
const COLS = MAZE_ROWS[0].length;
const PLAYER_START = { r: 12, c: 7 };
const GHOST_START = [
  { r: 8, c: 6 },
  { r: 8, c: 7 },
  { r: 8, c: 8 },
];
const GHOST_DEFS = [
  { name: "Hachiware", sprite: HACHIWARE },
  { name: "Chiikawa", sprite: CHIIKAWA },
  { name: "Usagi", sprite: USAGI },
];

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
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  return grid[r][c] !== "#";
}

const DIRS = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

const TILE = 26;
const STEP_MS = 165;
const FRIGHT_MS = 7000;

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
      "Retrato pixel art 1"
    )
  );
}

function PacmanGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [ui, setUi] = useState({ score: 0, lives: 3, status: "ready" }); // ready | playing | won | lost

  const initGame = useCallback(() => {
    const { grid, dotsLeft } = parseMaze();
    stateRef.current = {
      grid,
      dotsLeft,
      score: 0,
      lives: 3,
      player: { r: PLAYER_START.r, c: PLAYER_START.c, dir: "left", want: "left" },
      ghosts: GHOST_START.map((g, i) => ({
        r: g.r,
        c: g.c,
        dir: "up",
        def: GHOST_DEFS[i],
        alive: true,
        frightUntil: 0,
      })),
      frightTimer: 0,
      status: "playing",
      mouthOpen: true,
    };
    setUi({ score: 0, lives: 3, status: "playing" });
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

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

  // --- loop de movimiento (grid-based, con tick fijo) ---
  useEffect(() => {
    const tick = () => {
      const s = stateRef.current;
      if (!s || s.status !== "playing") return;
      s.mouthOpen = !s.mouthOpen;

      // jugador: intenta girar hacia la dirección deseada, si no, sigue
      const p = s.player;
      const tryDir = DIRS[p.want];
      if (tryDir && isWalkable(s.grid, p.r + tryDir.dr, p.c + tryDir.dc)) {
        p.dir = p.want;
      }
      const move = DIRS[p.dir];
      if (move && isWalkable(s.grid, p.r + move.dr, p.c + move.dc)) {
        p.r += move.dr;
        p.c += move.dc;
      }
      // wraparound horizontal
      if (p.c < 0) p.c = COLS - 1;
      if (p.c >= COLS) p.c = 0;

      // comer
      const cell = s.grid[p.r][p.c];
      if (cell === "." ) {
        s.grid[p.r][p.c] = " ";
        s.score += 10;
        s.dotsLeft--;
      } else if (cell === "o") {
        s.grid[p.r][p.c] = " ";
        s.score += 50;
        s.dotsLeft--;
        s.frightTimer = Date.now() + FRIGHT_MS;
        s.ghosts.forEach((g) => { if (g.alive) g.frightUntil = s.frightTimer; });
      }

      // fantasmas
      const frightened = Date.now() < s.frightTimer;
      s.ghosts.forEach((g) => {
        if (!g.alive) {
          // regresar a la casa y reaparecer
          if (g.r === GHOST_START[0].r && Math.abs(g.c - GHOST_START[1].c) <= 1) {
            g.alive = true;
            g.frightUntil = 0;
            return;
          }
          const target = GHOST_START[1];
          const dr = Math.sign(target.r - g.r);
          const dc = Math.sign(target.c - g.c);
          if (dr !== 0 && isWalkable(s.grid, g.r + dr, g.c)) g.r += dr;
          else if (dc !== 0 && isWalkable(s.grid, g.r, g.c + dc)) g.c += dc;
          return;
        }
        const options = Object.keys(DIRS).filter((d) => {
          const m = DIRS[d];
          return (
            isWalkable(s.grid, g.r + m.dr, g.c + m.dc) &&
            d !== OPPOSITE[g.dir]
          );
        });
        const pool = options.length ? options : Object.keys(DIRS).filter((d) =>
          isWalkable(s.grid, g.r + DIRS[d].dr, g.c + DIRS[d].dc)
        );
        if (pool.length) {
          const isFright = Date.now() < g.frightUntil;
          let chosen;
          if (Math.random() < 0.65) {
            // moverse hacia (o lejos, si asustado) del jugador
            let best = pool[0];
            let bestScore = -Infinity;
            for (const d of pool) {
              const m = DIRS[d];
              const nr = g.r + m.dr, nc = g.c + m.dc;
              let dist = Math.abs(nr - p.r) + Math.abs(nc - p.c);
              if (isFright) dist = -dist;
              const score = -dist;
              if (score > bestScore) { bestScore = score; best = d; }
            }
            chosen = best;
          } else {
            chosen = pool[Math.floor(Math.random() * pool.length)];
          }
          g.dir = chosen;
          g.r += DIRS[chosen].dr;
          g.c += DIRS[chosen].dc;
        }
        if (g.c < 0) g.c = COLS - 1;
        if (g.c >= COLS) g.c = 0;
      });

      // colisiones
      for (const g of s.ghosts) {
        if (g.r === p.r && g.c === p.c) {
          const isFright = Date.now() < g.frightUntil && g.alive;
          if (isFright) {
            g.alive = false;
            s.score += 200;
          } else if (g.alive) {
            s.lives -= 1;
            if (s.lives <= 0) {
              s.status = "lost";
            } else {
              p.r = PLAYER_START.r; p.c = PLAYER_START.c; p.dir = "left"; p.want = "left";
              s.ghosts.forEach((gg, i) => { gg.r = GHOST_START[i].r; gg.c = GHOST_START[i].c; gg.alive = true; gg.frightUntil = 0; });
            }
          }
        }
      }
      if (s.dotsLeft <= 0) s.status = "won";

      setUi({ score: s.score, lives: s.lives, status: s.status });
    };
    const id = setInterval(tick, STEP_MS);
    return () => clearInterval(id);
  }, []);

  // --- render ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = COLS * TILE;
    canvas.height = ROWS * TILE;
    let raf;
    const draw = () => {
      const s = stateRef.current;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#0c0d14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (s) {
        // paredes
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const cell = s.grid[r][c];
            if (cell === "#") {
              ctx.fillStyle = "#1c3fae";
              ctx.fillRect(c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4);
              ctx.fillStyle = "#3a63e8";
              ctx.fillRect(c * TILE + 2, r * TILE + 2, TILE - 4, 3);
            }
          }
        }
        // dibujar cocas (comida) con tamaño fijo prolijo
        const dotPx = Math.max(2, Math.floor(TILE / 8));
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
              const bigPx = dotPx * 1.7;
              drawSprite(
                ctx, COKE_BOTTLE,
                c * TILE + (TILE - COKE_W * bigPx) / 2,
                r * TILE + (TILE - COKE_H * bigPx) / 2,
                bigPx
              );
            }
          }
        }
        // fantasmas
        const ghostPx = TILE / GHOST_W * 0.95;
        s.ghosts.forEach((g) => {
          if (!g.alive) return;
          const isFright = Date.now() < g.frightUntil;
          ctx.save();
          if (isFright) ctx.globalAlpha = 0.65;
          drawSprite(
            ctx,
            isFright ? ghostBody("blueD").concat(eyes) : g.def.sprite,
            g.c * TILE + (TILE - GHOST_W * ghostPx) / 2,
            g.r * TILE + (TILE - GHOST_W * ghostPx) / 2 - GHOST_YOFF * ghostPx * 0.4,
            ghostPx
          );
          ctx.restore();
        });
        // jugador (pac-man clásico redondo)
        const p = s.player;
        const cx = p.c * TILE + TILE / 2;
        const cy = p.r * TILE + TILE / 2;
        const rad = TILE * 0.42;
        const angles = {
          right: 0, down: 90, left: 180, up: 270,
        };
        const baseAngle = (angles[p.dir] || 0) * Math.PI / 180;
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
      h("div", { className: "hud-item" }, "Puntos: ", h("b", null, ui.score)),
      h("div", { className: "hud-item" }, "Vidas: ", h("b", null, "🥤".repeat(Math.max(ui.lives, 0)))),
    ),
    h(
      "div",
      { className: "canvas-shell" },
      h("canvas", { ref: canvasRef, className: "game-canvas" }),
      (status === "won" || status === "lost") &&
        h(
          "div",
          { className: "overlay" },
          h("p", { className: "overlay-title" }, status === "won" ? "¡Ganaste! 🥤" : "Te atraparon"),
          h("p", null, "Puntos finales: " + ui.score),
          h("button", { className: "btn", onClick: initGame }, "Jugar de nuevo")
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
    h("p", { className: "hint" }, "Usa las flechas / WASD o los botones. Come todas las cocas evitando a Hachiware, Chiikawa y Usagi — o cómetelos tú cuando tomes una coca grande.")
  );
}

function App() {
  const [tab, setTab] = useState("juego");
  return h(
    "div",
    { className: "app" },
    h(
      "header",
      { className: "app-header" },
      h("h1", null, "COCA · PAC"),
      h("p", { className: "subtitle" }, "avatar pixel art + pac-man con fantasmas de chiikawa")
    ),
    h(
      "nav",
      { className: "tabs" },
      h("button", { className: "tab" + (tab === "juego" ? " active" : ""), onClick: () => setTab("juego") }, "🕹 Juego"),
      h("button", { className: "tab" + (tab === "avatar" ? " active" : ""), onClick: () => setTab("avatar") }, "🎨 Avatar")
    ),
    h("main", null, tab === "juego" ? h(PacmanGame) : h(AvatarView)),
    h("footer", { className: "app-footer" }, "hecho con React · listo para GitHub Pages")
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(h(App));
