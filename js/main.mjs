import * as Utils from './utils.mjs';

const { clamp, handlePlayerBulletsAlienCollision, handleAliensPlayerCollision, triggerGameOver, handleAlienLasersPlayerCollision } = Utils;

const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;

const ZOOM_DURATION = 1;
const MAX_ZOOM = 1.5;

const gameOverScreen = document.getElementById('game-over-screen');
const scoreTracker = document.getElementById('score');
const playAgain = document.getElementById('play-again-link');
const startScreen = document.getElementById('start-screen');


let keys = {};
let gameStarted = false;

const createImage = (src) => {
  const img = new Image();
  img.src = src;
  return img;
}

const ALIEN_IMAGE_TYPE_5 = createImage('./assets/images/enemy-one-down.svg');
const ALIEN_IMAGE_TYPE_4 = createImage('./assets/images/enemy-two-down.svg');
const ALIEN_IMAGE_TYPE_3 = createImage('./assets/images/enemy-three-down.svg');
const ALIEN_IMAGE_TYPE_2 = createImage('./assets/images/enemy-three.svg');
const ALIEN_IMAGE_TYPE_1 = createImage('./assets/images/enemy-two.svg');

const ALIEN_IMAGES = [
  ALIEN_IMAGE_TYPE_5,
  ALIEN_IMAGE_TYPE_4,
  ALIEN_IMAGE_TYPE_3,
  ALIEN_IMAGE_TYPE_2,
  ALIEN_IMAGE_TYPE_1,
];


const ALIEN_POINTS = [50, 40, 30, 20, 10];


const Assets = {
  images: {
    player: createImage('./assets/images/player.svg'),
    bullet: createImage('./assets/images/player-projectile.svg'),
    laser: createImage('./assets/images/laser.svg'),
    playerDeath: createImage('./assets/images/player-death.svg'),
    enemyDeath: createImage('./assets/images/enemy-death.svg')
  },
  sounds: {
    shoot: new Audio('./assets/sounds/shoot.wav'),
    playerDead: new Audio('./assets/sounds/player-dead.wav'),
    invaderDead: new Audio('./assets/sounds/invader-killed.wav'),
    gameOverSound: new Audio('./assets/sounds/game-over.wav'),
    background: new Audio('./assets/sounds/space-invaders-background.mpeg')
  },
  clipRect: {
    player: { x: 0, y: 0, width: 50, height: 40 },
    alien: { x: 0, y: 0, width: 20, height: 20 },
    bullet: { x: 0, y: 0, width: 20, height: 20 }
  },
}

const { images, sounds, clipRect } = Assets;

const levels = [
  {
    id: 1,
    name: 'Beginner',
    speedMultiplier: 1,
    alienCount: 5,
    alienSpeed: 30,
    duration: 30,
    spacing: 35,
  },
  {
    id: 2,
    name: 'Intermediate',
    speedMultiplier: 1.5,
    alienCount: 8,
    alienSpeed: 50,
    spacing: 40,
  },
  {
    id: 3,
    name: 'Advanced',
    speedMultiplier: 2,
    alienCount: 12,
    alienSpeed: 80,
    spacing: 45,
  },
];



const GameStates = {
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver'
}

// needs pause and reset implementation

class Position {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  setNewPosition(x, y) {
    this.x = x;
    this.y = y;
  }
}

// Position + Size = Area
// Need to update this every time movement happens
// Need to know if the area of one object collides with another
class BoundingBox {
  constructor(x, y, width, height) {
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.width = width ?? 0;
    this.height = height ?? 0;
  }

