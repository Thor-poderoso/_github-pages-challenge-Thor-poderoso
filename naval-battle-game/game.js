const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let graphics;
let miniMapX = 550;
let miniMapY = 450;
let miniMapWidth = 240;
let miniMapHeight = 140;
let mapWidth = 1200;
let mapHeight = 800;
let health = 100;
let healthMax = 100;
let gold = 0;
let speed = 150;
let playerDamage = 10;
let enemyDamage = 10;
let graphics;
let reloadTime = 500;
let hullLevel = 1;
let cannonLevel = 1;
let sailLevel = 1;
let lastSpawn = 0;
let uiText;
let upgradeText;
const game = new Phaser.Game(config);

let player;
let cursors;
let playerBullets;
let enemyBullets;
let enemies;
let islands;
let uiText;
let health = 100;
let gold = 0;
let playerLastFired = 0;

function preload() {
    // Using simple colored rectangles as placeholders
    // In a real game, load actual images or generate graphics
    this.load.image('ship', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQIHWP4//8/zxhwIAIIAUHHMEzQALIAIwEbAADz1QRVDTkz8wAAAABJRU5ErkJggg=='); // Small blue square
    this.load.image('bullet', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='); // 1x1 white
    this.load.image('island', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQIHWNwAwYMjhIwIAIIAUHHiBkMQIMFAA+JQ0VDTkz8wAAAABJRU5ErkJggg=='); // Small green
}

function create() {
    // Create groups
    playerBullets = this.physics.add.group();
    enemyBullets = this.physics.add.group();
    enemies = this.add.group();
    islands = this.physics.add.staticGroup();

    // Add islands for obstacles
    islands.create(400, 200, 'island').setScale(10, 5).refreshBody(); // Adjust scale for visibility
    islands.create(100, 400, 'island').setScale(8, 3).refreshBody();
    islands.create(600, 500, 'island').setScale(12, 4).refreshBody();

    // Player ship
    player = this.physics.add.sprite(400, 500, 'ship');
    player.setCollideWorldBounds(true);
    player.setTint(0x0000ff); // Blue
    player.setDamping(true);
    player.setDrag(0.95);

    // Enemies
    for (let i = 0; i < 3; i++) {
        const enemy = this.physics.add.sprite(100 + i * 200, 100, 'ship');
        enemy.setTint(0xff0000); // Red
        enemy.setCollideWorldBounds(true);
        enemy.setDamping(true);
        enemy.setDrag(0.95);
        enemy.lastFired = 0;
        enemies.add(enemy);
    }

    // Physics collisions
    this.physics.add.collider(player, islands);
    this.physics.add.collider(enemies, islands);
    this.physics.add.collider(playerBullets, enemies, hitEnemy);
    this.physics.add.collider(playerBullets, islands, (b) => b.destroy());
    this.physics.add.collider(enemyBullets, player, hitPlayer);
    this.physics.add.collider(enemyBullets, islands, (b) => b.destroy());

    // Input
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // UI
    uiText = this.add.text(10, 10, 'Health: ' + health + '\nGold: ' + gold, { fontSize: '16px', fill: '#fff' });

    // Camera follows player
    this.cameras.main.startFollow(player);
    this.cameras.main.setBounds(0, 0, 1200, 800);
    this.physics.world.setBounds(0, 0, 1200, 800);
}

function update(time) {
    // Player movement with inertia
    player.setAccelerationX(0);
    player.setAccelerationY(0);
    if (cursors.left.isDown) {
        player.setAccelerationX(-150);
    } else if (cursors.right.isDown) {
        player.setAccelerationX(150);
    }
    if (cursors.up.isDown) {
        player.setAccelerationY(-150);
    } else if (cursors.down.isDown) {
        player.setAccelerationY(150);
    }

    // Player shooting
    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.keys[32]) && time > playerLastFired + 500) { // Space, 500ms reload
        const bullet1 = this.physics.add.sprite(player.x - 20, player.y, 'bullet');
        const bullet2 = this.physics.add.sprite(player.x + 20, player.y, 'bullet');
        bullet1.setVelocityY(-300);
        bullet2.setVelocityY(-300);
        bullet1.setTint(0xffff00); // Yellow
        bullet2.setTint(0xffff00);
        bullet1.setScale(2, 5);
        bullet2.setScale(2, 5);
        playerBullets.add(bullet1);
        playerBullets.add(bullet2);
        playerLastFired = time;
    }

    // Enemy AI
    enemies.children.each((enemy) => {
        // Simple movement towards player (or random)
        enemy.setAccelerationX(Math.sin(time / 1000 + enemy.x) * 50);
        enemy.setAccelerationY(Math.cos(time / 1000 + enemy.y) * 50);

        if (enemy.lastFired < time - 2000) { // Shoot every 2 seconds
            const enemyBullet = this.physics.add.sprite(enemy.x, enemy.y + enemy.height / 2, 'bullet');
            enemyBullet.setVelocityY(200);
            enemyBullet.setTint(0xff0000); // Red
            enemyBullet.setScale(2, 5);
            enemyBullets.add(enemyBullet);
            enemy.lastFired = time;
        }
    });

    // Clean up bullets out of bounds
    playerBullets.children.each((bullet) => {
        if (bullet.y < 0 || bullet.x < 0 || bullet.x > 1200 || bullet.y > 800) {
            bullet.destroy();
        }
    });
    enemyBullets.children.each((bullet) => {
        if (bullet.y > 800 || bullet.x < 0 || bullet.x > 1200 || bullet.y < 0) {
            bullet.destroy();
        }
    });
}

function hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
    gold += 10;
    updateUI();
}

function hitPlayer(player, bullet) {
    bullet.destroy();
    health -= 10;
    if (health <= 0) {
        // Game over
        health = 0;
        uiText.setText('Health: ' + health + '\nGold: ' + gold + '\nGAME OVER');
        game.scene.pause(); // Pause scene
    }
    updateUI();
}

function updateUI() {
    uiText.setText('Health: ' + health + '\nGold: ' + gold);
}

