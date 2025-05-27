/**
 * Loads an image and resolves when it's ready.
 * 
 * @param {string} src - Path to image
 * @returns {Promise<HTMLImageElement>}
 */
export const createImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
};
  

/**
 * Checks whether window width is within the range of 0 and 768
 * @returns {boolean} 
 */
export function isMobile() {
    return window.innerWidth <= 768;
}

/**
 * Clamps a value to the max value of value, min and max
 * 
 * @param {number} value 
 * @param {number} min
 * @param {number} max 
 * @returns {number} - Maximum value between value and thresholds
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

/**
 * 
 * @param {number} min - Minimum value to randomize within
 * @param {number} max - Maximum value to randomize within
 * @returns {number} - rounded down and largest integer less than or equal to random number
 */

export function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 10)) + min;
}

/**
 * 
 * @param {number} value 
 * @param {number} min 
 * @param {number} max 
 * @returns {number} - value within the range of or equal to min and max
 */
export function valueInRange(value, min, max) {
    return (value <= max) && (value >= min);
}

/**
 * Conditionally computes the given number based 
 * on the arg being greater than 0.5 or not
 * @param {number} x 
 * @returns {number}
 */
export function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}


/**
 * Determines whether both objects are within the range of each other
 * 
 * @param {Object} a - Game entity one
 * @param {Object} b - Game entity two
 * @returns {boolean} - True if objects are within each other's range
 */
export function isColliding(a, b) {
    return (
        a.position.x <= b.position.x + b.clipRect.width &&
        a.position.x + a.clipRect.width >= b.position.x &&
        a.position.y <= b.position.y + b.clipRect.height &&
        a.position.y + a.clipRect.height >= b.position.y
    );
}


/**
 * Draws box around game entity - Used for bounding area debugging
 * @param {Object} entity - Game entity object including player, laser, enemy..
 * @param {string} color - Color of borders
 * @param {CanvasRenderingContext2D} ctx - Canvas initialized in main entry file
 */

export function drawDebugBox(entity, color = 'red', ctx) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.strokeRect(entity.position.x, entity.position.y, entity.clipRect.width, entity.clipRect.height);
    ctx.restore();
}



/**
 * Increases the volume of an audio element over an interval
 * 
 * @param {HTMLAudioElement} audio 
 * @param {number} duration - Number of seconds before song is played at full volume
 */

export function fadeInSound(audio, duration = 2000) {
    audio.volume = 0;
    audio.play();
    const step = 0.01;
    const interval = duration / (1 / step);

    const fade = setInterval(() => {
        if (audio.volume < 0.3) {
        audio.volume += step;
        } else {
        clearInterval(fade);
        }
    }, interval)
}



/**
 * Sets paragraph text based on screen width
 */
export function changeStartTextOnScreenSize() {
    const startParagraph = document.querySelector('#start-screen p');
    if (isMobile() === true) {
        startParagraph.textContent = 'Tap the screen to Play!'
    } else {
        startParagraph.textContent = 'Press Enter to Play!'
    }
}

export function resizeCanvas() {
    changeStartTextOnScreenSize();
    if (player) {
        player.drawEntityOnResize();
    }
}



/**
 * Handles collision detection between player bullets and alien enemies.
 * If a collision occurs, the alien is marked as dying and the bullet is destroyed.
 * The player's score increases based on the alien's point value.
 *
 * @param {Array<GameEntity>} bullets - Array of active bullets fired by the player.
 * @param {Array<AnimatedGameEntity>} aliens - Array of active alien enemies.
 * @param {Player} player - The player object with score and game state.
 * @param {HTMLImageElement} alienDeadImage - The image to show when an alien dies.
*/

export function handlePlayerBulletsAlienCollision(bullets, aliens, player, alienDeadImage) {
    for (let bullet of bullets) {
        for (let alien of aliens) {
            if (bullet.alive && alien.alive && isColliding(bullet, alien)) {
                player.score += alien.points;

 
                alien.dying = true;
                alien.deathTimer = 0.5;
                alien.img = alienDeadImage;
                bullet.alive = false;
            }
        }
    }
}


/**
 * Handles collision detection between a player and alien lasers
 * 
 * 1. If a player has no lives, the function does not run (Safety check)
 * 2. For every live laser, check if a laser is within range of the player
 * 3. Check if the player is currently in a state where it can not be shot (invincible)
 * 4. Execute and break out of the loop
 * @property invincible is set to avoid lives being lost in a very short time frame
 * 
 * @param {Array<GameEntity>} lasers - Array of active lasers fired by the aliens.
 * @param {Array<AnimatedGameEntity>} aliens - Array of active alien enemies.
 * @param {Object<Player>} player - The player object with score and game state.
 * @param {HTMLAudioElement} playerDeadSound - The sound played when a player dies
 * @param {HTMLImageElement} playerDeadImage - The image to show when a player dies.
 */
export function handleAlienLasersPlayerCollision(lasers, player, playerDeadSound, playerDeadImage) {
    if (player.lives <= 0) return;

    for (let laser of lasers) {
        if (!player.invincible && 
            laser.alive && 
            player.lives > 0 && 
            isColliding(laser, player)
        ) {
            playerDeadSound.currentTime = 0;
            playerDeadSound.play();

            player.lives -= 1;
            player.dying = true;
            player.deathTimer = 0.8;
            player.invincible = true;
            player.invincibleTimer = 2;
            player.img = playerDeadImage;

            laser.alive = false;
            break;
        }
    }
}


/**
 * Check if an alien has reached the bottom of the canvas (right above the player)
 * 
 * 1. For every alien within the array
 * 2. Check if the alien is alive and 
 * 3. check if its vertical position is greater than the lowest y position set
 * 4. Loop until the largest y position (y increases downwards because starts at top left)
 * 
 * @param {Array} aliens 
 * @returns {number}
 */

export function handleAliensPlayerCollision(aliens) {
    let lowestY = 0;

    for (let alien of aliens) {
        if (alien.alive && alien.position.y > lowestY) {
            lowestY = alien.position.y;
        }
    }
    return lowestY;
}


/**
 * Triggers a game over state
 * 
 * @param {object} game - Game object created from game class
 * @param {object} sounds - Contains all sound files
 */
export function triggerGameOver(game, sounds) {
    game.setState('gameOver');
    sounds.playerDead.play();
    game.gameOver();
}