
var game = new Phaser.Game(160, 144, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render });

function preload() {

    game.load.image('bullet', 'assets/img/bullet.png');
    game.load.spritesheet('jump_target', 'assets/img/target.png', 18, 19);
    game.load.image('enemyBullet', 'assets/img/enemy-bullet.png');
    game.load.spritesheet('invader', 'assets/img/invader32x32x4.png', 32, 32);
    game.load.image('ship', 'assets/img/player.png');
    game.load.spritesheet('flea', 'assets/img/flea.png', 16, 33);
    //game.load.spritesheet('flea_hop', 'assets/img/flea_small_hop.png', 16, 33);
    game.load.spritesheet('kaboom', 'assets/img/explode.png', 128, 128);
    game.load.image('midbg', 'assets/img/terrain1.png');
    game.load.image('bg', 'assets/img/background1.png');
    game.load.image('hud', 'assets/img/frame1.png');

    game.load.audio('explosion', 'assets/sfx/explosion.mp3');
    game.load.audio('blaster', 'assets/sfx/blaster.mp3');
}

var player;
var PLAYER_SPEED = 150;
var PLAYER_GRAVITY = 600;
var PLAYER_ACCEL = 40;
var TARGET_ACCEL = 20;
var PLAYER_FRIC = 0.8;
var TARGET_FRIC = 0.92;
var FLOOR_Y = 76;
var BOUND_X = 10;
var playerJumpTarget = null;
var aliens;
var bullets;
var bulletTime = 0;
var cursors;
var aButton;
var explosions;
var bg;
var midbg;
var hud;
var score = 0;
var scoreString = '';
var enemyBullet;
var firingTimer = 0;
var livingEnemies = [];

var explosionSnd;
var blasterSnd;

function create() {
  // scale the game 4x
  game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;  
  game.scale.setUserScale(3, 3);

  // enable crisp rendering
  game.renderer.renderSession.roundPixels = true;  
  Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);

  game.physics.startSystem(Phaser.Physics.ARCADE);
  bg = game.add.sprite(0, 0, 'bg');
  midbg = game.add.sprite(0, 0, 'midbg');
  hud = game.add.sprite(0, 0, 'hud');
  createPlatformZone();
}

function createPlatformZone () {

  //  Our bullet group
  bullets = game.add.group();
  bullets.enableBody = true;
  bullets.physicsBodyType = Phaser.Physics.ARCADE;
  bullets.createMultiple(30, 'bullet');
  bullets.setAll('anchor.x', 0.5);
  bullets.setAll('anchor.y', 1);
  bullets.setAll('outOfBoundsKill', true);
  bullets.setAll('checkWorldBounds', true);

  // The enemy's bullets
  enemyBullets = game.add.group();
  enemyBullets.enableBody = true;
  enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
  enemyBullets.createMultiple(30, 'enemyBullet');
  enemyBullets.setAll('anchor.x', 0.5);
  enemyBullets.setAll('anchor.y', 1);
  enemyBullets.setAll('outOfBoundsKill', true);
  enemyBullets.setAll('checkWorldBounds', true);

  //  The hero!
  player = game.add.sprite(30, FLOOR_Y, 'flea');
  player.animations.add('hop', [0, 1, 2, 3, 4, 5, 6], 10, false);
  player.animations.add('idle', [7, 8, 9], 10, true);
  player.animations.play('idle');
  game.physics.enable(player, Phaser.Physics.ARCADE);
  player.inAir = false;

  //  The baddies!
  aliens = game.add.group();
  aliens.enableBody = true;
  aliens.physicsBodyType = Phaser.Physics.ARCADE;

  //createAliens();

  explosionSnd = game.add.audio('explosion');
  blasterSnd = game.add.audio('blaster');

  //  An explosion pool
  explosions = game.add.group();
  explosions.createMultiple(30, 'kaboom');
  explosions.forEach(setupInvader, this);

  //  And some controls to play the game with
  cursors = game.input.keyboard.createCursorKeys();
  aButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
  
}

