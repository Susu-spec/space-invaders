const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const PLAYER_SPRITE_IMG = new Image();
const BULLET_SPRITE_IMG = new Image();
PLAYER_SPRITE_IMG.src = './assets/player.svg';
BULLET_SPRITE_IMG.src = './assets/player-projectile.svg'

// Clip rects determine what parts of the image we'd like to draw
// Not using a sprite sheet (large image with game icons) here 
// but if we did, we'd absolutely need this for its performance and dynamism
const PLAYER_CLIP_RECT = { x: 0, y: 0, width: 40, height: 40 };
const BULLET_CLIP_RECT = { x: 0, y: 0, width: 20, height: 20 };
const ALIEN_CLIP_RECT = { x: 0, y: 0, width: 40, height: 40 };

const ALIEN_IMAGE_TYPE_5 = new Image();
const ALIEN_IMAGE_TYPE_4 = new Image();
const ALIEN_IMAGE_TYPE_3 = new Image();
const ALIEN_IMAGE_TYPE_2 = new Image();
const ALIEN_IMAGE_TYPE_1 = new Image();
ALIEN_IMAGE_TYPE_5.src = './assets/enemy-one-down.svg'
ALIEN_IMAGE_TYPE_4.src = './assets/enemy-two-down.svg'
ALIEN_IMAGE_TYPE_3.src = './assets/enemy-three-down.svg'
ALIEN_IMAGE_TYPE_2.src = './assets/enemy-three.svg'
ALIEN_IMAGE_TYPE_1.src = './assets/enemy-two.svg'

const ALIEN_IMAGES = [
  ALIEN_IMAGE_TYPE_5,
  ALIEN_IMAGE_TYPE_4,
  ALIEN_IMAGE_TYPE_3,
  ALIEN_IMAGE_TYPE_2,
  ALIEN_IMAGE_TYPE_1,
];

const ALIEN_POINTS = [50, 40, 30, 20, 10];

let keys = {};
let lastTime = 0;
let gameStarted = false;

var canvas = null;
var ctx = null;
var player = null;
var alien = null;
var alienLasers = [];
var aliens = null;


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
    // Fall back if undefined
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



// think about adding images

