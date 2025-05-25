export function isMobile() {
    return window.innerWidth <= 768;
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

export function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 10)) + min;
}

export function valueInRange(value, min, max) {
    return (value <= max) && (value >= min);
}

export function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// aabb collision detection allows edge contact when in range
// Used clipRect to get more accurate size (size used to draw image)
export function isColliding(a, b) {
    return (
        a.position.x <= b.position.x + b.clipRect.width &&
        a.position.x + a.clipRect.width >= b.position.x &&
        a.position.y <= b.position.y + b.clipRect.height &&
        a.position.y + a.clipRect.height >= b.position.y
    );
}

export function isCollidingNow(a, b) {
    const aBounds = getBounds(a)
    const bBounds = getBounds(b)
  
    // Basically if the farthest edge of one of them is not touching at least the smallest edge of the other, then they disconnect.
    // ___
    //        _____ :white_check_mark: at least one far end touches one near end
    //    __ :white_check_mark: at least one far end touches one near end
    ///          ____ :x: No edge intersects
  
    const xDisconnects = aBounds.maxX < bBounds.minX || bBounds.maxX < aBounds.minX;
    const yDisconnects = aBounds.maxY < bBounds.minY || bBounds.maxY < aBounds.minY;
  
    const xIntersects = !xDisconnects;
    const yIntersects = !yDisconnects;
  
    return xIntersects && yIntersects;
}
  
export function getBounds(object){
    return {
      minX: object.position.x,
      maxX: object.position.x + object.clipRect.width,
      minY: object.position.y,
      maxY: object.position.y + object.clipRect.height
    }
}

export function drawDebugBox(entity, color = 'red') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.strokeRect(entity.position.x, entity.position.y, entity.clipRect.width, entity.clipRect.height);
    ctx.restore();
}

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



export function changeStartTextOnScreenSize() {
    const startParagraph = document.querySelector('#start-screen p');
    if (isMobile() === true) {
        startParagraph.textContent = 'Tap the screen to Play!'
    } else {
        startParagraph.textContent = 'Press Enter to Play!'
    }
}

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    changeStartTextOnScreenSize();
    if (player) {
        player.drawEntityOnResize();
    }
}

export function handlePlayerBulletsAlienCollision(bullets, aliens, player, alienDeadImage) {
    // uses let .. of ... to return objects
    // let ... in ... returns indices
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

export function handleAlienLasersPlayerCollision(lasers, player, playerDeadSound, playerDeadImage) {
    if (player.lives <= 0) return;

    for (let laser of lasers) {
        if (!player.invincible && player.lives > 0 && isColliding(laser, player)) {
            playerDeadSound.currentTime = 0;
            playerDeadSound.play();

            player.lives -= 1;
            player.dying = true;
            player.deathTimer = 0.5;
            player.invincible = true;
            player.invincibleTimer = 2;
            player.img = playerDeadImage;

            laser.alive = false;
            break;
        }
    }
}

export function handleAliensPlayerCollision(aliens) {
    let lowestY = 0;

    for (let alien of aliens) {
        if (alien.alive && alien.position.y > lowestY) {
            lowestY = alien.position.y;
        }
    }
    return lowestY;
}

export function triggerGameOver(game, sounds) {
    game.setState('gameOver');
    sounds.playerDead.play();
    game.gameOver();
}