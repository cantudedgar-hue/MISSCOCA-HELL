// ============================================================
// sprites.js — pixel art definido como rectángulos sobre una
// cuadrícula. Cada sprite es una lista de {x,y,w,h,c} donde
// x,y,w,h están en "pixeles de cuadrícula" y c es una clave de
// PALETTE. drawSprite() los pinta sin antialiasing para lograr
// el look retro de pixel art.
// ============================================================

const PALETTE = {
  black:   "#1a1410",
  outline: "#2b1d14",
  brown:   "#5c3317",
  brownD:  "#3e2210",
  red:     "#e3242b",
  redD:    "#a8161c",
  white:   "#ffffff",
  cream:   "#f6e9c9",
  creamD:  "#e3cfa0",
  pink:    "#f6b6c8",
  pinkD:   "#e08fa8",
  blue:    "#7fb4d9",
  blueD:   "#537fa3",
  gray:    "#eef1f3",
  grayD:   "#c7ccd1",
  ink:     "#232323",
  skin:    "#e8b88a",
  skinD:   "#c99666",
  hair:    "#241a14",
  hairD:   "#140d09",
  shirt:   "#8b8f94",
  shirtD:  "#6d7176",
  phone:   "#2a2d33",
  lens:    "#dfeaf0",
  yellow:  "#f5dd8c",
  yellowD: "#e0c268",
};

function mirror(rects, totalWidth) {
  const flipped = rects.map(r => ({ ...r, x: totalWidth - r.x - r.w }));
  return rects.concat(flipped);
}

// ---------- botella de coca (comida) ----------
// grid 7x10 — silueta simple y sin ahusar, para que se lea bien
// incluso a tamaño chico (nada de cono, solo tapa + cuerpo + franja)
const COKE_BOTTLE = [
  { x: 2, y: 0, w: 3, h: 2, c: "red" },
  { x: 2, y: 2, w: 3, h: 2, c: "brown" },
  { x: 0, y: 4, w: 7, h: 5, c: "brown" },
  { x: 0, y: 4, w: 7, h: 1, c: "red" },
  { x: 0, y: 7, w: 7, h: 1, c: "white" },
  { x: 0, y: 9, w: 7, h: 1, c: "outline" },
];
const COKE_W = 7, COKE_H = 10;

// ---------- forma base de fantasma (14 de ancho), estilo redondo
// con falda ondulada, compartida por los 3 personajes ----------
function ghostBody(bodyColor) {
  return [
    { x: 5, y: 0, w: 4, h: 1, c: bodyColor },
    { x: 3, y: 1, w: 8, h: 1, c: bodyColor },
    { x: 2, y: 2, w: 10, h: 1, c: bodyColor },
    { x: 1, y: 3, w: 12, h: 1, c: bodyColor },
    { x: 0, y: 4, w: 14, h: 5, c: bodyColor },
    { x: 0, y: 9, w: 2, h: 1, c: bodyColor },
    { x: 3, y: 9, w: 2, h: 1, c: bodyColor },
    { x: 6, y: 9, w: 2, h: 1, c: bodyColor },
    { x: 9, y: 9, w: 2, h: 1, c: bodyColor },
    { x: 12, y: 9, w: 2, h: 1, c: bodyColor },
  ];
}
// ojos sueltos (se reutilizan para el estado "asustado" y para los
// ojitos que regresan a casa cuando comen a un fantasma)
const eyes = [
  { x: 4, y: 5, w: 2, h: 3, c: "ink" },
  { x: 8, y: 5, w: 2, h: 3, c: "ink" },
  { x: 4, y: 5, w: 1, h: 1, c: "white" },
  { x: 8, y: 5, w: 1, h: 1, c: "white" },
];

// cara "kawaii" compartida: ojitos redondos y oscuros, sonrisa
// suave y mejillas grandes — igual para los 3 personajes, así se
// nota que son familia, y solo cambian orejas + color de cuerpo
function kawaiiFace() {
  return [
    ...eyes,
    // mejillas grandes y redondas
    { x: 1, y: 7, w: 3, h: 2, c: "pink" },
    { x: 10, y: 7, w: 3, h: 2, c: "pink" },
    // sonrisa pequeña
    { x: 6, y: 8, w: 1, h: 1, c: "outline" },
    { x: 7, y: 8, w: 1, h: 1, c: "outline" },
  ];
}

