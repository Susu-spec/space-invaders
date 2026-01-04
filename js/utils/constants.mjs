/**
 * @file utils/constants.mjs
 * @game Space Invaders
 * @author Suwayba
 * @date 2025-05-27
 * 
 * @description 
 * Const definitions used across files. 
 */

export const CANVAS_WIDTH = () => window.innerWidth;
export const CANVAS_HEIGHT = () => window.innerHeight;
export const CENTER_X = CANVAS_WIDTH / 2;
export const CENTER_Y = CANVAS_HEIGHT / 2;

export const ZOOM_DURATION = 1;
export const MAX_ZOOM = 1.5;

export const gameOverScreen = document.getElementById('game-over-screen');
export const gameOverTitle = document.getElementById('game-over-title');
export const scoreTracker = document.getElementById('score');
export const playAgain = document.getElementById('play-again-link');
export const startScreen = document.getElementById('start-screen');
export const pausePlayIcon = document.getElementById("pausePlayIcon");

export const GameStates = {
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver'
}

export let keys = {};