function createAliens () {

    for (var y = 0; y < 4; y++)
    {
        for (var x = 0; x < 10; x++)
        {
            var alien = aliens.create(x * 48, y * 50, 'invader');
            alien.anchor.setTo(0.5, 0.5);
            alien.animations.add('fly', [ 0, 1, 2, 3 ], 20, true);
            alien.play('fly');
            alien.body.moves = false;
        }
    }

    aliens.x = 100;
    aliens.y = 50;

    //  All this does is basically start the invaders moving. Notice we're moving the Group they belong to, rather than the invaders directly.
    var tween = game.add.tween(aliens).to( { x: 200 }, 2000, Phaser.Easing.Linear.None, true, 0, 1000, true);

    //  When the tween loops it calls descend
    tween.onLoop.add(descend, this);
}

function setupInvader (invader) {

    invader.anchor.x = 0.5;
    invader.anchor.y = 0.5;
    invader.animations.add('kaboom');

}

function descend() {

    aliens.y += 10;

}

function setJumpTarget (x, y) {
  if (!playerHasJumpTarget()) {
    playerJumpTarget = game.add.sprite(x, y, 'jump_target');
    game.physics.enable(playerJumpTarget, Phaser.Physics.ARCADE);
    playerJumpTarget.animations.add('blink', [ 0, 1], 20, true);
    playerJumpTarget.play('blink');
  }
  playerJumpTarget.x = x;
  playerJumpTarget.y = y;
}

function playerHasJumpTarget () {
  return null !== playerJumpTarget;
}

function deletePlayerJumpTarget () {
  if (playerHasJumpTarget()) {
    playerJumpTarget.destroy();
    playerJumpTarget = null;
  }
}

function update() {
  if (player.alive)
  {
    if (player.inAir) {
      player.body.gravity.y = PLAYER_GRAVITY;
      if (player.y > FLOOR_Y) {
        player.body.gravity.y = 0;
        player.body.velocity.y = 0;
        player.y = FLOOR_Y;
        player.inAir = false;
      }
    } else {
      player.body.gravity.y = 0;
      player.y = FLOOR_Y;
    }

    if (!playerHasJumpTarget()) {
      if (!player.inAir) {
        if (cursors.left.isDown && !cursors.right.isDown)
        {
          player.body.velocity.x = Math.max(-PLAYER_SPEED, player.body.velocity.x - PLAYER_ACCEL);
        }
        else if (cursors.right.isDown && !cursors.left.isDown)
        {
          player.body.velocity.x = Math.min(PLAYER_SPEED, player.body.velocity.x + PLAYER_ACCEL);
        } else {
          player.body.velocity.x = player.body.velocity.x * PLAYER_FRIC;
        }
        if (aButton.isDown) {
          setJumpTarget(player.x, player.y - 5);
        }
      }
    } else {
      // targeting jump
      player.body.velocity.x = player.body.velocity.x * PLAYER_FRIC;
      playerJumpTarget.body.velocity.x = playerJumpTarget.body.velocity.x * TARGET_FRIC;
      playerJumpTarget.body.velocity.y = playerJumpTarget.body.velocity.y * TARGET_FRIC;
      playerJumpTarget.body.velocity.y += (30 - playerJumpTarget.y);
      playerJumpTarget.body.velocity.x += (80 - playerJumpTarget.x) / 3;
      if (cursors.left.isDown && !cursors.right.isDown)
      {
        playerJumpTarget.body.velocity.x -= TARGET_ACCEL;
      }
      else if (cursors.right.isDown && !cursors.left.isDown)
      {
        playerJumpTarget.body.velocity.x += TARGET_ACCEL;
      }
      if (cursors.up.isDown && !cursors.down.isDown)
      {
        playerJumpTarget.body.velocity.y -= TARGET_ACCEL;
      }
      else if (cursors.down.isDown && !cursors.up.isDown)
      {
        playerJumpTarget.body.velocity.y += TARGET_ACCEL;
      }
      if (!aButton.isDown) {
        player.body.velocity.y = (playerJumpTarget.y - player.y) * 4;
        player.body.velocity.x = (playerJumpTarget.x - player.x) * 3;
        deletePlayerJumpTarget();
        player.inAir = true;
        player.animations.play("hop").onComplete.addOnce(function () {
          player.animations.play("idle");
        });
      }
    }

    if (player.x < BOUND_X) {
      player.x = BOUND_X;
      player.body.velocity.x = Math.max(0, player.body.velocity.x);
    } else if (player.x > 144 - BOUND_X) {
      player.x = 144 - BOUND_X;
      // want negative velocity
      player.body.velocity.x = Math.min(0, player.body.velocity.x);
    }
    if (player.y > FLOOR_Y) {
      player.y = FLOOR_Y;
      player.body.velocity.y = Math.min(0, player.body.velocity.y);
    } 

    if (game.time.now > firingTimer)
    {
        enemyFires();
    }

    //  Run collision
    game.physics.arcade.overlap(bullets, aliens, collisionHandler, null, this);
    game.physics.arcade.overlap(enemyBullets, player, enemyHitsPlayer, null, this);
  }

}

