// Инициализация игры
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');

// Константы игры
const TILE_SIZE = 16;
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

// Игровые переменные
let score = 0;
let playerLives = 3;
let gameOver = false;
let gameWon = false;

// Игровые объекты
let player, enemies, walls, playerBullets, enemyBullets;

// Загрузка изображений
const images = {
    tank: new Image(),
    brick: new Image(),
    steel: new Image(),
    forest: new Image(),
    water: new Image()
};

// Пути к изображениям
images.tank.src = 'assets/tank.png';
images.brick.src = 'assets/brick.png';
images.steel.src = 'assets/steel.png';
images.forest.src = 'assets/forest.png';
images.water.src = 'assets/water.png';

// Статусы загрузки изображений
let imagesLoaded = 0;
const totalImages = Object.keys(images).length;

Object.values(images).forEach(img => {
    img.onload = () => {
        imagesLoaded++;
        console.log(`✅ Изображение загружено: ${imagesLoaded}/${totalImages}`);
    };
    img.onerror = () => {
        console.error('❌ Ошибка загрузки изображения');
    };
});

// Управление
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false
};

// Класс для танков
class Tank {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE * 1.5;
        this.height = TILE_SIZE * 1.5;
        this.speed = isPlayer ? 2 : 1;
        this.direction = 0;
        this.isPlayer = isPlayer;
        this.color = isPlayer ? '#4CAF50' : '#FF5252';
    }

    draw() {
        if (images.tank.complete) {
            try {
                const spriteWidth = images.tank.width / 4;
                const spriteHeight = images.tank.height;
                
                let sx;
                switch(this.direction) {
                    case 0: sx = spriteWidth * 2; break;
                    case 1: sx = spriteWidth * 0; break;
                    case 2: sx = spriteWidth * 3; break;
                    case 3: sx = spriteWidth * 1; break;
                }
                
                ctx.drawImage(
                    images.tank,
                    sx, 0, spriteWidth, spriteHeight,
                    this.x, this.y, this.width, this.height
                );
                return;
            } catch (error) {
                console.log("Ошибка отрисовки танка, используем fallback");
            }
        }
        
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.direction * Math.PI / 2);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(-2, -this.height / 2 - 8, 4, 12);
        
        ctx.restore();
    }

    move() {
        switch(this.direction) {
            case 0: this.y -= this.speed; break;
            case 1: this.x += this.speed; break;
            case 2: this.y += this.speed; break;
            case 3: this.x -= this.speed; break;
        }

        this.x = Math.max(0, Math.min(GAME_WIDTH - this.width, this.x));
        this.y = Math.max(0, Math.min(GAME_HEIGHT - this.height, this.y));
    }

    collidesWith(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }
}

// Класс для пуль
class Bullet {
    constructor(x, y, direction, isPlayer) {
        this.x = x;
        this.y = y;
        this.width = 6;
        this.height = 6;
        this.speed = 5;
        this.direction = direction;
        this.isPlayer = isPlayer;
        this.active = true;
    }

    update() {
        switch(this.direction) {
            case 0: this.y -= this.speed; break;
            case 1: this.x += this.speed; break;
            case 2: this.y += this.speed; break;
            case 3: this.x -= this.speed; break;
        }

        if (this.x < 0 || this.x > GAME_WIDTH || this.y < 0 || this.y > GAME_HEIGHT) {
            this.active = false;
        }
    }

    draw() {
        ctx.fillStyle = this.isPlayer ? '#ffcc00' : '#ff0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    collidesWith(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }
}

// Класс для стен
class Wall {
    constructor(x, y, type = 'brick') {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.type = type;
    }

