/**
 * Class representing position
 * 
 * @class
 */
export class Position {
  /**
   * 
   * @param {number} x - Horizontal position
   * @param {number} y - Vertical position
   */
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  
    setNewPosition(x, y) {
      this.x = x;
      this.y = y;
    }
}
  
/**
 * Class representing area
 * 
 * @class
 */
export class BoundingBox {
  /**
   * 
   * @param {number} x - Horizontal position of game entity
   * @param {number} y - Vertical position of game entity
   * @param {number} width - Width of game entity
   * @param {number} height - Height of game entity
   */
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

/**
 * Class representing game entity
 * 
 * @class
 */
  
export class GameEntity {
  /**
   * 
   * @param {HTMLImageElement} img - Image element to visually render game entity
   * @param {number} x - Horizontal position of entity
   * @param {number} y - Vertical position of entity
   * @param {object} clipRect - Clipping rectangle
   */
    constructor(img, x, y, clipRect) {
      this.img = img;
      this.clipRect = clipRect;
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
  
/**
 * Class representing game sprites / entities
 * 
 * @class
 */

export default class AnimatedGameEntity extends GameEntity {
  /**
   * 
   * @param {HTMLImageElement} entityImg 
   * @param {number} x - Horizontal position of entity
   * @param {number} y - Vertical position of entity
   * @param {Object} clipRect - Sprite clipping rectangle
   */
    constructor(entityImg, x, y, clipRect) {
      super(entityImg, x, y, clipRect);
      this.updateBounding();
    }
  
    updateBounding() {
      const w = Math.round(this.clipRect.width * this.scale.x);
      const h = Math.round(this.clipRect.height * this.scale.y);
  
      this.bounding.setNewBoundRect((this.position.x - w / 2), (this.position.y - h / 2), w, h)
    }
  
    // Centers and scales image
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
        Math.round(-this.clipRect.width * 0.5),
        Math.round(-this.clipRect.height * 0.5),
        this.clipRect.width,
        this.clipRect.height
      );
      ctx.restore();
    }
  }