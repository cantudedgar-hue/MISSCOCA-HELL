# Coca · Pac

Mini-app en React (sin paso de compilación) con dos secciones:

- **🎨 Avatar** — un retrato pixel art estilizado (audífonos, lentes, playera gris, pose selfie).
- **🕹 Juego** — un Pac-Man jugable donde la comida son botellas de coca en pixel art y los tres fantasmas son versiones pixel art de **Hachiware**, **Chiikawa** y **Usagi**. Cómete una coca grande para volverlos vulnerables y comértelos tú.

Controles: flechas / WASD en escritorio, botones táctiles en celular.

## Cómo funciona técnicamente

- `index.html` — carga React, ReactDOM y Babel Standalone directo desde CDN (unpkg). No hay `npm install` ni build: es 100% estático.
- `sprites.js` — todo el pixel art (botella de coca, los 3 fantasmas, el avatar) definido como rectángulos sobre una cuadrícula, dibujados en `<canvas>` sin anti-aliasing.
- `app.js` — la app de React: el laberinto, el loop del juego, la IA simple de los fantasmas y el render en canvas.
- `style.css` — estética retro arcade.

## Publicarlo en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `coca-pacman`).
2. Sube estos 4 archivos (`index.html`, `style.css`, `sprites.js`, `app.js`) a la raíz del repo:

   ```bash
   cd coca-pacman
   git init
   git add .
   git commit -m "Coca Pac: avatar pixel art + pacman"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/coca-pacman.git
   git push -u origin main
   ```

3. En GitHub, entra a **Settings → Pages**.
4. En "Build and deployment", selecciona **Source: Deploy from a branch**.
5. Elige la rama `main` y la carpeta `/ (root)`, luego **Save**.
6. Espera 1-2 minutos: tu app quedará en `https://TU-USUARIO.github.io/coca-pacman/`.

No necesitas Node, Vite ni ningún build — al ser scripts cargados directo con `<script type="text/babel">`, funciona tal cual en GitHub Pages.

## Personalizarlo

- Ajusta el laberinto editando el arreglo `MAZE_ROWS` en `app.js` (cada fila es un string; `#`=pared, `.`=coca, `o`=coca grande, espacio=camino libre).
- Cambia colores globales en `PALETTE` dentro de `sprites.js`.
- Los sprites (avatar, fantasmas, botella) son listas de rectángulos `{x,y,w,h,c}` — mueve, agranda o cambia de color cualquier bloque para ajustar el diseño.