
var game = new Phaser.Game(160, 144, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render });

function preload() {
    game.load.spritesheet('title', 'assets/img/title_screen_sheet.png', 160, 144);

    game.load.image('bullet', 'assets/img/bullet.png');
    game.load.spritesheet('jump_target', 'assets/img/target.png', 18, 19);
    game.load.spritesheet('pug_target', 'assets/img/weak_point.png', 16, 15);
    game.load.image('enemyBullet', 'assets/img/enemy-bullet.png');
    game.load.spritesheet('pug_projectile', 'assets/img/projectile_sheet.png', 23, 22);
    game.load.spritesheet('invader', 'assets/img/invader32x32x4.png', 32, 32);
    game.load.image('ship', 'assets/img/player.png');
    game.load.spritesheet('flea', 'assets/img/flea_small.png', 16, 33);
    game.load.spritesheet('pug', 'assets/img/dog_sheet_final.png', 97, 103);
    //game.load.spritesheet('flea_hop', 'assets/img/flea_small_hop.png', 16, 33);
    game.load.spritesheet('kaboom', 'assets/img/explode.png', 128, 128);
    game.load.image('midbg', 'assets/img/terrain1.png');
    game.load.image('bg', 'assets/img/background1.png');
    game.load.image('hud', 'assets/img/frame1.png');
    game.load.spritesheet('hud_heart', 'assets/img/Health_Heart_sheet.png', 25, 20);
    game.load.spritesheet('hud2_meter', 'assets/img/screen2_meter_sheet.png', 109, 23);
    game.load.spritesheet('flea_big', 'assets/img/flea_big.png', 160, 144);

    game.load.audio('explosion', 'assets/sfx/explosion.mp3');
    game.load.audio('blaster', 'assets/sfx/blaster.mp3');
}

var player;
var playerHealth;
var PLAYER_SPEED = 150;
var PLAYER_GRAVITY = 600;
var PLAYER_ACCEL = 40;
var TARGET_ACCEL = 20;
var PLAYER_FRIC = 0.8;
var TARGET_FRIC = 0.92;
var FLOOR_Y = 97;
var CEIL_Y = 6;
var BOUND_X = 10;
var playerJumpTarget = null;

var pug;
var pugAlive = true;
var POSSIBLE_TARGET_POS = [[100, 30], [80, 20]];
var NUM_TARGETS = 3;
var targetPositions = null;
var pugTargets;

var pointerTargetting = false;

function pickTargets () {
  if (targetPositions !== null) {
    return;
  }
  targetPositions = []
  var count = Math.min(NUM_TARGETS, POSSIBLE_TARGET_POS.length)
  for (var i = 0; i < count; i += 1) {
    var targetPosIndex = getRandomInt(0, POSSIBLE_TARGET_POS.length)
    targetPositions.push(POSSIBLE_TARGET_POS[targetPosIndex])
    POSSIBLE_TARGET_POS.splice(targetPosIndex, 1)
  }
}

function instantiateTargets () {
  pugTargets = game.add.group();
  pugTargets.enableBody = true;
  pugTargets.physicsBodyType = Phaser.Physics.ARCADE;
  //pugTargets.createMultiple(targetPositions.length, 'pug_target');
  for (var i = 0; i < targetPositions.length; i++){
    var targ = pugTargets.create(targetPositions[i][0], targetPositions[i][1],
        'pug_target');
    targ.anchor.setTo(0.5, 0.5);
    targ.animations.add('idle', null, 10, true);
    targ.play('idle');
    targ.body.moves = false;
  }
}

var whichScene;
var SCENE_TITLE = 1;
var SCENE_PLATFORM = 2;
var SCENE_FIGHT = 3;

var titleScreen;

var bigPlayer;
var bigAttackAmt;
var bigAttackHud;

var aliens;
var bullets;
var bulletTime = 0;
var explosions;
var bg;
var midbg;
var hud;
var hudHeart;
var score = 0;
var scoreString = '';
var enemyBullet;
var firingTimer = 0;
var livingEnemies = [];
var pugAttackTimeout = null;
var stopPunchingTimeout = null;
var lastPunchPressed = 'b';

var explosionSnd;
var blasterSnd;

var cursors;
var aButton;
var bButton;