// ---------- enemigos: ahora son imagenes PNG reales (el pixel art
// que hiciste tú), no rects generados por codigo. Se cargan una sola
// vez aqui y se dibujan con ctx.drawImage() en app.js. El navegador
// las muestra "pixeladas" gracias a ctx.imageSmoothingEnabled=false
// (ver draw() en app.js) y a image-rendering:pixelated en el CSS. ----------
// las rutas viven en config.js (CONFIG.enemyImages) — cambia ahi,
// no aqui, si quieres poner tus propios PNG
const ENEMY_IMAGES = {};
for (const key in CONFIG.enemyImages) {
  const img = new Image();
  img.src = CONFIG.enemyImages[key];
  ENEMY_IMAGES[key] = img;
}

// se conservan para el modo "asustado" (ghostBody("blueD")+eyes) y
// los ojitos que regresan a casa, que siguen siendo pixel art por
// codigo ya que no hay una imagen para esos estados.
const GHOST_W = 14, GHOST_H = 10, GHOST_YOFF = 7; // reservar espacio para orejas arriba

// ---------- Pac player: círculo clásico dibujado con arc(), no
// grid — se ve mejor redondo contra el resto del pixel art ----------

// ---------- avatar pixelado (retrato estilizado, look "selfie") ----------
// grid 22 x 28
const AV_W = 22, AV_H = 28;
const AVATAR = [
  // cabello (masa detrás de la cabeza)
  { x: 4, y: 2, w: 14, h: 6, c: "hair" },
  { x: 3, y: 4, w: 2, h: 14, c: "hair" },
  { x: 17, y: 4, w: 2, h: 14, c: "hair" },
  { x: 4, y: 14, w: 2, h: 10, c: "hairD" },   // mechón largo lado izq.
  { x: 16, y: 14, w: 2, h: 8, c: "hairD" },   // mechón lado der.
  // cara
  { x: 6, y: 6, w: 10, h: 10, c: "skin" },
  { x: 6, y: 14, w: 10, h: 2, c: "skinD" },
  // flequillo
  { x: 6, y: 4, w: 10, h: 2, c: "hair" },
  { x: 9, y: 6, w: 1, h: 1, c: "hairD" },
  { x: 12, y: 6, w: 1, h: 1, c: "hairD" },
  // lentes
  { x: 6, y: 9, w: 4, h: 3, c: "ink" },
  { x: 12, y: 9, w: 4, h: 3, c: "ink" },
  { x: 7, y: 10, w: 2, h: 1, c: "lens" },
  { x: 13, y: 10, w: 2, h: 1, c: "lens" },
  { x: 10, y: 10, w: 2, h: 1, c: "ink" },
  // boca
  { x: 10, y: 13, w: 2, h: 1, c: "redD" },
  // audífonos (diadema + orejeras)
  { x: 5, y: 1, w: 12, h: 1, c: "black" },
  { x: 3, y: 2, w: 2, h: 1, c: "black" },
  { x: 17, y: 2, w: 2, h: 1, c: "black" },
  { x: 2, y: 7, w: 3, h: 5, c: "black" },
  { x: 17, y: 7, w: 3, h: 5, c: "black" },
  { x: 3, y: 8, w: 1, h: 3, c: "grayD" },
  { x: 18, y: 8, w: 1, h: 3, c: "grayD" },
  // playera gris
  { x: 3, y: 18, w: 16, h: 10, c: "shirt" },
  { x: 3, y: 18, w: 16, h: 2, c: "shirtD" },
  { x: 8, y: 21, w: 6, h: 4, c: "white" }, // logo abstracto en el pecho
  { x: 9, y: 23, w: 4, h: 1, c: "shirtD" },
  // brazo levantado sosteniendo el teléfono (pose selfie)
  { x: 15, y: 12, w: 3, h: 8, c: "skin" },
  { x: 15, y: 18, w: 3, h: 4, c: "shirt" },
  { x: 15, y: 6, w: 4, h: 6, c: "phone" },
  { x: 16, y: 7, w: 2, h: 4, c: "lens" },
];

function drawSprite(ctx, rects, ox, oy, px) {
  ctx.imageSmoothingEnabled = false;
  for (const r of rects) {
    ctx.fillStyle = PALETTE[r.c] || r.c;
    ctx.fillRect(
      Math.round(ox + r.x * px),
      Math.round(oy + r.y * px),
      Math.round(r.w * px),
      Math.round(r.h * px)
    );
  }
}