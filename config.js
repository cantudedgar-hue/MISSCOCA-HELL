// ============================================================
// config.js — TODO lo que vas a querer cambiar seguido vive aqui.
// Cambia una linea, guarda, recarga la pagina en el navegador.
// No hace falta tocar sprites.js ni app.js para lo de abajo.
// ============================================================

const CONFIG = {
  // ---------- textos que se ven en pantalla ----------
  texts: {
    title: "COCA · PAC",
    subtitle: "juego de react novato 2",
    tabGame: "🕹 Juego",
    tabAvatar: "🎨 Avatar",
    avatarCaption: "texto generico",
    hint: "Usa las flechas / WASD o los botones. Come todas las cocas evitando a Hachiware, Chiikawa y Usagi — el punto blanco grande los vuelve vulnerables por unos segundos para que tú te los comas.",
    wonTitle: "¡Ganaste! 🥤",
    lostTitle: "Te atraparon",
    levelCompleteTitle: "¡Nivel completado!",
    nextLevelBtn: "Siguiente nivel",
    playAgain: "Jugar de nuevo",
    footer: "miautastico",
    scoreLabel: "Puntos: ",
    livesLabel: "Vidas: ",
    levelLabel: "Nivel: ",
  },

  livesIcon: "🥤", // se repite una vez por vida en el HUD

  // ---------- colores del maze (paredes) ----------
  // wallFill/wallHighlight pintan los bloques de pared en el canvas.
  // accent controla el borde/glow alrededor del juego y el color de
  // los botones táctiles al presionarlos (variable --blue en CSS) —
  // se aplica solo, no hace falta tocar style.css.
  colors: {
    wallFill: "#1c3fae",
    wallHighlight: "#3a63e8",
    accent: "#3a63e8",
  },

  // ---------- imagenes de los enemigos ----------
  // ruta relativa a index.html, ej "assets/mi-fantasma.png".
  // si el archivo no existe o no carga, el juego cae de vuelta
  // solito al pixel-art por codigo (ghostBody), no se rompe nada.
  enemyImages: {
    hachiware: "assets/enemy-hachiware.png",
    chiikawa: "assets/enemy-chiikawa.png",
    usagi: "assets/enemy-usagi.png",
  },

  // ---------- sonidos cortos (efectos) ----------
  // ruta a un .mp3/.wav/.ogg, ej "assets/sfx/comer.mp3".
  // deja "" (vacio) para que esa accion no suene nada.
  sounds: {
    eatDot: "assets/sfx/hachiware-oi_FYOX2Q7.mp3",
    eatPower: "assets/sfx/chiikawa-car-honk.mp3",
    eatGhost: "assets/sfx/eat-ghost.mp3",
    death: "assets/sfx/chiikawa-usagi-huh.mp3",
    win: "assets/sfx/win.mp3",
  },
  soundVolume: 0.5, // 0.0 (mudo) a 1.0 (full)

  // ---------- musica de fondo ----------
  // ruta a un .mp3/.ogg (ej "assets/music/bgm.mp3"). deja "" para
  // no tener musica. loop=true la repite sin cortes.
  // OJO: los navegadores bloquean el autoplay con sonido hasta que
  // el usuario interactua con la pagina (un click, una tecla) — el
  // juego ya maneja eso solo, intenta sonar de una vez y si el
  // navegador lo bloquea, arranca en cuanto tocas una tecla/pantalla.
  // Hay un boton 🔊/🔇 en el HUD para silenciarla.
  music: {
    src: "/assets/sfx/uwawa.mp3",
    volume: 0.35,
    loop: true,
  },

  // ---------- niveles / mazes ----------
  // cada elemento es UN nivel. Se juegan en orden; al terminar las
  // cocas de un nivel pasas al siguiente, y al terminar el ultimo
  // ganas el juego. Puedes agregar, quitar o reordenar niveles aqui.
  //
  // formato de cada nivel:
  //   maze:        arreglo de strings, todas del MISMO largo.
  //                "#" pared | "." coca | "o" pastilla de poder
  //                " " (espacio) camino libre sin coca (casa de fantasmas)
  //                debe estar rodeado de "#" en el borde exterior.
  //   powerSpots:  lista de [fila, columna] donde poner una pastilla
  //                de poder ("o") encima del maze (normalmente las 4
  //                esquinas del camino exterior).
  //   playerStart: {r, c} — fila/columna donde arranca el jugador.
  //                debe caer sobre una celda que NO sea "#".
  //   ghostHome:   {r, c} — celda "casa" a la que regresan los
  //                fantasmas comidos (normalmente el centro del maze).
  //   ghostStart:  arreglo de 3 {r, c} — donde arrancan Hachiware,
  //                Chiikawa y Usagi, en ese orden.
  //
  // fila/columna empiezan en 0, arriba-izquierda. Puedes hacer un
  // maze de cualquier tamaño (no tiene que ser 19x21) siempre que
  // sea rectangular y todas las celdas de comida sean alcanzables
  // caminando desde playerStart.
  levels: [
    {
      // nivel 1 — el maze original
      maze: [
        "###################",
        "#.................#",
        "#.##.##.###.##.##.#",
        "#.#.....###.....#.#",
        "#.#.##.#####.##.#.#",
        "#.................#",
        "#.###.#######.###.#",
        "#...#.#######.#...#",
        "#.#.#..     ..#.#.#",
        "#.#.#####.#####.#.#",
        "#.####.     .####.#",
        "#.#.#####.#####.#.#",
        "#.#.#..     ..#.#.#",
        "#...#.#######.#...#",
        "#.###.#######.###.#",
        "#.................#",
        "#.#.##.#####.##.#.#",
        "#.#.....###.....#.#",
        "#.##.##.###.##.##.#",
        "#.................#",
        "###################",
      ],
      powerSpots: [[1, 1], [1, 17], [19, 1], [19, 17]],
      playerStart: { r: 15, c: 9 },
      ghostHome: { r: 10, c: 9 },
      ghostStart: [
        { r: 10, c: 8 },
        { r: 10, c: 9 },
        { r: 10, c: 10 },
      ],
    },
    {
      // nivel 2 — el mismo maze pero con un par de atajos abiertos
      // (ejemplo de como armar un nivel nuevo a partir de otro)
      maze: [
        "###################",
        "#.................#",
        "#.#..##.###.##..#.#",
        "#.#.....###.....#.#",
        "#.#.##.#####.##.#.#",
        "#.................#",
        "#.###.##.#.##.###.#",
        "#...#.#######.#...#",
        "#.#.#..     ..#.#.#",
        "#.#.#####.#####.#.#",
        "#.####.     .####.#",
        "#.#.#####.#####.#.#",
        "#.#.#..     ..#.#.#",
        "#...#.#######.#...#",
        "#.###.##.#.##.###.#",
        "#.................#",
        "#.#.##.#####.##.#.#",
        "#.#.....###.....#.#",
        "#.#..##.###.##..#.#",
        "#.................#",
        "###################",
      ],
      powerSpots: [[1, 1], [1, 17], [19, 1], [19, 17]],
      playerStart: { r: 15, c: 9 },
      ghostHome: { r: 10, c: 9 },
      ghostStart: [
        { r: 10, c: 8 },
        { r: 10, c: 9 },
        { r: 10, c: 10 },
      ],
    },
    // agrega aqui tus propios niveles copiando la forma de arriba
  ],

  // ---------- ajustes rapidos del juego ----------
  livesStart: 3,
  frightMs: 7000,        // cuanto dura el modo "vulnerable" de los fantasmas
  speedPlayer: 5.3,      // celdas por segundo
  speedGhost: 4.4,
  speedGhostFright: 2.7,
  speedGhostEaten: 7.5,
};

// reproduce un efecto de sonido de CONFIG.sounds por su nombre
// (ej playSound("eatDot")). si esta vacio o falla, no truena nada.
function playSound(key) {
  const src = CONFIG.sounds[key];
  if (!src) return;
  try {
    const audio = new Audio(src);
    audio.volume = CONFIG.soundVolume;
    audio.play().catch(() => {});
  } catch (e) {
    // ruta invalida o navegador sin soporte: se ignora en silencio
  }
}