function create() {
  //  And some controls to play the game with
  cursors = game.input.keyboard.createCursorKeys();
  aButton = game.input.keyboard.addKey(Phaser.KeyCode.Z);
  aButton.onDown.add(pressedA);
  aButton.onUp.add(releasedA);
  bButton = game.input.keyboard.addKey(Phaser.KeyCode.X);
  bButton.onDown.add(pressedB);
  bButton.onUp.add(releasedB);
  // set max pointers to 1
  pointer = game.input.maxPointers = 1
  //pointer setup
  game.input.onDown.add(beginPointerTarget);
  game.input.onUp.add(releasedA);

  // scale the game 4x
  game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
  game.scale.setUserScale(3, 3);

  // enable crisp rendering
  game.renderer.renderSession.roundPixels = true;
  Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);

  game.physics.startSystem(Phaser.Physics.ARCADE);

  explosionSnd = game.add.audio('explosion');
  blasterSnd = game.add.audio('blaster');

  pickTargets();
  createTitleScreen();
}

function unloadLevel () {
  game.world.removeAll(true);
  clearTimeout(pugAttackTimeout);
  clearTimeout(stopPunchingTimeout);
}

function createTitleScreen () {
  unloadLevel();
  whichScene = SCENE_TITLE;

  titleScreen = game.add.sprite(0, 0, 'title');
  titleScreen.animations.add('enter', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 10, false);
  titleScreen.animations.add('idle', [17, 18, 19], 10, true);
  titleScreen.animations.play("enter").onComplete.addOnce(function () {
    titleScreen.animations.play("idle");
  });
}

