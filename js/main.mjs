import * as Utils from './utils.mjs';

const { clamp, isColliding } = Utils;

const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;

const ZOOM_DURATION = 1;
const MAX_ZOOM = 1.5;

let keys = {};
let gameStarted = false;
var alienLasers = [];

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
    alienSpeed: 50,
    duration: 30,
  },
  {
    id: 2,
    name: 'Intermediate',
    speedMultiplier: 1.5,
    alienCount: 8,
    alienSpeed: 80,
    duration: 45,
  },
  {
    id: 3,
    name: 'Advanced',
    speedMultiplier: 2,
    alienCount: 12,
    alienSpeed: 110,
    duration: 60,
  },
];



const GameStates = {
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver'
}

let currentState = GameStates.LOADING;

function updateGameState(newState) {
  currentState = newState;
  switch (currentState) {
    case GameStates.LOADING:
      break;
    case GameStates.PLAYING:
      break;
    case GameStates.PAUSED:
      break;
    case GameStates.PAUSED:
      break;
  }
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
      Math.round(-this.clipRect.width*0.5), 
      Math.round(-this.clipRect.height*0.5), 
      this.clipRect.width, 
      this.clipRect.height
    );
    ctx.restore();
  }
}


class Player extends AnimatedGameEntity {
  constructor(img) {
    super(img, CANVAS_WIDTH/2, CANVAS_HEIGHT - (clipRect.player.height / 2) - 10, clipRect.player)
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
  }