    draw() {
        if (images[this.type].complete) {
            try {
                ctx.drawImage(images[this.type], this.x, this.y, this.width, this.height);
                return;
            } catch (error) {
                console.log(`Ошибка отрисовки стены ${this.type}, используем fallback`);
            }
        }
        
        let color;
        switch(this.type) {
            case 'brick': color = '#8B4513'; break;
            case 'steel': color = '#555'; break;
            case 'forest': color = '#228B22'; break;
            case 'water': color = '#1E90FF'; break;
            default: color = '#8B4513';
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    collidesWithTank(tank) {
        if (this.type === 'forest') {
            return false;
        }
        return tank.x < this.x + this.width &&
               tank.x + tank.width > this.x &&
               tank.y < this.y + this.height &&
               tank.y + tank.height > this.y;
    }

    collidesWithBullet(bullet) {
        if (this.type === 'water' || this.type === 'forest') {
            return false;
        }
        return bullet.x < this.x + this.width &&
               bullet.x + bullet.width > this.x &&
               bullet.y < this.y + this.height &&
               bullet.y + bullet.height > this.y;
    }
}

// Проверка столкновений танка со стенами
function checkTankWallCollision(tank) {
    for (const wall of walls) {
        if (wall.collidesWithTank(tank)) {
            return true;
        }
    }
    return false;
}

// Проверка столкновений танка с другими танками
function checkTankTankCollision(tank, otherTanks) {
    for (const otherTank of otherTanks) {
        if (otherTank !== tank && tank.collidesWith(otherTank)) {
            return true;
        }
    }
    return false;
}

// Инициализация игры
function initGame() {
    console.log("Инициализация игры...");
    
    score = 0;
    playerLives = 3;
    gameOver = false;
    gameWon = false;
    
    scoreElement.textContent = score;
    livesElement.textContent = playerLives;

    // Создаем игрока в свободной зоне
    player = new Tank(12 * TILE_SIZE, 22 * TILE_SIZE, true);

    // Создаем врагов в свободных зонах (углы карты)
    enemies = [
        new Tank(3 * TILE_SIZE, 3 * TILE_SIZE),
        new Tank(22 * TILE_SIZE, 3 * TILE_SIZE),
        new Tank(3 * TILE_SIZE, 22 * TILE_SIZE),
        new Tank(22 * TILE_SIZE, 22 * TILE_SIZE)
    ];

    walls = [];

    // Границы уровня
    for (let i = 0; i < 26; i++) {
        walls.push(new Wall(i * TILE_SIZE, 0, 'steel'));
        walls.push(new Wall(i * TILE_SIZE, 25 * TILE_SIZE, 'steel'));
    }
    for (let i = 1; i < 25; i++) {
        walls.push(new Wall(0, i * TILE_SIZE, 'steel'));
        walls.push(new Wall(25 * TILE_SIZE, i * TILE_SIZE, 'steel'));
    }

    // Внутренние стены - оставляем свободные коридоры для движения
    const wallPositions = [
        // Кирпичные стены в центре
        [10, 5, 'brick'], [11, 5, 'brick'], [12, 5, 'brick'], [13, 5, 'brick'], [14, 5, 'brick'],
        [10, 6, 'brick'], [14, 6, 'brick'],
        [10, 7, 'brick'], [14, 7, 'brick'],
        [10, 8, 'brick'], [11, 8, 'brick'], [12, 8, 'brick'], [13, 8, 'brick'], [14, 8, 'brick'],
        
        // Стальные стены
        [5, 10, 'steel'], [6, 10, 'steel'], [7, 10, 'steel'],
        [5, 11, 'steel'], [7, 11, 'steel'],
        [5, 12, 'steel'], [6, 12, 'steel'], [7, 12, 'steel'],
        
        [18, 10, 'steel'], [19, 10, 'steel'], [20, 10, 'steel'],
        [18, 11, 'steel'], [20, 11, 'steel'],
        [18, 12, 'steel'], [19, 12, 'steel'], [20, 12, 'steel'],
        
        // Лес
        [8, 15, 'forest'], [9, 15, 'forest'], [10, 15, 'forest'], [11, 15, 'forest'],
        [8, 16, 'forest'], [9, 16, 'forest'], [10, 16, 'forest'], [11, 16, 'forest'],
        [8, 17, 'forest'], [9, 17, 'forest'], [10, 17, 'forest'], [11, 17, 'forest'],
        
        // Вода
        [14, 15, 'water'], [15, 15, 'water'], [16, 15, 'water'], [17, 15, 'water'],
        [14, 16, 'water'], [15, 16, 'water'], [16, 16, 'water'], [17, 16, 'water'],
        [14, 17, 'water'], [15, 17, 'water'], [16, 17, 'water'], [17, 17, 'water']
    ];

    wallPositions.forEach(pos => {
        walls.push(new Wall(pos[0] * TILE_SIZE, pos[1] * TILE_SIZE, pos[2]));
    });

    playerBullets = [];
    enemyBullets = [];
    
    console.log("Игра инициализирована!");
}

// Настройка обработчиков событий
function setupEventListeners() {
    document.addEventListener('keydown', (event) => {
        switch(event.code) {
            case 'KeyW':
                keys.w = true;
                if (player) player.direction = 0;
                break;
            case 'KeyA':
                keys.a = true;
                if (player) player.direction = 3;
                break;
            case 'KeyS':
                keys.s = true;
                if (player) player.direction = 2;
                break;
            case 'KeyD':
                keys.d = true;
                if (player) player.direction = 1;
                break;
            case 'Space':
                if (!keys.space && player && !gameOver && !gameWon) {
                    keys.space = true;
                    shootBullet(player, true);
                }
                break;
            case 'KeyR':
                initGame();
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch(event.code) {
            case 'KeyW': keys.w = false; break;
            case 'KeyA': keys.a = false; break;
            case 'KeyS': keys.s = false; break;
            case 'KeyD': keys.d = false; break;
            case 'Space': keys.space = false; break;
        }
    });
}

// Функция стрельбы
function shootBullet(shooter, isPlayer) {
    let bulletX, bulletY;
    
    switch(shooter.direction) {
        case 0:
            bulletX = shooter.x + shooter.width / 2 - 3;
            bulletY = shooter.y - 6;
            break;
        case 1:
            bulletX = shooter.x + shooter.width;
            bulletY = shooter.y + shooter.height / 2 - 3;
            break;
        case 2:
            bulletX = shooter.x + shooter.width / 2 - 3;
            bulletY = shooter.y + shooter.height;
            break;
        case 3:
            bulletX = shooter.x - 6;
            bulletY = shooter.y + shooter.height / 2 - 3;
            break;
    }
    
    const bullet = new Bullet(bulletX, bulletY, shooter.direction, isPlayer);
    
    if (isPlayer) {
        playerBullets.push(bullet);
    } else {
        enemyBullets.push(bullet);
    }
}

// Проверка столкновений
function checkCollisions() {
    // Пули игрока с врагами
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        if (!bullet.active) continue;
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (bullet.collidesWith(enemy)) {
                bullet.active = false;
                enemies.splice(j, 1);
                score += 100;
                scoreElement.textContent = score;
                if (enemies.length === 0) gameWon = true;
                break;
            }
        }
    }
    
    // Пули врагов с игроком
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (!bullet.active) continue;
        
        if (bullet.collidesWith(player)) {
            bullet.active = false;
            playerLives--;
            livesElement.textContent = playerLives;
            if (playerLives <= 0) gameOver = true;
            break;
        }
    }
    