// detect when game elements reach outside the bounds
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

  updateByTime(dt) {}
  // Might set as internal logic
  updateBounding() {
    this.bounding.setNewBoundRect(
    this.position.x, 
    this.position.y, 
    (this.img.width * this.scale.x), 
    (this.img.height * this.scale.y)
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

// Player is an animated game entity
// Player's first position is the middle, always at the bottom
// Player moves along horizontal axis, tap right to go forward, tap left to move backward, you can not exceed canvas width

class Player extends AnimatedGameEntity {
  constructor() {
    super(PLAYER_SPRITE_IMG, CANVAS_WIDTH/2, CANVAS_HEIGHT - 70, PLAYER_CLIP_RECT)
    this.xAccel = 100;
    this.lives = 3;
    this.score = 0;
    this.bullets = [];

  }

  reset() {
    this.lives = 3;
    this.score = 0;
    this.position.set(CANVAS_WIDTH/2, CANVAS_HEIGHT - 70);
    this.bullets = []
  }

  movement(dt) {
    this.position.x = clamp(this.position.x, 50, CANVAS_WIDTH - this.img.width);

    if (keys['ArrowLeft']) {
      this.position.x -= this.xAccel * dt
    } else if (keys['ArrowRight']) {
      this.position.x += this.xAccel * dt
    }

    if (keys[' ']) {
      this.shoot();
    }
    
    this.updateBounding();
  }

  shoot() {
    const bullet = new Bullet(this.position.x, this.position.y, 1, 500);
    this.bullets.push(bullet);
  }

  // we want to prevent spamming

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
  constructor(x, y, direction, speed) {
    super(BULLET_SPRITE_IMG, x, y - 20, BULLET_CLIP_RECT)
    this.direction = direction;
    this.speed = speed;
    this.alive = true;
  }

  movement(dt) {
    this.position.y -= (this.direction * this.speed) * dt;
    this.position.y = clamp(this.position.y, 0, CANVAS_HEIGHT - this.img.height)
    if (this.position.y <= 0) {
      this.alive = false;
    }
    this.updateBounding();
  }
}

class Laser extends Bullet {
  constructor(x, y, direction, speed) {
    super(x, y, direction, speed);
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
    super(img, x, y, points, ALIEN_CLIP_RECT)
    this.alive = true;
    this.points = points;
    this.lastShotTime = 0;
    this.shootCoolDown = Math.random() * 2000 + 1000;
  }

  shoot() {
    const laser = new Laser(this.position.x, this.position.y, -1, 300);
    alienLasers.push(laser);
  }

  drawEntityOnCanvas() {
    ctx.drawImage(this.img, this.position.x, this.position.y, 20, 20);
  } 
}

class AlienGrid {
  constructor(x, y, rows, cols, spacing) {
    this.aliens = [];
    this.position = new Position(x, y)
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

  updateShooting(currentTime, dt) {
    var columnAliens = null;
    for (let col = 0; col < this.cols; col++) {
      columnAliens = this.aliens.filter(alien => 
        Math.round((alien.position.x - this.position.x) / this.spacing) === col && alien.alive
      )

      const shooter = columnAliens.sort((a, b) => b.position.y - a.position.y)[0]

      if (shooter) {
        if ((currentTime - shooter.lastShotTime) > shooter.shootCoolDown) {
          if (Math.random() < 0.001) {
            shooter.shoot();
            shooter.lastShotTime = currentTime;
            shooter.shootCoolDown = Math.random() * 2000 + 1000;
          }
        } 
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
      
      if (nextXPosition <= 50 ||  nextXPosition + alien.img.width >= CANVAS_WIDTH + 50) {
        shouldStepDown = true;
        this.direction *= -1;
        break;
      }
    }

    for (let alien of this.aliens) {
      if (alien.alive === false) continue;

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
        alien.drawEntityOnCanvas();
      }
    }
  }
}

function isMobile() {
  return window.innerWidth <= 768;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 10)) + min;
}

function valueInRange(value, min, max) {
  return (value <= max) && (value >= min);
}
 
// allows edge contact when in range
function isColliding(A, B) {
const  xOverlap = valueInRange(A.position.x, B.position.x, B.position.x + B.width) ||
  valueInRange(B.position.x, A.position.x, A.position.x + A.width);
 
  const yOverlap = valueInRange(A.position.y, B.position.y, B.position.y + B.height) ||
  valueInRange(B.position.y, A.position.y, A.position.y + A.height); 
  return xOverlap && yOverlap;
}

function checkPlayerBulletsVsAliens() {
  // uses let .. of ... to return objects
  // let ... in ... returns indices
  for (let bullet of player.bullets) {
    for (let alien of aliens) {
      if (bullet.alive && alien.alive) {
        const collided = isColliding(bullet, alien);
        if (collided) {
          player.score += alien.points;
          bullet.alive = alien.alive = false;
        }
      }
    }
  }
}

function checkAlienBulletsVsPlayer() {
  if (player.lives <= 0) return;

  for (let laser of alienLasers) {
    if (player.lives > 0) {
      const collided = isColliding(laser, player);
      if (collided) {
        player.lives -= 1;
        laser.alive = false;
        break;
      }
    } 
  }
}

function checkPlayerVsAliens() {
  for (let alien of aliens) {
    const collided = isColliding(alien, player);
    if (collided) {
      // game over - game over should have reset
    }
  }
}
  
function changeStartTextOnScreenSize() {
  const startParagraph = document.querySelector('#start-screen p');
  if (isMobile() === true) {
    startParagraph.textContent = 'Tap the screen to Play!'
  } else {
    startParagraph.textContent = 'Press Enter to Play!'
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  changeStartTextOnScreenSize();
  if (player) {
    player.drawEntityOnResize();
  }
}


function drawGameBoard() {
  if (!gameStarted && keys['Enter']) {
    gameStarted = true;
    document.getElementById('start-screen').style.display = 'none';
    player = new Player();
    aliens = new AlienGrid(50, 0, 5, 15, 40)
  }

  if (gameStarted && player) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.drawEntityOnCanvas();  
    player.drawBullets();
    aliens.drawAliensOnCanvas();


    for (let bullet of alienLasers) {
      bullet.drawEntityOnCanvas();
    }

  }
}


// game logic, update game logic
function updateGame(timeStamp, dt) {
  if (player) {
    player.movement(dt);
    player.updateBullets(dt)  
  }

  if (aliens) {
    aliens.update(timeStamp, dt)
  }
}

function gameLoop() {
  const timeStamp = performance.now();
  const deltaTime = (timeStamp - lastTime) / 1000;
  lastTime = timeStamp;

  updateGame(timeStamp, deltaTime);

  drawGameBoard()

  requestAnimationFrame(gameLoop); 
}

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});
  
function initCanvas() {
  canvas = document.getElementById('game-screen');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  ctx = canvas.getContext('2d');   
  window.addEventListener('resize', resizeCanvas);
}

window.onload = function() {
  initCanvas();
  requestAnimationFrame(gameLoop)
};