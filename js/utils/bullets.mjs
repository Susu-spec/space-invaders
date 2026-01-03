/**
 * @file utils/bullets.mjs
 * @game Space Invaders
 * @author Suwayba
 * @date 2025-05-27
 * 
 * @description 
 * Core logic for bullet class definitions. 
 * Handles all bullet functionalities including
 * movement, and rendering
 */

import { Assets } from "./assets.mjs";
import { CANVAS_HEIGHT } from "./constants.mjs";
import AnimatedGameEntity from "./game-entity.mjs";
import { clamp } from "./helpers.mjs";

const { images, clipRect } = Assets;

/**
 * Class representing bullet
 * 
 * @class
 */

export class Bullet extends AnimatedGameEntity {
  constructor(ctx, img, x, y, direction, speed) {
    /**
     * Creates a new Bullet
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas context initialised at entry point file (main.mjs)
     * @param {HTMLImageElement} img - Image element to visually render bullet object
     * @param {number} x - Horizontal point on canvas to draw alien, drawn from the top vertex
     * @param {number} y - Vertical point on canvas to draw alien, drawn from the left vertex
     * @param {number} direction - Direction bullet will move in
     * @param {number} speed - Speed at which bullet moves
     */
    super(img, x, y, clipRect.bullet);
    this.ctx = ctx;
    this.clipRect.width = this.img.width;
    this.clipRect.height = this.img.height;
    this.direction = direction;
    this.speed = speed;
    this.alive = true;
  }

  movement(dt) {
    this.position.y -= (this.direction * this.speed) * dt;
    this.position.y = clamp(this.position.y, 0, CANVAS_HEIGHT() - this.clipRect.height)
    if (this.position.y <= 0) {
      this.alive = false;
    }
    this.updateBounding();
  }

  drawEntityOnCanvas() {
    this.ctx.drawImage(this.img, this.position.x, this.position.y, this.clipRect.width, this.clipRect.height);
  }
}

export class Laser extends Bullet {
  constructor(ctx, x, y, direction, speed) {
    super(ctx, images.laser, x, y, direction, speed);
  }

  movement(dt) {
    this.position.y -= (this.direction * this.speed) * dt;
    if (this.position.y >= CANVAS_HEIGHT()) {
      this.alive = false;
    }
    this.updateBounding();
  }
}