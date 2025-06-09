/**
 * @file utils/player.mjs
 * @game Space Invaders
 * @author Suwayba
 * @date 2025-05-27
 * 
 * @description 
 * Core logic for player class definitions. 
 * Handles all player functionalities including
 * movement, shooting, and rendering
 */

import AnimatedGameEntity from "./game-entity.mjs";
import { clamp } from "./helpers.mjs";
import { Assets } from "./assets.mjs";
import { keys, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./constants.mjs";
import { Bullet } from "./bullets.mjs";

const { images, clipRect } = Assets;


/**
 * Class representing player
 * 
 * @class
 */

export class Player extends AnimatedGameEntity {
  /**
   * Creates a new Player
   * 
   * @param {HTMLImageElement} img -  The image to show when a player is rendered
   * @param {CanvasRenderingContext2D} ctx - Canvas context initialized at entry file
   */
  constructor(img, ctx) {
    super(img, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - (clipRect.player.height / 2) - 10, clipRect.player)
    this.ctx = ctx;
    this.img = img;
    this.clipRect.width = this.img.width;
    this.clipRect.height = this.img.height;
    this.xAccel = 300;
    this.lives = 3;
    this.score = 0;
    this.bullets = [];
    this.lastShotTime = 0;
    this.dying = false;
    this.deathTimer = 0.5;
    this.invincible = false;
    this.invincibleTimer = 0;
  }

  reset() {
    this.lives = 3;
    this.score = 0;
    this.position.set(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - (clipRect.player.height / 2) - 10);
    this.bullets = []
    this.img = images.player;
  }

  movement(dt) {
    if (this.dying) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.dying = false;
        this.img = images.player;
      }
      return;
    }

    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.invincibleTimer = 0;
      }
    }

    this.position.x = clamp(this.position.x, 50, LOGICAL_WIDTH - this.img.width);

    if (keys['ArrowLeft']) {
      this.position.x -= this.xAccel * dt
    } else if (keys['ArrowRight']) {
      this.position.x += this.xAccel * dt
    }

    this.updateBounding();
  }

  shoot() {
    const bullet = new Bullet(this.ctx, images.bullet, this.position.x + (this.clipRect.width / 2) - (clipRect.bullet.width / 2), this.position.y, 1, 1000);
    this.bullets.push(bullet);
  }

  drawEntityOnCanvas() {
    this.ctx.save();
    this.ctx.shadowColor = '#6F4E37';
    this.ctx.shadowBlur = 15;
    this.ctx.drawImage(this.img, this.position.x, this.position.y, this.clipRect.width, this.clipRect.height);
    this.ctx.restore();


    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    const gradient = this.ctx.createLinearGradient(this.position.x, this.position.y, this.position.x + 20, this.position.y + 20);
    gradient.addColorStop(0, '#6F4E37');
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(this.position.x, this.position.y, this.clipRect.width, this.clipRect.height);
    this.ctx.restore();
  }

  updateBullets(dt) {
    for (let bullet of this.bullets) {
      bullet.movement(dt);
    }
    this.bullets = this.bullets.filter(b => b.alive);
  }

  drawBullets() {
    for (let bullet of this.bullets) {
      if (bullet.alive) {
        bullet.drawEntityOnCanvas();
      }
    }
  }
}