  setNewBoundRect(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

class GameEntity {
  constructor(img, x, y) {
    this.img = img;
    this.position = new Position(x, y);
    this.scale = new Position(1, 1);
    this.bounding = new BoundingBox(x, y, this.img.width, this.img.height);
    this.needsBoundsUpdate = false;
  }

  setScale(x, y) {
    this.needsBoundsUpdate = true;
    this.scale.setNewPosition(x, y);
  }

  updateBounding() {
    this.bounding.setNewBoundRect(
      this.position.x,
      this.position.y,
      (this.clipRect.width * this.scale.x),
      (this.clipRect.height * this.scale.y)
    )
  }

  drawEntityOnCanvas() {
    ctx.drawImage(this.img, this.position.x, this.position.y)
  }

  drawEntityOnResize() {
    if (this.needsBoundsUpdate) {
      this.updateBounding();
      this.needsBoundsUpdate = false;
    }
    this.drawEntityOnCanvas();
  }
}

class AnimatedGameEntity extends GameEntity {
  constructor(entityImg, x, y, clipRect) {
    super(entityImg, x, y);
    this.clipRect = clipRect;
    this.updateBounding();
  }

  updateBounding() {
    const w = Math.round(this.clipRect.width * this.scale.x);
    const h = Math.round(this.clipRect.height * this.scale.y);

    this.bounding.setNewBoundRect((this.position.x - w / 2), (this.position.y - h / 2), w, h)
  }

  drawEntityOnCanvas() {
    ctx.save();
    ctx.transform(
      this.scale.x,
      0, 0,
      this.scale.y,
      this.position.x,
      this.position.y
    );
    // centers 
    ctx.drawImage(
      this.img,
      this.clipRect.x,
      this.clipRect.y,
      this.clipRect.width,
      this.clipRect.height,
      Math.round(-this.clipRect.width * 0.5),
      Math.round(-this.clipRect.height * 0.5),
      this.clipRect.width,
      this.clipRect.height
    );
    ctx.restore();
  }
}


class Player extends AnimatedGameEntity {
  constructor(img) {
    super(img, CANVAS_WIDTH / 2, CANVAS_HEIGHT - (clipRect.player.height / 2) - 10, clipRect.player)
    this.img = img;
    this.clipRect.width = this.img.width;
    this.clipRect.height = this.img.height;
    this.xAccel = 100;
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
    this.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT - (clipRect.player.height / 2) - 10);
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

    this.position.x = clamp(this.position.x, 50, CANVAS_WIDTH - this.img.width);

    if (keys['ArrowLeft']) {
      this.position.x -= this.xAccel * dt
    } else if (keys['ArrowRight']) {
      this.position.x += this.xAccel * dt
    }

    this.updateBounding();
  }

  shoot() {
    const bullet = new Bullet(images.bullet, this.position.x + (this.clipRect.width / 2) - (clipRect.bullet.width / 2), this.position.y, 1, 1000);
    this.bullets.push(bullet);
  }

  drawEntityOnCanvas() {
    ctx.save();
    ctx.shadowColor = '#6F4E37';
    ctx.shadowBlur = 15;
    ctx.drawImage(this.img, this.position.x, this.position.y, this.clipRect.width, this.clipRect.height);
    ctx.restore();


    ctx.save();
    ctx.globalAlpha = 0.2;
    const gradient = ctx.createLinearGradient(this.position.x, this.position.y, this.position.x + 20, this.position.y + 20);
    gradient.addColorStop(0, '#6F4E37');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(this.position.x, this.position.y, this.clipRect.width, this.clipRect.height);
    ctx.restore();
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

class Bullet extends AnimatedGameEntity {
  constructor(img, x, y, direction, speed) {
    super(img, x, y, clipRect.bullet);
    this.clipRect.width = this.img.width;
    this.clipRect.height = this.img.height;
    this.direction = direction;
    this.speed = speed;
    this.alive = true;
  }

  movement(dt) {
    this.position.y -= (this.direction * this.speed) * dt;
    this.position.y = clamp(this.position.y, 0, CANVAS_HEIGHT - this.clipRect.height)
    if (this.position.y <= 0) {
      this.alive = false;
    }
    this.updateBounding();
  }

  drawEntityOnCanvas() {
    ctx.drawImage(this.img, this.position.x, this.position.y, this.clipRect.width, this.clipRect.height);
  }
}

class Laser extends Bullet {
  constructor(x, y, direction, speed) {
    super(images.laser, x, y, direction, speed);
  }

  movement(dt) {
    this.position.y -= (this.direction * this.speed) * dt;
    if (this.position.y >= CANVAS_HEIGHT) {
      this.alive = false;
    }
    this.updateBounding();
  }
}

class Alien extends AnimatedGameEntity {
  constructor(img, x, y, points) {
    super(img, x, y, points, clipRect.alien)
    this.clipRect = clipRect.alien;
    this.alive = true;
    this.points = points;
    this.dying = false;
    this.deathTimer = 0.2;
    this.lastShotTime = 0;
    this.shootCoolDown = Math.random() * 2000 + 1000;
  }

  shoot() {
    const laserX = this.position.x + clipRect.alien.width / 2;
    const laserY = this.position.y + clipRect.alien.height;
    const laser = new Laser(laserX, laserY, -1, 800);
    game.alienLasers.push(laser);
  }

  drawEntityOnCanvas() {
    ctx.drawImage(this.img, this.position.x, this.position.y, this.clipRect.width, this.clipRect.height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.01;
    ctx.restore();
  }
}

class AlienGrid {
  constructor(x, y, rows, cols) {
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

        this.aliens.push(new Alien(img, x, y, points));

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

  updateShooting(currentTime, dt) {
    var columnAliens = null;
    for (let col = 0; col < this.cols; col++) {
      columnAliens = this.aliens.filter(alien =>
        Math.round((alien.position.x - this.position.x) / this.spacing) === col && alien.alive
      )

      const shooter = columnAliens.sort((a, b) => b.position.y - a.position.y)[0]
      const randomiser = (this.currentLevel > 1) ? 0.01 : 0.001;

      if (shooter && ((currentTime - shooter.lastShotTime) > shooter.shootCoolDown) && Math.random() < randomiser) {
        shooter.shoot();
        shooter.lastShotTime = currentTime;
        shooter.shootCoolDown = Math.random() * 2000 + 1000;
      }
    }

    for (let laser of game.alienLasers) {
      laser.movement(dt);
    }
  }

  update(currentTime, dt) {
    let xVelocity = this.speed * this.direction * dt;
    let shouldStepDown = false;


    for (let alien of this.aliens) {
      if (alien.alive === false) continue;

      const nextXPosition = alien.position.x + xVelocity;

      if (nextXPosition <= 50 || nextXPosition + alien.img.width >= CANVAS_WIDTH - 50) {
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

    this.updateShooting(currentTime, dt);

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

class Particle {
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

class Particles {
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


class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = GameStates.LOADING;
    this.lastTime = 0;
    this.player = null;
    this.aliens = null;
    this.alienLasers = [];
    this.canShoot = true;
    this.currentLevel = 1;
    this.levelTimer = 0;
    this.zooming = false;
    this.zoomTimer = 0;
    this.zoomLevel = 1;
    this.particles = null;

  }

  init() {
    startScreen.classList.add('visible');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.player = new Player(images.player);
    this.aliens = new AlienGrid(50, 40, 6, 18);
    this.particles = new Particles();
    requestAnimationFrame(this.start.bind(this));
  }

  update(timeStamp, dt) {
    if (!gameStarted && this.state !== GameStates.PLAYING) return;

    if (this.player.lives === 0 && this.state !== GameStates.GAME_OVER) {
      this.setState(GameStates.GAME_OVER)
      this.gameOver();
    }

    if (this.state == GameStates.PLAYING) {
      this.player.movement(dt);
      this.player.updateBullets(dt)
      this.aliens.update(timeStamp, dt);
      this.collisionDetection(dt);
      this.updateLevel(dt);
      if (this.zooming) {
        this.updateZooming(dt);
      }
      this.particles.updateParticles();
    }
  }

  draw() {
    this.clearScreen();
    if (this.state === GameStates.LOADING) return;

    this.hideStartScreen();
    this.handleZoomStart();
    this.player.drawEntityOnCanvas();
    this.player.drawBullets();
    this.aliens.drawAliensOnCanvas();

    for (let bullet of this.alienLasers) {
      bullet.drawEntityOnCanvas();
    }

    for (let i = 0; i < this.player.lives; i++) {
      const xOffset = 20 + i * 40;
      const yOffset = 20;
      ctx.drawImage(images.player, xOffset, yOffset, 25, 20);
    }

    this.drawScore();
    this.particles.drawParticles(ctx);
    if (this.zooming && this.state === GameStates.PLAYING) {
      ctx.restore();
    }
  }

  start() {
    const timeStamp = performance.now();
    const deltaTime = (timeStamp - this.lastTime) / 1000;

    this.lastTime = timeStamp;
    this.update(timeStamp, deltaTime);
    this.draw();
    requestAnimationFrame(this.start.bind(this));
  }

  pause() {
    const pauseScreen = document.getElementById('pause-screen');

    if (this.state === GameStates.PLAYING && gameStarted) {
      this.setState(GameStates.PAUSED);
      pauseScreen.classList.add('visible');
    } else if (this.state === GameStates.PAUSED) {
      this.setState(GameStates.PLAYING);
      pauseScreen.classList.remove('visible');
    }
  }

  getState() {
    return this.state;
  }

  setState(state) {
    this.state = state
  }

  getMetaData() {
    return {
      name: 'Space Invaders',
      author: 'Suleiman Suwaibat',
      description: `
        Space invaders is an interactive web-based game 
        built with HTML, CSS and JavaScript.  
        It’s a single-player arcade-style game 
        where the player controls a spaceship that moves 
        horizontally between boundaries to shoot at descending alien invaders. 
        The goal is to eliminate the aliens before they reach the bottom of the screen.`,
      thumbnail: './assets/game-screen-capture.jpeg',
      levels: 3,
      version: '1.0.0'
    }
  }

  handleInput(e) {
    const now = performance.now();

    switch (e.code) {
      case 'Escape':
        this.pause();
        return;

      case 'Enter':
        if (this.state !== GameStates.PAUSED) {
          gameStarted = true;
          this.setState(GameStates.PLAYING);
        }
        break;

      case 'Space':
        if (
          this.canShoot &&
          this.player &&
          this.state === GameStates.PLAYING &&
          now - this.player.lastShotTime >= 300
        ) {
          this.player.shoot();
          sounds.shoot.currentTime = 0;
          sounds.shoot.play();
          this.player.lastShotTime = now;
          this.canShoot = false;
        }
        break;
    }
  }

  hideStartScreen() {
    startScreen.classList.remove('visible');
  }

  drawScore() {
    const gradient = ctx.createLinearGradient(CANVAS_WIDTH - 200, 40, (CANVAS_WIDTH - 200) + 150, 40);
    gradient.addColorStop(0, "#037070");
    gradient.addColorStop(1, '#00ffff');

    ctx.font = "1rem 'Press Start 2P', monospace";
    ctx.fillStyle = gradient;
    ctx.fillText(`Score: ${this.player.score}`, CANVAS_WIDTH - 200, 40);
  }

  handleKeyDown(e) {
    keys[e.key] = true;
  }

  handleKeyUp(e) {
    if (e.code === 'Space') {
      this.canShoot = true;
    }
    keys[e.key] = false;
  }

  clearScreen() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  handleZoomStart() {
    if (this.state === GameStates.PLAYING) {
      sounds.background.loop = true;
      sounds.background.play();

      if (this.zooming) {
        ctx.save();
        ctx.translate(CENTER_X, CENTER_Y);
        ctx.scale(this.zoomLevel, this.zoomLevel);
        ctx.translate(-CENTER_X, -CENTER_Y);
      }
    }
  }

  updateZooming(dt) {
    const levelUpScreen = document.getElementById('level-up-screen');

    this.zoomTimer += dt;

    if (this.zoomTimer >= ZOOM_DURATION) {
      this.zooming = false;
      this.zoomLevel = 1;
      this.zoomTimer = 0;
      levelUpScreen.classList.remove('visible')
    } else {
      const t = this.zoomTimer / ZOOM_DURATION;
      this.zoomLevel = 1 + (MAX_ZOOM - 1) * (1 - Math.pow(1 - t, 3));
      levelUpScreen.classList.add('visible');
    }
  }

  updateLevel() {
    const level = levels[this.currentLevel];
    const CONSTANT_SCORE = 500;
    const expectedScore = this.currentLevel * CONSTANT_SCORE;

    if (
      this.player.score >= expectedScore &&
      this.currentLevel < levels.length
    ) {
      this.currentLevel++;
      this.zooming = true;
  
      this.aliens.setSpeed(this.aliens.speed + level.alienSpeed);
      this.aliens.updateSpacing(level.spacing);
    }
  }
  


  checkPlayerVsAliens() {
    let aliens = this.aliens.aliens;
    let playerHeight = clipRect.player.height - 70;

    let lowestY = handleAliensPlayerCollision(aliens);

    if (lowestY >= (CANVAS_HEIGHT + playerHeight)) {
      triggerGameOver(game, sounds);
    }
  }


  collisionDetection() {
    handlePlayerBulletsAlienCollision(this.player.bullets, this.aliens.aliens, this.player, images.enemyDeath);
    handleAlienLasersPlayerCollision(this.alienLasers, this.player, sounds.playerDead, images.playerDeath);
    this.checkPlayerVsAliens();
  }

  gameOver() {

    gameOverScreen.classList.add('visible');
    scoreTracker.innerHTML = `Your Score: ${this.player.score}`;

    sounds.background.pause();
    sounds.background.currentTime = 0;

 
    sounds.gameOverSound.play();
    playAgain.onclick = () => this.reset();
  }

  reset() {
    const loading = document.getElementById('loading-screen');
  
    gameOverScreen.classList.remove('visible');
    loading.classList.add('visible');
  
    setTimeout(() => {  
      loading.classList.remove('visible');

      this.state = GameStates.LOADING;
      this.lastTime = 0;
      this.player = null;
      this.aliens = null;
      this.canShoot = true;
      this.currentLevel = 1;
      this.levelTimer = 0;
      this.zooming = false;
      this.zoomTimer = 0;
      this.zoomLevel = 1;
      this.alienLasers = [];

      this.init();
    }, 500); 
  }
  
}

const canvas = document.getElementById('game-screen');
const game = new Game(canvas);
var ctx = canvas.getContext('2d');

window.onload = () => game.init();
document.addEventListener('keydown', (e) => {
  game.handleInput(e);
  game.handleKeyDown(e);
});

document.addEventListener('keyup', (e) => game.handleKeyUp(e));