  reset() {
    this.lives = 3;
    this.score = 0;
    this.position.set(CANVAS_WIDTH/2, CANVAS_HEIGHT -  (clipRect.player.height / 2) - 10);
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
    ctx.drawImage(this.img, this.position.x, this.position.y, this.clipRect.width, this.clipRect.height);
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
    alienLasers.push(laser);
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
  constructor(x, y, rows, cols, spacing) {
    this.aliens = [];
    this.position = new Position(x, y + 10)
    this.rows = rows;
    this.cols = cols;
    this.spacing = spacing;
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

  updateShooting(currentTime, dt) {
    var columnAliens = null;
    for (let col = 0; col < this.cols; col++) {
      columnAliens = this.aliens.filter(alien => 
        Math.round((alien.position.x - this.position.x) / this.spacing) === col && alien.alive
      )

      const shooter = columnAliens.sort((a, b) => b.position.y - a.position.y)[0]

      if (shooter && ((currentTime - shooter.lastShotTime) > shooter.shootCoolDown) && Math.random() < 0.001) {
        shooter.shoot();
        shooter.lastShotTime = currentTime;
        shooter.shootCoolDown = Math.random() * 2000 + 1000;
      }
    }

    for (let laser of alienLasers) {
      laser.movement(dt);
    } 
  }

  update(currentTime, dt) {
    let xVelocity = this.speed * this.direction * dt;
    let shouldStepDown = false;


    for (let alien of this.aliens) {
      if (alien.alive === false) continue;

      const nextXPosition = alien.position.x + xVelocity;
      
      if (nextXPosition <= 50 ||  nextXPosition + alien.img.width >= CANVAS_WIDTH - 50) {
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
          sounds.invaderDead.currentTime = 0;
          sounds.invaderDead.play();
          alien.alive = false;
          alien.dying = false;
        }
      }
    

      if(shouldStepDown) {
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

class Game {
  constructor(canvas) {
    this.canvas = canvas;
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
  }

  init() {
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.player = new Player(images.player);
    this.aliens = new AlienGrid(50, 0, 5, 15, 40);
    requestAnimationFrame(this.loop.bind(this));
  }

  update(timeStamp, dt) {
    if (!gameStarted && this.state !== GameStates.PLAYING) return;

    if (this.state == GameStates.PLAYING) {
      this.player.movement(dt);
      this.player.updateBullets(dt)
      this.player.movement(dt);
      this.aliens.update(timeStamp, dt);
      this.collisionDetection(dt);
      this.updateLevel(dt);
    }
  }

  draw() {
    this.clearScreen();
    if (this.state === GameStates.LOADING) return;

    const startScreen = document.getElementById('start-screen');
    startScreen.classList.remove('visible');  

    if (this.state === GameStates.PLAYING) {
      sounds.background.loop = true;
      sounds.background.play();

      if (this.zooming) {
        ctx.save();
        ctx.translate(CENTER_X, CENTER_Y)
        ctx.scale(this.zoomLevel, this.zoomLevel);
        ctx.translate(-CENTER_X, -CENTER_Y)
      }
    }

    this.player.drawEntityOnCanvas();  
    this.player.drawBullets();
    this.aliens.drawAliensOnCanvas();
    for (let bullet of alienLasers) {
      bullet.drawEntityOnCanvas();
    }

    if (this.zooming && this.state === GameStates.PLAYING) {
      ctx.restore();
    }
  }

  loop() {
    const timeStamp = performance.now();
    const deltaTime = (timeStamp - this.lastTime) / 1000;
    this.lastTime = timeStamp;

    this.update(timeStamp, deltaTime);

    if (this.zooming) {
      this.updateZooming(deltaTime); 
    }

    this.draw();
    requestAnimationFrame(this.loop.bind(this));
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

    if (e.code === 'Escape') {
      this.pause();
      return;
    }

    if (e.code === 'Enter' && this.state !== GameStates.PAUSED) {
        gameStarted = true;
        this.setState(GameStates.PLAYING)
        this.zooming = true;
    }

    if (e.code === "Space" && this.canShoot && this.player && this.state === GameStates.PLAYING) {
      const now = performance.now();

      if (now - this.player.lastShotTime >= 300) {
        this.player.shoot();
        sounds.shoot.currentTime = 0;
        sounds.shoot.play();
        this.player.lastShotTime = now;
        this.canShoot = false;
      }
    }
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

  updateZooming(dt) {
    this.zoomTimer += dt;

    if (this.zoomTimer >= ZOOM_DURATION) {
      this.zooming = false;
      this.zoomLevel = 1;
    } else {
      const t = this.zoomTimer / ZOOM_DURATION;
      this.zoomLevel = 1 + (MAX_ZOOM - 1) * (1 - Math.pow(1 - t, 3));
    }
  }

  updateLevel(dt) {
    this.levelTimer += dt;
    const level = levels[this.currentLevel];
    this.aliens.setSpeed(level.alienSpeed);
  
    // if (this.levelTimer >= level.duration) {
    //   if (this.currentLevel < levels.length - 1) {
    //     this.currentLevel++;
    //     this.levelTimer = 0;
    //   }
    // }
  }

  checkPlayerBulletsVsAliens() {
    // uses let .. of ... to return objects
    // let ... in ... returns indices
    for (let bullet of this.player.bullets) {
      for (let alien of this.aliens.aliens) {
        if (bullet.alive && alien.alive && isColliding(bullet, alien)) {
          this.player.score += alien.points;

          alien.dying = true;
          alien.deathTimer = 0.5;
          alien.img = images.enemyDeath;
          bullet.alive = false;
        }
      }
    }
  }
  
  
  checkAlienBulletsVsPlayer() {
    if (this.player.lives <= 0) return;

    for (let laser of alienLasers) {
      if (this.player.lives > 0 && isColliding(laser, this.player)) {
        sounds.playerDead.currentTime = 0;
        sounds.playerDead.play();

        this.player.lives -= 1;
        this.player.dying = true;
        this.player.deathTimer = 0.5;
        this.player.img = images.playerDeath;

        laser.alive = false;
        break;
      } 
    }
  }
  
  checkPlayerVsAliens() {
    for (let alien of this.aliens.aliens) {
      const collided = isColliding(alien, this.player);
      if (collided) {
        // game over - game over should have reset
      }
    }
  }

  collisionDetection(dt) {
    this.checkPlayerBulletsVsAliens(dt);
    this.checkAlienBulletsVsPlayer();
    this.checkPlayerVsAliens();
  }

  gameOver() {
    const gameOverScreen = document.getElementById('game-over-screen');
    const scoreTracker = document.getElementById('score');

    gameOverScreen.classList.add('visible');
    scoreTracker.innerHTML += this.player.score;
    

  //  reset should only happen after you click on a button
  }

  reset() {
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