function render() {

    // for (var i = 0; i < aliens.length; i++)
    // {
    //     game.debug.body(aliens.children[i]);
    // }

}

function collisionHandler (bullet, alien) {

    //  When a bullet hits an alien we kill them both
    bullet.kill();
    alien.kill();

    //  Increase the score
    score += 20;

    //  And create an explosion :)
    var explosion = explosions.getFirstExists(false);
    explosion.reset(alien.body.x, alien.body.y);
    explosion.play('kaboom', 30, false, true);
    explosionSnd.play();

    if (aliens.countLiving() == 0)
    {

        enemyBullets.callAll('kill',this);

        //the "click to restart" handler
        game.input.onTap.addOnce(restart,this);
    }

}

function enemyHitsPlayer (player,bullet) {
    
    bullet.kill();

    if (live)
    {
        live.kill();
    }

    //  And create an explosion :)
    var explosion = explosions.getFirstExists(false);
    explosion.reset(player.body.x, player.body.y);
    explosion.play('kaboom', 30, false, true);

    

}

function enemyFires () {

    //  Grab the first bullet we can from the pool
    enemyBullet = enemyBullets.getFirstExists(false);

    livingEnemies.length=0;

    aliens.forEachAlive(function(alien){

        // put every living enemy in an array
        livingEnemies.push(alien);
    });


    if (enemyBullet && livingEnemies.length > 0)
    {
        
        var random=game.rnd.integerInRange(0,livingEnemies.length-1);

        // randomly select one of them
        var shooter=livingEnemies[random];
        // And fire the bullet from this enemy
        enemyBullet.reset(shooter.body.x, shooter.body.y);

        game.physics.arcade.moveToObject(enemyBullet,player,120);
        firingTimer = game.time.now + 2000;
    }

}

function fireBullet () {

    //  To avoid them being allowed to fire too fast we set a time limit
    if (game.time.now > bulletTime)
    {
        blasterSnd.play();
        //  Grab the first bullet we can from the pool
        bullet = bullets.getFirstExists(false);

        if (bullet)
        {
            //  And fire it
            bullet.reset(player.x, player.y + 8);
            bullet.body.velocity.y = -400;
            bulletTime = game.time.now + 200;
        }
    }

}

function resetBullet (bullet) {

    //  Called if the bullet goes out of the screen
    bullet.kill();

}

function restart () {

    //  A new level starts
    
    //  And brings the aliens back from the dead :)
    aliens.removeAll();
    createAliens();

    //revives the player
    player.revive();

}
