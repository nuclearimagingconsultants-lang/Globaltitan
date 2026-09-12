import "./style.css";
import { Game } from "./game/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#viewport");
const ui = document.querySelector<HTMLElement>("#ui");
if (!canvas || !ui) {
  throw new Error("Missing #viewport or #ui");
}

try {
  const game = new Game(canvas, ui);
  game.start();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  ui.innerHTML = `<div class="screen show"><div class="stack"><h3>Could not start</h3><p class="lead">${msg}</p></div></div>`;
  console.error(err);
}
