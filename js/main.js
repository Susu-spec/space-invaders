const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;


var canvas = document.getElementById('game-screen');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
var ctx = canvas.getContext('2d');

let keys = {};

// needs pause implementation

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

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
      Math.round(-this.clipRect.w*0.5), 
      Math.round(-this.clipRect.h*0.5), 
      this.clipRect.w, 
      this.clipRect.h
    );
    ctx.restore();
  }
}

function isMobile() {
  return window.innerWidth <= 768;;
}
  
function changeStartTextOnScreenSize() {
  if (isMobile() === true) {
    startParagraph.textContent = 'Tap the screen to Play!'
  } else {
    startParagraph.textContent = 'Press Enter to Play!'
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  changeStartTextOnScreenSize()
}
  
window.addEventListener('resize', resizeCanvas);
  

window.onload = function() {
  resizeCanvas()
  changeStartTextOnScreenSize()
};