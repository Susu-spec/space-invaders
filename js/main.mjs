
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
  handleAlienLasersPlayerCollision,
  preventOverlap
} from './utils/helpers.mjs';
import { Assets } from './utils/assets.mjs';
import { levels } from './utils/levels.mjs';
import { 
  gameOverScreen, 
  scoreTracker, 
  startScreen, 
  playAgain, 
  GameStates,
  CANVAS_HEIGHT, 
  CANVAS_WIDTH, 
  CENTER_X, 
  CENTER_Y, 
  ZOOM_DURATION, 
  MAX_ZOOM, 
  keys,
  gameOverTitle,
  pausePlayIcon
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
    this.soundEnabled = true;
    this.volumeIconBounds = null;
    this.draggingPlayer = false;
  }

  init() {
    this.setState(GameStates.LOADING);
    this.canvas.width = CANVAS_WIDTH();
    this.canvas.height = CANVAS_HEIGHT();

    sounds.victorySound.pause();
    sounds.victorySound.currentTime = 0;
    sounds.radioChatter.pause();
    sounds.radioChatter.currentTime = 0;

    this.player = new Player(images.player, ctx);
    this.alienGrid = new AlienGrid(ctx, 50, 40, 6, 18);
    this.particles = new Particles();

    this.bindEvents();
  }

  bindEvents() { 
    document.addEventListener('keydown', (e) => { 
      this.handleInput(e); 
      this.handleKeyDown(e); 
    });

    
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // Start game on Mobile: tap anywhere on the canvas
    startScreen.addEventListener('touchstart', (e) => {
      if (this.state === GameStates.LOADING) { 
        gameStarted = true; 
        this.setState(GameStates.PLAYING); 
        requestAnimationFrame(this.start.bind(this)); 
      }
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;

      // Check if touch is inside player bounds
      if (
        x >= this.player.position.x &&
        x <= this.player.position.x + this.player.img.width &&
        y >= this.player.position.y &&
        y <= this.player.position.y + this.player.img.height
      ) {
        this.draggingPlayer = true;
        this.touchStartX = x;
        this.touchStartY = y;
      }

      // Volume icon toggle
      this.handleVolumeToggle(x, y);
      this.handleGamePlayPause(x, y);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.draggingPlayer) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;

      const x = (touch.clientX - rect.left) * scaleX;
      this.player.position.x = Math.max(0, Math.min(x, this.canvas.width - this.player.img.width));
      this.player.updateBounding();
    });

    this.canvas.addEventListener('touchend', (e) => {
      if (this.draggingPlayer) {
        const touch = e.changedTouches[0];
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        const dx = Math.abs(x - this.touchStartX);
        const dy = Math.abs(y - this.touchStartY);

        // If finger didn’t move much = treat as tap and shoot
        if (dx < 10 && dy < 10) {
          const now = performance.now();
          if (
            this.player &&
            this.state === GameStates.PLAYING &&
            now - this.player.lastShotTime >= 300
          ) {
            this.player.shoot();
            sounds.shoot.currentTime = 0;
            sounds.shoot.play();
            this.player.lastShotTime = now;
          }
        }
      }

      this.draggingPlayer = false;
    });

    pausePlayIcon.addEventListener("click", () => {
      if (this.state === GameStates.PLAYING) {
        this.setState(GameStates.PAUSED);
        pausePlayIcon.src = "/assets/images/play.png";
      } else if (this.state === GameStates.PAUSED) {
        this.setState(GameStates.PLAYING);
        pausePlayIcon.src = "/assets/images/pause.png";
        requestAnimationFrame(this.start.bind(this));
      }
    });

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
      preventOverlap(this.player, this.volumeIconBounds);
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
    this.drawVolumeIcon();

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

  start(timeStamp) {
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

  setState(newState) {
    this.state = newState;

    if (newState === GameStates.GAME_OVER || newState === GameStates.LOADING) {
      pausePlayIcon.style.display = "none";
    } else if (newState === GameStates.PLAYING || newState === GameStates.PAUSED) {
      pausePlayIcon.style.display = "block";
    }
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
          requestAnimationFrame(this.start.bind(this));
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
    const fontSize = Math.max(12, CANVAS_WIDTH() * 0.0015);
    const margin = CANVAS_WIDTH() * 0.095;
    const lineHeight = fontSize + 10;

    const gradient = ctx.createLinearGradient(
      CANVAS_WIDTH() - margin, lineHeight,
      CANVAS_WIDTH() - margin + 150, lineHeight
    );
    gradient.addColorStop(0, "#8B4513");
    gradient.addColorStop(1, "#CD853F");
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = gradient;

    ctx.textAlign = "right";
    ctx.fillText(`Score: ${this.player.score}`, CANVAS_WIDTH() - 20, lineHeight);
    ctx.fillText(`Level: ${this.currentLevel}`, CANVAS_WIDTH() - 20, lineHeight * 2);
    ctx.fillText(`High Score: ${this.highScore}`, CANVAS_WIDTH() - 20, lineHeight * 3);

  }

  drawVolumeIcon() {
    const iconSize = 24;
    const x = CANVAS_WIDTH() - iconSize - 12;
    const y = CANVAS_HEIGHT() - iconSize - 12;

    const icon = this.soundEnabled ? images.volumeOn : images.volumeOff;
    ctx.drawImage(icon, x, y, iconSize, iconSize);
    this.volumeIconBounds = { x, y, width: iconSize, height: iconSize };

  }

  // Handle Volume Mobile interaction
  handleVolumeToggle(x, y) {
    const b = this.volumeIconBounds;
    if (b && x >= b.x && x <= b.x + b.width &&
            y >= b.y && y <= b.y + b.height) {
      this.toggleSound();
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
    ctx.clearRect(0, 0, CANVAS_WIDTH(), CANVAS_HEIGHT())
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
      levelUpScreen.classList.add('visible');
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

    if (lowestY >= (CANVAS_HEIGHT() + playerHeight)) {
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

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    for (let key in sounds) { 
      if (key === "radioChatter" || key === "victorySound") continue;
      sounds[key].muted = !this.soundEnabled; 
    }
  }


  handleResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.canvas.width = CANVAS_WIDTH();
    this.canvas.height = CANVAS_HEIGHT();

    this.draw();
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
        this.soundEnabled = true;
        for (let key in sounds) {
          sounds[key].muted = false;
        }

        this.init();
      }, 5000);
    });
  
  }
}

const canvas = document.getElementById('game-screen');
const game = new Game(canvas);
const ctx = canvas.getContext('2d');

window.onload = () => {
  game.init();
  setTimeout(() => {
    document.getElementById('loading-start-screen').classList.remove('visible'); 
    document.getElementById('start-screen').classList.add('visible');
  }, 1500)
}

window.addEventListener('resize', () => {
  this.canvas.width = CANVAS_WIDTH(); 
  this.canvas.height = CANVAS_HEIGHT(); 
  this.player.resetPosition();
  this.draw();
});