function createPlatformLevel () {
  unloadLevel();
  whichScene = SCENE_PLATFORM;

  bg = game.add.sprite(0, 0, 'bg');
  midbg = game.add.sprite(0, 0, 'midbg');
  hud = game.add.sprite(0, 0, 'hud');

  //  Our bullet group
  bullets = game.add.group();
  bullets.enableBody = true;
  bullets.physicsBodyType = Phaser.Physics.ARCADE;
  bullets.createMultiple(30, 'bullet');
  bullets.setAll('anchor.x', 0.5);
  bullets.setAll('anchor.y', 1);
  bullets.setAll('outOfBoundsKill', true);
  bullets.setAll('checkWorldBounds', true);

  pug = game.add.sprite(58, 6, 'pug');
  pug.animations.add('enter', [0, 1, 2, 3, 4], 5, false);
  pug.animations.add('exit', [4, 3, 2, 1, 0], 5, false);
  pug.animations.add('idle', [5, 6, 7], 10, true);
  pug.animations.add('lick', [8, 9, 10], 10, false);
  pug.animations.add('slam', [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 10, false);
  pug.animations.play("enter").onComplete.addOnce(function () {
    pug.animations.play("idle");
  });
  pugAttackTimeout = setTimeout(pugAttack, 3000)

  // The enemy's bullets
  enemyBullets = game.add.group();
  enemyBullets.enableBody = true;
  enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
  enemyBullets.createMultiple(30, 'pug_projectile');
  enemyBullets.setAll('anchor.x', 0.5);
  enemyBullets.setAll('anchor.y', 1);
  enemyBullets.setAll('outOfBoundsKill', true);
  enemyBullets.setAll('checkWorldBounds', true);


  instantiateTargets();

  hudHeart = game.add.sprite(80, 137, 'hud_heart');
  hudHeart.anchor.setTo(0.5, 1.0);
  hudHeart.animations.add('default', null, 0, false);
  hudHeart.animations.stop();
  hudHeart.animations.frame = 0;
  //  The hero!
  player = game.add.sprite(30, FLOOR_Y, 'flea');
  player.animations.add('idle', [0, 1, 2], 10, true);
  player.animations.add('walk', [3, 4, 5, 6, 7, 8, 9], 10, true);
  player.animations.add('hop_charge', [18, 19, 20], 10, true);
  player.animations.add('hop_start', [10, 11, 12], 10, false);
  player.animations.add('hop_loop', [13, 14], 10, true);
  player.animations.add('hop_end', [15, 16, 17], 10, false);
  player.animations.add('hit', [21, 22, 23, 24, 25, 26, 27, 28, 29], 10, false);
  player.animations.play('idle');
  player.anchor.setTo(0.5, 0.75);
  game.physics.enable(player, Phaser.Physics.ARCADE);
  player.inAir = false;
  playerHealth = 17;
  setPlayerHealth(playerHealth);

  //  An explosion pool
  explosions = game.add.group();
  explosions.createMultiple(30, 'kaboom');
  explosions.forEach(setupExplosion, this);
}

function createFightLevel () {
  unloadLevel();
  whichScene = SCENE_FIGHT;

  bigPlayer = game.add.sprite(0, 0, 'flea_big');
  bigPlayer.animations.add('idle', [0, 1, 2, 3, 4, 5, 6], 10, true);
  bigPlayer.animations.add('punch', [7, 8, 9, 10, 11, 12, 13], 10, true);
  bigPlayer.animations.play('idle');

  hud = game.add.sprite(0, 0, 'hud');

  bigAttackHud = game.add.sprite(10, 122, 'hud2_meter'); // frames 0-14 are for attack meter
  bigAttackHud.animations.add('default', null, 0, false);
  bigAttackHud.animations.stop();
  bigAttackHud.animations.frame = 0;
  setBigAttackAmt(0);
}


function setupExplosion (exp) {

    exp.anchor.x = 0.5;
    exp.anchor.y = 0.5;
    exp.animations.add('kaboom');

}

function pressedA (key) {
  if (null != player && player.alive) {
    if (!playerHasJumpTarget() && !player.inAir) {
      pointerTargetting = false;
      setJumpTarget(player.x, player.y - 5);
      player.animations.play("hop_charge");
    }
  }
  if (null != bigPlayer && bigPlayer.alive) {
    if (lastPunchPressed === 'b') {
      if (null != stopPunchingTimeout) {
        clearTimeout(stopPunchingTimeout);
      } else {
        bigPlayer.animations.play('punch');
      }
      stopPunchingTimeout = setTimeout(stopPunching, 500);
      lastPunchPressed = 'a';
      setBigAttackAmt(bigAttackAmt + 1);
    }
  }
}

function beginPointerTarget() {
  if (null != player && player.alive) {
    if (!playerHasJumpTarget() && !player.inAir) {
      pointerTargetting = true;
      setJumpTarget(game.input.activePointer.x, game.input.activePointer.y);
      player.animations.play("hop_charge");
    }
  }
}

function pressedB (key) {
  if (null != player && player.alive) {
    game.physics.arcade.overlap(player, pugTargets, grabTargetHandler, null, this);
  }
  if (null != bigPlayer && bigPlayer.alive) {
    if (lastPunchPressed === 'a') {
      if (null != stopPunchingTimeout) {
        clearTimeout(stopPunchingTimeout);
      } else {
        bigPlayer.animations.play('punch');
      }
      stopPunchingTimeout = setTimeout(stopPunching, 500);
      lastPunchPressed = 'b';
      setBigAttackAmt(bigAttackAmt + 1);
    }
  }
}

function releasedA (key) {
  if (null != player && player.alive) {
    if (playerHasJumpTarget()) {
      player.body.velocity.y = (playerJumpTarget.y - player.y) * 4;
      player.body.velocity.x = (playerJumpTarget.x - player.x) * 3;
      deletePlayerJumpTarget();
      player.inAir = true;
      player.animations.play("hop_start").onComplete.addOnce(function () {
        player.animations.play("hop_loop");
      });
    }
  } else if (whichScene == SCENE_TITLE) {
    createPlatformLevel();
  }
}

function releasedB (key) {
  if (null != player && player.alive) {
    grabbedTarget = false;
  } else if (whichScene == SCENE_TITLE) {
    createPlatformLevel();
  }
}

function explodeTarget (target) {
  //  And create an explosion :)
  var explosion = explosions.getFirstExists(false);
  explosion.reset(target.x, target.y);
  explosion.play('kaboom', 30, false, true);
  explosionSnd.play();
  target.kill();
  for (var i = 0; i < targetPositions.length; i++){
    if (target.x === targetPositions[i][0] && target.y === targetPositions[i][1]) {
      targetPositions.splice(i, 1);
      break;
    }
  }
  createFightLevel();
}

function pugAttack() {
  if (pugTargets.countLiving() === 0) {
    pugTargets.callAll('kill',this);
    pug.animations.play('exit', null, false, true)
    pugAlive = false;
    //the "click to restart" handler
    game.input.onTap.addOnce(restart,this);
  }
  if (!pugAlive) {
    console.log("pug is not alive!");
    return;
  }
  if (Math.random() < 0.5) {
    pug.animations.play('slam').onComplete.addOnce(function () {
      pug.animations.play("idle");
    });
    enemyFires(true);
  } else {
    pug.animations.play('lick').onComplete.addOnce(function () {
      pug.animations.play("idle");
    });
    enemyFires(false);
  }
  pugAttackTimeout = setTimeout(pugAttack, 2000 + 1000 * Math.random());
}

function setPlayerHealth (health) {
  playerHealth = health;
  hudHeart.frame = 17 - health;
  hudHeart.pause = true;
}

function setJumpTarget (x, y) {
  if (!playerHasJumpTarget()) {
    playerJumpTarget = game.add.sprite(x, y, 'jump_target');
    game.physics.enable(playerJumpTarget, Phaser.Physics.ARCADE);
    playerJumpTarget.animations.add('blink', [ 0, 1], 20, true);
    playerJumpTarget.play('blink');
  }
  playerJumpTarget.x = x - (playerJumpTarget.width * 0.5);
  playerJumpTarget.y = y - (playerJumpTarget.height * 0.5);
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

function setBigAttackAmt (amt) {
  if (amt == 14) {
    // TODO switch meters
    createPlatformLevel();
  } else {
    bigAttackAmt = amt;
    bigAttackHud.frame = 13 - amt;
    bigAttackHud.pause = true;
  }
}

function stopPunching () {
  bigPlayer.animations.play('idle');
  stopPunchingTimeout = null;
}

function update() {
  if (null != player && player.alive) {
    if (player.inAir) {
      player.body.gravity.y = PLAYER_GRAVITY;
      if (player.y > FLOOR_Y) {
        player.body.gravity.y = 0;
        player.body.velocity.y = 0;
        player.y = FLOOR_Y;
        player.inAir = false;
        player.animations.play("hop_end").onComplete.addOnce(function () {
          player.animations.play("idle");
        });
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
      }
    } else {
      // targeting jump
      if (!pointerTargetting) {
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
    } else if (player.y < CEIL_Y) {
      player.y = CEIL_Y;
      player.body.velocity.y = Math.max(0, player.body.velocity.y);
    }
    //  Run collision
    game.physics.arcade.overlap(enemyBullets, player, enemyHitsPlayer, null, this);
  }

  if (null != bigPlayer && bigPlayer.alive) {

  }
}

function render() {

    // for (var i = 0; i < aliens.length; i++)
    // {
    //     game.debug.body(aliens.children[i]);
    // }

}

var grabbedTarget = false;
function grabTargetHandler (player, pugTarget) {
  if (Math.abs(player.x - pugTarget.x) > 12 || Math.abs(player.y - pugTarget.y) > 12) {
    return;
  }
  if (grabbedTarget) {
    return;
  }
  grabbedTarget = true;
  explodeTarget(pugTarget);
}

function enemyHitsPlayer (player,bullet) {
  if (Math.abs(player.x - bullet.x) > 12 || Math.abs(player.y - bullet.y) > 12) {
    return;
  }
  bullet.kill();
  setPlayerHealth(playerHealth - 1);
  player.animations.play("hit").onComplete.addOnce(function () {
    player.animations.play("idle");
  });
}

var ENEMY_LEFT_SPOT = {x: 100, y: 100};
var ENEMY_DOWN_SPOT = {x: 90, y: 20};
function enemyFires (left) {

  //  Grab the first bullet we can from the pool
  enemyBullet = enemyBullets.getFirstExists(false);
  enemyBullet.animations.add('left', [0], 10, true);
  enemyBullet.animations.add('down', [1], 10, true);
  enemyBullet.animations.add('pop', [1], 10, false);
  if (left) {
    enemyBullet.reset(ENEMY_LEFT_SPOT.x, ENEMY_LEFT_SPOT.y);
    enemyBullet.animations.play("left");
    enemyBullet.body.velocity.x = -50;
  } else {
    enemyBullet.animations.play("down");
    enemyBullet.reset(ENEMY_DOWN_SPOT.x, ENEMY_DOWN_SPOT.y);
    enemyBullet.body.velocity.y = 50;
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
  createPlatformLevel();
}