    // Пули со стенами
    const allBullets = [...playerBullets, ...enemyBullets];
    for (let i = allBullets.length - 1; i >= 0; i--) {
        const bullet = allBullets[i];
        if (!bullet.active) continue;
        
        for (let j = walls.length - 1; j >= 0; j--) {
            const wall = walls[j];
            if (wall.collidesWithBullet(bullet)) {
                bullet.active = false;
                if (wall.type === 'brick') {
                    walls.splice(j, 1);
                }
                break;
            }
        }
    }
}

// ИИ для врагов
function updateEnemies() {
    for (const enemy of enemies) {
        const prevX = enemy.x;
        const prevY = enemy.y;
        
        enemy.move();
        
        let collided = checkTankWallCollision(enemy) || 
                      checkTankTankCollision(enemy, enemies) || 
                      enemy.collidesWith(player);
        
        if (collided) {
            enemy.x = prevX;
            enemy.y = prevY;
            enemy.direction = Math.floor(Math.random() * 4);
        } else {
            if (Math.random() < 0.01) {
                enemy.direction = Math.floor(Math.random() * 4);
            }
        }
        
        if (Math.random() < 0.01) {
            shootBullet(enemy, false);
        }
    }
}

// Обновление игры
function update() {
    if (gameOver || gameWon) return;
    
    // Движение игрока
    if (keys.w || keys.a || keys.s || keys.d) {
        const prevX = player.x;
        const prevY = player.y;
        
        player.move();
        
        if (checkTankWallCollision(player) || checkTankTankCollision(player, enemies)) {
            player.x = prevX;
            player.y = prevY;
        }
    }
    
    // Обновление врагов
    updateEnemies();
    
    // Обновление пуль
    playerBullets.forEach(bullet => bullet.update());
    enemyBullets.forEach(bullet => bullet.update());
    
    // Удаление неактивных пуль
    playerBullets = playerBullets.filter(bullet => bullet.active);
    enemyBullets = enemyBullets.filter(bullet => bullet.active);
    
    // Проверка столкновений
    checkCollisions();
}

// Отрисовка игры
function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    walls.forEach(wall => wall.draw());
    playerBullets.forEach(bullet => bullet.draw());
    enemyBullets.forEach(bullet => bullet.draw());
    
    player.draw();
    enemies.forEach(enemy => enemy.draw());
    
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        ctx.fillStyle = '#ff0000';
        ctx.font = '24px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('ИГРА ОКОНЧЕНА', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
        ctx.fillText(`Счет: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
        ctx.fillText('Нажми R для перезапуска', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
    } else if (gameWon) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        ctx.fillStyle = '#4CAF50';
        ctx.font = '24px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('ПОБЕДА!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
        ctx.fillText(`Счет: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
        ctx.fillText('Нажми R для перезапуска', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
    }
}

// Игровой цикл
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Запуск игры
window.addEventListener('load', () => {
    console.log("Страница загружена, запуск игры...");
    
    const checkImages = setInterval(() => {
        if (imagesLoaded === totalImages) {
            clearInterval(checkImages);
            console.log("Все изображения загружены, запуск игры!");
            initGame();
            setupEventListeners();
            gameLoop();
        }
    }, 100);
});