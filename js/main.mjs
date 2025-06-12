
/**
 * @file main.mjs
 * @game Space Invaders
 * @author Suwayba
 * @date 2025-05-27
 * 
 * @description 
 * Core game logic for the Space invaders game. 
 * Handles all gameplay functionalities including
 * score updates, level progression and rendering
 */

import { 
  handlePlayerBulletsAlienCollision, 
  handleAliensPlayerCollision, 
  triggerGameOver, 
  handleAlienLasersPlayerCollision 
} from './utils/helpers.mjs';
import { Assets } from './utils/assets.mjs';
import { levels } from './utils/levels.mjs';
import { 
  gameOverScreen, 
  scoreTracker, 
  startScreen, 
  playAgain, 
  GameStates,
  CENTER_X, 
  CENTER_Y, 
  ZOOM_DURATION, 
  MAX_ZOOM, 
  keys,
  gameOverTitle,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT
} from './utils/constants.mjs';
import { Player } from './utils/player.mjs';
import { AlienGrid } from './utils/alien.mjs';
import { Particles } from './utils/particles.mjs';

let gameStarted = false;

const { images, sounds, clipRect } = Assets;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = GameStates.LOADING;
    this.lastTime = 0;
    this.player = null;
    this.alienGrid = null;
    this.alienLasers = [];
    this.canShoot = true;
    this.currentLevel = 1;
    this.levelTimer = 0;
    this.zooming = false;
    this.zoomTimer = 0;
    this.zoomLevel = 1;
    this.particles = null;
    this.highScore = localStorage.getItem('highScore') ?? 0;

  }

  init() {
    startScreen.classList.add('visible');
    this.resizeCanvas();

    sounds.victorySound.pause();
    sounds.victorySound.currentTime = 0;
    sounds.radioChatter.pause();
    sounds.radioChatter.currentTime = 0;

    this.player = new Player(images.player, ctx);
    this.alienGrid = new AlienGrid(ctx, 50, 40, 6, 18);
    this.particles = new Particles();
    
    requestAnimationFrame(this.start.bind(this));
  }

  update(timeStamp, dt) {
    const allDead = this.alienGrid.aliens.every(alien => !alien.alive);
    if (!gameStarted && this.state !== GameStates.PLAYING) return;

    if(this.player.lives === 0) {
      this.player.img = images.playerDeath;
      sounds.playerDead.currentTime = 0;
      sounds.playerDead.play();
    }

    if ((this.player.lives === 0 && 
      this.state !== GameStates.GAME_OVER) || (
      allDead && this.state !== GameStates.GAME_OVER)) {

      this.setState(GameStates.GAME_OVER);
      this.saveScore();
      this.gameOver();
    }

    if (this.state == GameStates.PLAYING) {
      this.player.movement(dt);
      this.player.updateBullets(dt)
      this.alienGrid.update(timeStamp, dt, this);
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
    this.alienGrid.drawAliensOnCanvas();

    for (let bullet of this.alienLasers) {
      bullet.drawEntityOnCanvas();
    }

    for (let i = 0; i < this.player.lives; i++) {
      const xOffset = 20 + i * 40;
      const yOffset = 20;
      ctx.drawImage(images.player, xOffset, yOffset, 25, 20);
    }
    this.saveScore();
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
     return {
      level: this.currentLevel,
      score: this.score,
      state: this.state,
      lives: this.player.lives,
      playerPosition: { x: this.player.position.x, y: this.player.position.y },
      alienCount: this.aliens.filter(a => a.alive).length,
      timestamp: performance.now()
    };
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
        horizontally between boundaries to shoot at
         descending alien invaders. 
        The goal is to eliminate the aliens before 
        they reach the bottom of the screen.`,
      thumbnail: './assets/game-screen-capture.jpeg',
      levels: 5,
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
        if (this.state === GameStates.LOADING) {
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
    const gradient = ctx.createLinearGradient(LOGICAL_WIDTH - 200, 40, (LOGICAL_WIDTH - 200) + 150, 40);
    gradient.addColorStop(0, "#037070");
    gradient.addColorStop(1, '#00ffff');

    ctx.font = "1rem 'Press Start 2P', monospace";
    ctx.fillStyle = gradient;
    ctx.fillText(`Score: ${this.player.score}`, LOGICAL_WIDTH - 200, 40);
    ctx.fillText(`Level: ${this.currentLevel}`, LOGICAL_WIDTH - 800, 40);
    ctx.fillText(`High Score: ${this.highScore}`, LOGICAL_WIDTH - 600, 40);

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
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
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
    if (this.state !== GameStates.PLAYING) return;
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
      if (this.state === GameStates.PLAYING) levelUpScreen.classList.add('visible');
    }
  }

  updateLevel() {
    const level = levels[this.currentLevel - 1];
    const CONSTANT_SCORE = 500;
    const expectedScore = this.currentLevel * CONSTANT_SCORE;

    if (
      this.player.score >= expectedScore &&
      this.currentLevel < levels.length
    ) {
      this.currentLevel++;
      this.zooming = true;
  

      this.alienGrid.setSpeed(this.alienGrid.speed + level.alienSpeed);
      this.alienGrid.updateSpacing(level.spacing);
    }
  }

  saveScore() {
 
    if (
      this.state === GameStates.GAME_OVER && 
      this.player.score > this.highScore
    ) {
      this.highScore = this.player.score;
      localStorage.setItem('highScore', this.highScore)
    }
  }
  


  checkPlayerVsAliens() {
    let aliens = this.alienGrid.aliens;
    let playerHeight = clipRect.player.height - 70;

    let lowestY = handleAliensPlayerCollision(aliens);

    if (lowestY >= (LOGICAL_HEIGHT + playerHeight)) {
      triggerGameOver(game, sounds);
    }
  }


  collisionDetection() {
    handlePlayerBulletsAlienCollision(
      this.player.bullets, 
      this.alienGrid.aliens, 
      this.player, 
      images.enemyDeath
    );
    handleAlienLasersPlayerCollision(
      this.alienLasers, 
      this.player, 
      sounds.playerDead, 
      images.playerDeath
    );
    this.checkPlayerVsAliens();
  }

  gameOver() {
    const allDead = this.alienGrid.aliens.every(alien => !alien.alive);
    if (allDead) {
      gameOverTitle.innerHTML = `Crisis averted!`;
    }
    gameOverScreen.classList.add('visible');
    scoreTracker.innerHTML = `Your Score: ${this.player.score}`;

    sounds.background.pause();
    sounds.background.currentTime = 0;


    if (gameOverTitle.innerHTML === `Crisis averted!`) {

      sounds.victorySound.loop = false;
      sounds.victorySound.play();
    } else {
      sounds.radioChatter.loop = false;
      sounds.radioChatter.play();
    }

    playAgain.onclick = () => this.reset();
  }

  reset() {
    const loading = document.getElementById('loading-screen');

    gameOverScreen.classList.remove('visible');
    loading.classList.add('visible');

    requestAnimationFrame(() => {
      setTimeout(() => {
        loading.classList.remove('visible');

        this.state = GameStates.LOADING;
        this.lastTime = 0;
        this.player = null;
        this.alienGrid = null;
        this.canShoot = true;
        this.currentLevel = 1;
        this.levelTimer = 0;
        this.zooming = false;
        this.zoomTimer = 0;
        this.zoomLevel = 1;
        this.alienLasers = [];

        this.init();
      }, 5000);
    });
  
  }

  resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = LOGICAL_WIDTH * ratio;
    this.canvas.height = LOGICAL_HEIGHT * ratio;

    this.canvas.style.width = LOGICAL_WIDTH + 'px';
    this.canvas.style.height = LOGICAL_HEIGHT + 'px';

    

     ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.imageSmoothingEnabled = true;
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

canvas.addEventListener('touchstart', (e) => {
  if (game.state === GameStates.LOADING && !gameStarted) {
    e.preventDefault();
    gameStarted = true;
    game.setState(GameStates.PLAYING);
  }
}, { passive: false });

document.addEventListener('keyup', (e) => game.handleKeyUp(e));

window.addEventListener('resize', () => game.resizeCanvas())
