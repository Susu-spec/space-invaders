/**
 * @file utils/constants.mjs
 * @game Space Invaders
 * @author Suwayba
 * @date 2025-05-27
 * 
 * @description 
 * Const definitions used across files. 
 */



export const ZOOM_DURATION = 1;
export const MAX_ZOOM = 1.5;

export const canvas = document.getElementById('game-screen');
export const gameOverScreen = document.getElementById('game-over-screen');
export const scoreTracker = document.getElementById('score');
export const playAgain = document.getElementById('play-again-link');
export const startScreen = document.getElementById('start-screen');

export let canvasSize = {
  width: window.innerWidth,
  height: window.innerHeight,
};

export const CENTER_X = () => canvasSize.width / 2;
export const CENTER_Y = () => canvasSize.height / 2;
export const VIRTUAL_WIDTH = 800;
export const VIRTUAL_HEIGHT = 600;

export let scale = { 
  x: 1,
  y: 1
}

export const GameStates = {
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver'
}

export let keys = {};