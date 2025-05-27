/**
 * @file utils/alien.mjs
 * @game Space Invaders
 * @author Suwayba
 * @date 2025-05-27
 * 
 * @description 
 * Core logic for alien class definitions. 
 * Handles all alien functionalities including
 * movement, shooting, and rendering
 */

import { ALIEN_IMAGES, ALIEN_POINTS } from "./assets.mjs";
import AnimatedGameEntity, { Position } from "./game-entity.mjs";
import { Assets } from "./assets.mjs";
import { CANVAS_WIDTH } from "./constants.mjs";
import { Laser } from "./bullets.mjs";

const { sounds, clipRect } = Assets;

/**
 * Class representing alien
 * 
 * @class
 */

export class Alien extends AnimatedGameEntity {
    /**
     * Creates a new Alien
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas context initialised at entry point file (main.mjs)
     * @param {HTMLImageElement} img - Image element to visually render alien object
     * @param {number} x - Horizontal point on canvas to draw alien, drawn from the top vertex
     * @param {number} y - Vertical point on canvas to draw alien, drawn from the left vertex
     * @param {number} points - Points to update Player score by
     */

    constructor(ctx, img, x, y, points) {
        super(img, x, y, points, clipRect.alien)
        this.ctx = ctx;
        this.clipRect = clipRect.alien;
        this.alive = true;
        this.points = points;
        this.dying = false;
        this.deathTimer = 0.2;
        this.lastShotTime = 0;
        this.shootCoolDown = Math.random() * 2000 + 1000;
    }

    shoot(game) {
        const laserX = this.position.x + clipRect.alien.width / 2;
        const laserY = this.position.y + clipRect.alien.height;
        const laser = new Laser(this.ctx, laserX, laserY, -1, 800);
        game.alienLasers.push(laser);
    }

    drawEntityOnCanvas() {
        this.ctx.drawImage(
            this.img, 
            this.position.x, 
            this.position.y, 
            this.clipRect.width, 
            this.clipRect.height
        );
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.globalAlpha = 0.01;
        this.ctx.restore();
    }
}

/**
 * Class representing alien grid
 * 
 * @class
 */

export class AlienGrid {
    /**
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas context initialized in entry point file (main.mjs)
     * @param {number} x - Horizontal point on canvas to draw group of aliens, drawn from the top vertex
     * @param {number} y - Vertical point on canvas to draw group of aliens, drawn from the top vertex
     * @param {number} rows - Number of rows occupied by aliens
     * @param {number} cols - Number of columns occupied by aliens
     */
    constructor(ctx, x, y, rows, cols) {
        this.ctx = ctx;
        this.aliens = [];
        this.position = new Position(x, y + 10)
        this.rows = rows;
        this.cols = cols;
        this.spacing = 35;
        this.direction = 1;
        this.speed = 20;
        this.stepDown = 10;
        this.createGrid();
    }

    createGrid() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = this.position.x + col * this.spacing;
                const y = this.position.y + row * this.spacing;
                const img = ALIEN_IMAGES[row % ALIEN_IMAGES.length];
                const points = ALIEN_POINTS[row % ALIEN_POINTS.length];

                this.aliens.push(new Alien(this.ctx, img, x, y, points));

            }
        }
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    updateSpacing(spacing) {
        this.spacing = spacing;
        for (let i = 0; i < this.aliens.length; i++) {
            const row = Math.floor(i / this.cols);
            const col = i % this.cols;
            this.aliens[i].position.x = this.position.x + col * this.spacing;
                
        }
    }

    updateShooting(currentTime, dt, game) {
        var columnAliens = null;
        for (let col = 0; col < this.cols; col++) {
            columnAliens = this.aliens.filter(alien =>
            Math.round((alien.position.x - this.position.x) / this.spacing) === col && alien.alive
            )

            const shooter = columnAliens.sort((a, b) => b.position.y - a.position.y)[0]
            const randomiser = (this.currentLevel > 1) ? 0.01 : 0.001;

            if (shooter && 
                ((currentTime - shooter.lastShotTime) > shooter.shootCoolDown) && 
                Math.random() < randomiser
            ) {
                shooter.shoot(game);
                shooter.lastShotTime = currentTime;
                shooter.shootCoolDown = Math.random() * 2000 + 1000;
            }
        }

        for (let laser of game.alienLasers) {
            laser.movement(dt);
        }
    }

    update(currentTime, dt, game) {
        let xVelocity = this.speed * this.direction * dt;
        let shouldStepDown = false;


        for (let alien of this.aliens) {
            if (alien.alive === false) continue;

            const nextXPosition = alien.position.x + xVelocity;

            if (nextXPosition <= 50 || nextXPosition + (alien.img.width >= CANVAS_WIDTH - 50)) {
                shouldStepDown = true;
                this.direction *= -1;
                break;
            }
        }

        for (let alien of this.aliens) {
            if (alien.alive === false) continue;

            if (alien.dying) {
                alien.deathTimer -= dt;
                if (alien.deathTimer <= 0) {
                    game.particles.createExplosion(alien.position.x, alien.position.y);
                    sounds.invaderDead.currentTime = 0;
                    sounds.invaderDead.play();
                    alien.alive = false;
                    alien.dying = false;
                }
            }


            if (shouldStepDown) {
                alien.position.y += this.stepDown;
            } else {
                alien.position.x += xVelocity;
            }
        }

        this.updateShooting(currentTime, dt, game);

    }

    drawAliensOnCanvas() {
        for (let alien of this.aliens) {
            if (alien.alive) {
                alien.updateBounding();
                alien.drawEntityOnCanvas();
            }
        }
    }
}
