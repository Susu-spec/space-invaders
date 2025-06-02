/**
 * @file utils/levels.mjs
 * @game Space Invaders
 * @author Suwayba
 * @date 2025-05-27
 * 
 * @description
 * Game difficulty level configurations
 */

/**
 * Game difficulty level configuration
 * 
 * @constant
 * @type {Object}
 * @property {number} id - Level id
 * @property {string} name - Level name
 * @property {number} alienSpeed - Speed aliens move at current level
 * @property {number} spacing - Spacing between aliens within alienGrid
 */

export const levels = [
  {
    id: 1,
    name: 'Beginner',
    alienSpeed: 45,
    spacing: 35,
  },
  {
    id: 2,
    name: 'Intermediate',
    alienSpeed: 60,
    spacing: 40,
  },
  {
    id: 3,
    name: 'Advanced',
    alienSpeed: 90,
    spacing: 45,
  },
];