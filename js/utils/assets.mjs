/**
 * @file utils/assets.mjs
 * @game Space Invaders
 * @author Suwayba
 * @date 2025-05-27
 * 
 * @description 
 * Assets including images, sounds, and positions and sizes
 * for defined objects, aliens, bullets, player
 */

import { createImage } from "./helpers.mjs";

/**
 * @constant
 * @type Object
 * @description Alien image objects
 */

const ALIEN_IMAGE_TYPE_5 = await createImage('./assets/images/enemy-one-down.jpg');
const ALIEN_IMAGE_TYPE_4 = await createImage('./assets/images/enemy-two-down.jpg');
const ALIEN_IMAGE_TYPE_3 = await createImage('./assets/images/enemy-three-down.jpg');
const ALIEN_IMAGE_TYPE_2 = await createImage('./assets/images/enemy-three.jpg');
const ALIEN_IMAGE_TYPE_1 = await createImage('./assets/images/enemy-two.jpg');

/**
 * @constant
 * @type Array
 * @description All created alien images
 */

export const ALIEN_IMAGES = [
  ALIEN_IMAGE_TYPE_5,
  ALIEN_IMAGE_TYPE_4,
  ALIEN_IMAGE_TYPE_3,
  ALIEN_IMAGE_TYPE_2,
  ALIEN_IMAGE_TYPE_1,
];

/**
 * @constant
 * @type Array
 * @description Points assigned to aliens
 */

export const ALIEN_POINTS = [50, 40, 30, 20, 10];


/**
 * @constant
 * @type Object
 * @property {Object} images - All images used to visually render game entities
 * @property {Object} sounds - All sounds used
 * @property {Object} clipRect - Areas used by canvas to visually render game entities
 */

export const Assets = {
  images: {
    player: await createImage('./assets/images/player.jpg'),
    bullet: await createImage('./assets/images/player-projectile.jpg'),
    laser: await createImage('./assets/images/laser.jpg'),
    playerDeath: await createImage('./assets/images/player-death.jpg'),
    enemyDeath: await createImage('./assets/images/enemy-death.jpg'),
    volumeOff: await createImage('./assets/images/volume-down.png'),
    volumeOn: await createImage('./assets/images/volume-up.png'),
    play: await createImage('./assets/images/play.png'),
    pause: await createImage('./assets/images/pause.png')
  },
  sounds: {
    shoot: new Audio('./assets/sounds/shoot.wav'),
    playerDead: new Audio('./assets/sounds/player-dead.wav'),
    invaderDead: new Audio('./assets/sounds/invader-killed.wav'),
    gameOverSound: new Audio('./assets/sounds/game-over.wav'),
    victorySound: new Audio('./assets/sounds/victory-sound.mp3'),
    radioChatter: new Audio('/assets/sounds/radio-chatter.mp3'),
    background: new Audio('./assets/sounds/space-invaders-background.mpeg')
  },
  clipRect: {
    player: { x: 0, y: 0, width: 50, height: 40 },
    alien: { x: 0, y: 0, width: 25, height: 25 },
    bullet: { x: 0, y: 0, width: 20, height: 20 }
  },
}