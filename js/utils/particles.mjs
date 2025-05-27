/**
 * @file utils/particles.mjs
 * @game Space Invaders
 * @author Suwayba
 * @date 2025-05-27
 * 
 * @description 
 * Core logic for particle class definitions. 
 * Handles all particle functionalities including
 * explosion, and rendering
 */

/**
 * Class representing particle
 * 
 * @class
 */

export class Particle {
    /**
     * Creates a new particle
     * 
     * @param {number} x - Horizontal point to render particle
     * @param {number} y - Vertical point to render particle
     */

    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.alpha = 1;
        this.size = Math.random() * 3 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.02;
    }

    draw(ctx) {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isAlive() {
        return this.alpha > 0;
    }
}

/**
 * Class representing array of particles
 * 
 * @class
 */

export class Particles {

    constructor() {
        this.particles = [];
    }

    createExplosion(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(x, y));
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(p => p.isAlive());
        for (let p of this.particles) {
            p.update();
        }
    }

    drawParticles(ctx) {
        for (let p of this.particles) {
            p.draw(ctx);
        }
    }
}
