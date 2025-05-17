const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const PLAYERSPRITEIMG = new Image();
PLAYERSPRITEIMG.src = './assets/player.svg';
const PLAYERCLIPRECT = { x: 0, y: 0, width: 40, height: 40 };
const BULLETSPRITEIMG = new Image();
BULLETSPRITEIMG.src = './assets/player-projectile.svg'
const BULLETCLIPRECT = { x: 0, y: 0, width: 20, height: 20 };

let keys = {};
let lastTime = 0;
let gameStarted = false;

var canvas = null;
var ctx = null;
var player = null;
var alien = null;


// needs pause implementation

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
    // Set specific logic for specific entity
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
    super(PLAYERSPRITEIMG, CANVAS_WIDTH/2, CANVAS_HEIGHT - 70, PLAYERCLIPRECT)
    this.xAccel = 100;
    this.lives = 0;
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
      const bullet = new Bullet(this.position.x, this.position.y, 1, 1000);
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
      super(BULLETSPRITEIMG, x, y - 20, BULLETCLIPRECT)
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


  function isMobile() {
    return window.innerWidth <= 768;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
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
  }

  if (gameStarted && player) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.drawEntityOnCanvas();  
    player.drawBullets();
  }
}


// game logic, update game logic
function updateGame(dt) {
  if (player) {
    player.movement(dt);
    player.updateBullets(dt)
   
  }
}

function gameLoop(timeStamp) {
  const deltaTime = (timeStamp - lastTime) / 1000;
  lastTime = timeStamp;

  updateGame(deltaTime);

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