/* Adapted from HOOPS '88 game.js (shootBall, updateShooter, handleRimCollision,
 * checkScore). Copyright (c) 2026 Carlos Sardo and Eduardo Sardo. MIT: LICENSE.
 * Changes: fixed court, five-shot round, swept scoring and fixed-step integration.
 * https://github.com/CarlosSardo/hoops88 */
export const court = { width: 480, height: 540, floor: 490, radius: 18, hoopX: 340, hoopY: 170, rimW: 90 };
export type Ball = { x: number; y: number; vx: number; vy: number; scored: boolean; age: number; done: boolean };
export function launch(power: number, degrees = 65): Ball {
  const speed = 320 + (1500 - 320) * Math.max(0, Math.min(1, power));
  const angle = degrees * Math.PI / 180;
  return { x: 80, y: 420, vx: Math.cos(angle) * speed, vy: -Math.sin(angle) * speed, scored: false, age: 0, done: false };
}
export function stepBall(ball: Ball, dt: number) {
  if (ball.done) return;
  const r = court.radius, hx = court.hoopX, hy = court.hoopY, half = court.rimW / 2;
  const oldX = ball.x, oldY = ball.y;
  ball.age += dt;
  ball.vy += 1500 * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  if (ball.x < r) { ball.x = r; ball.vx *= -0.6; }
  if (ball.x > court.width - r) { ball.x = court.width - r; ball.vx *= -0.6; }
  for (const postX of [hx - half, hx + half]) {
    const dx = ball.x - postX, dy = ball.y - hy, dist = Math.hypot(dx, dy), min = r + 5;
    if (dist < min && dist > 0) {
      const nx = dx / dist, ny = dy / dist;
      ball.x += nx * (min - dist); ball.y += ny * (min - dist);
      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx = (ball.vx - 2 * dot * nx) * 0.62;
      ball.vy = (ball.vy - 2 * dot * ny) * 0.62;
    }
  }
  const boardX = hx + half + 6;
  if (ball.x + r > boardX && ball.x < boardX + 14 && ball.y > hy - 110 && ball.y < hy && ball.vx > 0) {
    ball.x = boardX - r; ball.vx *= -0.55;
  }
  if (!ball.scored && ball.vy > 0 && oldY <= hy && ball.y > hy) {
    const crossingX = oldX + (ball.x - oldX) * (hy - oldY) / (ball.y - oldY);
    if (crossingX > hx - half + 4 && crossingX < hx + half - 4) { ball.scored = true; ball.vx *= 0.3; }
  }
  if (ball.y >= court.floor - r || ball.age >= 5) ball.done = true;
}
