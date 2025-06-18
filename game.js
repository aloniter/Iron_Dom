class IronDOMGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameMessage = document.getElementById('gameMessage');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.restartBtn = document.getElementById('restartBtn');
        
        // Game state
        this.gameState = 'menu'; // menu, playing, paused, gameOver, victory
        this.score = 0;
        this.hits = 0;
        this.intercepts = 0;
        this.maxHits = 5;
        this.targetIntercepts = 20;
        
        // Game objects
        this.enemyMissiles = [];
        this.playerMissile = null;
        this.interceptors = []; // For mouse/touch mode
        this.explosions = [];
        this.cityLights = [];
        this.stars = [];
        
        // Control mode
        this.controlMode = 'arrows'; // 'arrows' or 'mouse'
        
        // Player controls
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };
        
        // Timing
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000; // milliseconds
        
        // Audio context for sound effects
        this.audioContext = null;
        this.initAudio();
        
        // Load images
        this.images = {};
        this.imagesLoaded = false;
        this.loadImages();
        
        this.init();
        
        // Initialize control buttons
        setTimeout(() => {
            this.updateControlButtons();
            this.updateInstructions();
        }, 100);
    }
    
    init() {
        this.resizeCanvas();
        this.generateStars();
        this.generateCityLights();
        this.bindEvents();
        this.gameLoop();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    loadImages() {
        const imagesToLoad = [
            { name: 'israelRocket', src: 'photos/israel_rocket.png' },
            { name: 'ironDom', src: 'photos/iron_dom.png' },
            { name: 'background', src: 'photos/bg.png' },
            { name: 'iranRocket', src: 'photos/iran_rocket.png' }
        ];
        
        let loadedCount = 0;
        
        imagesToLoad.forEach(imageInfo => {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount === imagesToLoad.length) {
                    this.imagesLoaded = true;
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${imageInfo.src}`);
                loadedCount++;
                if (loadedCount === imagesToLoad.length) {
                    this.imagesLoaded = true;
                }
            };
            img.src = imageInfo.src;
            this.images[imageInfo.name] = img;
        });
    }
    
    playSound(frequency, duration, type = 'sine') {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        
        // Optimize dimensions for background image and game assets
        // 16:10 aspect ratio works well for missile defense games
        const aspectRatio = 16 / 10;
        let maxWidth = Math.min(1000, window.innerWidth - 20);
        let maxHeight = Math.min(700, window.innerHeight - 20);
        
        // Maintain aspect ratio
        if (maxWidth / maxHeight > aspectRatio) {
            maxWidth = maxHeight * aspectRatio;
        } else {
            maxHeight = maxWidth / aspectRatio;
        }
        
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;
        
        // Store canvas dimensions for game logic
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
    }
    
    generateStars() {
        this.stars = [];
        for (let i = 0; i < 50; i++) {
            this.stars.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.7,
                size: Math.random() * 2 + 1,
                twinkle: Math.random() * 100
            });
        }
    }
    
    generateCityLights() {
        this.cityLights = [];
        const numBuildings = 15;
        const buildingWidth = this.canvasWidth / numBuildings;
        
        for (let i = 0; i < numBuildings; i++) {
            const height = Math.random() * 60 + 20;
            this.cityLights.push({
                x: i * buildingWidth,
                y: this.canvasHeight - height,
                width: buildingWidth - 2,
                height: height,
                lights: this.generateBuildingLights(buildingWidth - 2, height)
            });
        }
    }
    
    generateBuildingLights(width, height) {
        const lights = [];
        const rows = Math.floor(height / 15);
        const cols = Math.floor(width / 10);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (Math.random() > 0.3) {
                    lights.push({
                        x: col * 10 + 3,
                        y: row * 15 + 5,
                        color: Math.random() > 0.8 ? '#ffff00' : '#ffa500'
                    });
                }
            }
        }
        return lights;
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        
        // Control mode buttons
        document.getElementById('arrowsBtn').addEventListener('click', () => this.setControlMode('arrows'));
        document.getElementById('mouseBtn').addEventListener('click', () => this.setControlMode('mouse'));
        
        // Keyboard controls for player missile (arrows mode)
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse/touch controls (mouse mode)
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouch(e);
        });
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    setControlMode(mode) {
        this.controlMode = mode;
        this.updateControlButtons();
        this.updateInstructions();
    }
    
    updateControlButtons() {
        const arrowsBtn = document.getElementById('arrowsBtn');
        const mouseBtn = document.getElementById('mouseBtn');
        
        if (this.controlMode === 'arrows') {
            arrowsBtn.classList.add('active');
            mouseBtn.classList.remove('active');
        } else {
            arrowsBtn.classList.remove('active');
            mouseBtn.classList.add('active');
        }
    }
    
    updateInstructions() {
        const instructions = document.querySelector('.game-message p');
        if (this.controlMode === 'arrows') {
            instructions.innerHTML = 'Use arrow keys to control your interceptor missile!<br>Crash into enemy missiles to destroy them and protect the cities below.<br><strong>Controls:</strong> ↑↓←→ Arrow Keys';
        } else {
            instructions.innerHTML = 'Click anywhere to launch interceptor missiles!<br>Intercept enemy missiles to protect the cities below.<br><strong>Controls:</strong> Mouse/Touch';
        }
    }
    
    handleKeyDown(e) {
        if (this.gameState !== 'playing' || this.controlMode !== 'arrows') return;
        
        if (e.code in this.keys) {
            e.preventDefault();
            this.keys[e.code] = true;
        }
    }
    
    handleKeyUp(e) {
        if (this.controlMode !== 'arrows') return;
        
        if (e.code in this.keys) {
            e.preventDefault();
            this.keys[e.code] = false;
        }
    }
    
    handleClick(e) {
        if (this.gameState !== 'playing' || this.controlMode !== 'mouse') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.launchInterceptor(x, y);
    }
    
    handleTouch(e) {
        if (this.gameState !== 'playing' || this.controlMode !== 'mouse') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.launchInterceptor(x, y);
    }
    
    launchInterceptor(targetX, targetY) {
        const startX = this.canvasWidth / 2;
        const startY = this.canvasHeight - 100;
        
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = 6;
        
        this.interceptors.push({
            x: startX,
            y: startY,
            targetX: targetX,
            targetY: targetY,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            trail: [],
            angle: Math.atan2(dy, dx) + Math.PI / 2,
            width: 35,
            height: 70
        });
        
        // Launch sound
        this.playSound(800, 0.2, 'square');
    }
    
    createPlayerMissile() {
        if (this.playerMissile || this.controlMode !== 'arrows') return; // Only one player missile at a time and only in arrows mode
        
        this.playerMissile = {
            x: this.canvasWidth / 2,
            y: this.canvasHeight - 100,
            vx: 0,
            vy: 0,
            speed: 5,  // Slightly faster for larger canvas
            trail: [],
            angle: 0, // For rocket rotation
            width: 50,  // Even bigger for the larger canvas
            height: 100  // 2:1 aspect ratio, optimized for new dimensions
        };
        
        // Launch sound
        this.playSound(800, 0.2, 'square');
    }
    
    spawnEnemyMissile() {
        const x = Math.random() * this.canvasWidth;
        const targetX = Math.random() * this.canvasWidth;
        const speed = Math.random() * 2 + 1;
        
        const dx = targetX - x;
        const dy = this.canvasHeight;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.enemyMissiles.push({
            x: x,
            y: 0,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            trail: []
        });
    }
    
    updateGame(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Create player missile if it doesn't exist (arrows mode only)
        if (this.controlMode === 'arrows' && !this.playerMissile) {
            this.createPlayerMissile();
        }
        
        // Update player missile movement based on key presses (arrows mode)
        if (this.playerMissile && this.controlMode === 'arrows') {
            // Reset velocity
            this.playerMissile.vx = 0;
            this.playerMissile.vy = 0;
            
            // Apply movement based on pressed keys
            if (this.keys.ArrowLeft) {
                this.playerMissile.vx = -this.playerMissile.speed;
            }
            if (this.keys.ArrowRight) {
                this.playerMissile.vx = this.playerMissile.speed;
            }
            if (this.keys.ArrowUp) {
                this.playerMissile.vy = -this.playerMissile.speed;
            }
            if (this.keys.ArrowDown) {
                this.playerMissile.vy = this.playerMissile.speed;
            }
            
            // Diagonal movement normalization
            if ((this.keys.ArrowLeft || this.keys.ArrowRight) && 
                (this.keys.ArrowUp || this.keys.ArrowDown)) {
                this.playerMissile.vx *= 0.707; // 1/sqrt(2)
                this.playerMissile.vy *= 0.707;
            }
            
            // Calculate rotation angle based on movement direction
            if (this.playerMissile.vx !== 0 || this.playerMissile.vy !== 0) {
                this.playerMissile.angle = Math.atan2(this.playerMissile.vy, this.playerMissile.vx) + Math.PI / 2;
            }
            
            // Update position
            this.playerMissile.x += this.playerMissile.vx;
            this.playerMissile.y += this.playerMissile.vy;
            
            // Keep player missile within bounds
            this.playerMissile.x = Math.max(this.playerMissile.width/2, Math.min(this.canvasWidth - this.playerMissile.width/2, this.playerMissile.x));
            this.playerMissile.y = Math.max(this.playerMissile.height/2, Math.min(this.canvasHeight - this.playerMissile.height/2, this.playerMissile.y));
            
            // Update trail
            this.playerMissile.trail.push({ x: this.playerMissile.x, y: this.playerMissile.y });
            if (this.playerMissile.trail.length > 12) this.playerMissile.trail.shift();
        }
        
        // Update interceptors (mouse mode)
        if (this.controlMode === 'mouse') {
            this.interceptors.forEach((interceptor, index) => {
                interceptor.trail.push({ x: interceptor.x, y: interceptor.y });
                if (interceptor.trail.length > 8) interceptor.trail.shift();
                
                interceptor.x += interceptor.vx;
                interceptor.y += interceptor.vy;
                
                // Check if interceptor reached target or went off screen
                const distToTarget = Math.sqrt(
                    Math.pow(interceptor.x - interceptor.targetX, 2) + 
                    Math.pow(interceptor.y - interceptor.targetY, 2)
                );
                
                if (distToTarget < 20 || interceptor.x < 0 || interceptor.x > this.canvasWidth || 
                    interceptor.y < 0 || interceptor.y > this.canvasHeight) {
                    this.interceptors.splice(index, 1);
                    this.createExplosion(interceptor.x, interceptor.y, '#4444ff');
                }
            });
        }
        
        // Spawn enemy missiles
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemyMissile();
            this.enemySpawnTimer = 0;
            // Increase difficulty over time
            this.enemySpawnInterval = Math.max(800, this.enemySpawnInterval - 50);
        }
        
        // Update enemy missiles
        this.enemyMissiles.forEach((missile, index) => {
            missile.trail.push({ x: missile.x, y: missile.y });
            if (missile.trail.length > 10) missile.trail.shift();
            
            missile.x += missile.vx;
            missile.y += missile.vy;
            
            // Check if missile hit ground
            if (missile.y >= this.canvasHeight - 80) {
                this.enemyMissiles.splice(index, 1);
                this.createExplosion(missile.x, missile.y, '#ff4444');
                this.hits++;
                this.playSound(200, 0.5, 'sawtooth');
                this.updateUI();
                
                if (this.hits >= this.maxHits) {
                    this.gameOver();
                }
            }
        });
        
        // Check collisions
        this.checkCollisions();
        
        // Update explosions
        this.explosions.forEach((explosion, index) => {
            explosion.life -= deltaTime / 1000;
            explosion.particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.1; // gravity
                particle.alpha -= deltaTime / 1000;
            });
            
            if (explosion.life <= 0) {
                this.explosions.splice(index, 1);
            }
        });
        
        // Update stars twinkle
        this.stars.forEach(star => {
            star.twinkle += deltaTime / 50;
        });
    }
    
    checkCollisions() {
        // Check collisions for arrows mode (player missile)
        if (this.controlMode === 'arrows' && this.playerMissile) {
            for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
                const enemy = this.enemyMissiles[i];
                
                const distance = Math.sqrt(
                    Math.pow(enemy.x - this.playerMissile.x, 2) + 
                    Math.pow(enemy.y - this.playerMissile.y, 2)
                );
                
                // Use optimized collision radius for larger assets
                const collisionRadius = this.imagesLoaded ? 65 : 55;
                
                if (distance < collisionRadius) {
                    // Collision detected
                    this.createExplosion((enemy.x + this.playerMissile.x) / 2, (enemy.y + this.playerMissile.y) / 2, '#ffff44');
                    this.enemyMissiles.splice(i, 1);
                    
                    // Create new player missile after collision
                    this.playerMissile = null;
                    
                    this.intercepts++;
                    this.score += 100;
                    this.playSound(600, 0.3, 'triangle');
                    this.updateUI();
                    
                    if (this.intercepts >= this.targetIntercepts) {
                        this.victory();
                    }
                    break;
                }
            }
        }
        
        // Check collisions for mouse mode (interceptors)
        if (this.controlMode === 'mouse') {
            for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
                const enemy = this.enemyMissiles[i];
                
                for (let j = this.interceptors.length - 1; j >= 0; j--) {
                    const interceptor = this.interceptors[j];
                    
                    const distance = Math.sqrt(
                        Math.pow(enemy.x - interceptor.x, 2) + 
                        Math.pow(enemy.y - interceptor.y, 2)
                    );
                    
                    if (distance < 45) {
                        // Collision detected
                        this.createExplosion((enemy.x + interceptor.x) / 2, (enemy.y + interceptor.y) / 2, '#ffff44');
                        this.enemyMissiles.splice(i, 1);
                        this.interceptors.splice(j, 1);
                        this.intercepts++;
                        this.score += 100;
                        this.playSound(600, 0.3, 'triangle');
                        this.updateUI();
                        
                        if (this.intercepts >= this.targetIntercepts) {
                            this.victory();
                        }
                        break;
                    }
                }
            }
        }
    }
    
    createExplosion(x, y, color) {
        const particles = [];
        const numParticles = 15;
        
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            const speed = Math.random() * 3 + 1;
            
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color: color
            });
        }
        
        this.explosions.push({
            particles: particles,
            life: 1
        });
    }
    
    drawFireEffect(missile) {
        if (missile.vx === 0 && missile.vy === 0) return; // No fire if not moving
        
        // Calculate fire position behind the missile
        const fireLength = 40;
        const fireWidth = 20;
        const angle = Math.atan2(missile.vy, missile.vx);
        
        // Position fire behind missile
        const fireX = missile.x - Math.cos(angle) * fireLength;
        const fireY = missile.y - Math.sin(angle) * fireLength;
        
        // Draw multiple fire layers for realistic effect
        for (let i = 0; i < 3; i++) {
            const layerLength = fireLength * (1 - i * 0.3);
            const layerWidth = fireWidth * (1 - i * 0.2);
            
            // Calculate fire layer position
            const layerX = missile.x - Math.cos(angle) * layerLength * 0.7;
            const layerY = missile.y - Math.sin(angle) * layerLength * 0.7;
            
            // Fire colors from hot to cool
            const colors = ['#ff0000', '#ff4400', '#ff8800'];
            const alphas = [0.9, 0.7, 0.5];
            
            this.ctx.save();
            this.ctx.globalAlpha = alphas[i];
            
            // Create fire shape
            this.ctx.beginPath();
            this.ctx.fillStyle = colors[i];
            
            // Draw flame shape
            this.ctx.ellipse(layerX, layerY, layerWidth, layerLength, angle, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add glow effect
            this.ctx.shadowColor = colors[i];
            this.ctx.shadowBlur = 15;
            this.ctx.fill();
            
            this.ctx.restore();
        }
        
        // Add particle sparkles
        for (let i = 0; i < 5; i++) {
            const sparkX = fireX + (Math.random() - 0.5) * fireWidth;
            const sparkY = fireY + (Math.random() - 0.5) * fireLength;
            
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.globalAlpha = Math.random() * 0.8 + 0.2;
            this.ctx.beginPath();
            this.ctx.arc(sparkX, sparkY, Math.random() * 3 + 1, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    render() {
        // Draw background image if loaded, otherwise use gradient
        if (this.imagesLoaded && this.images.background && this.images.background.complete) {
            // Draw background image to fill entire canvas
            this.ctx.drawImage(this.images.background, 0, 0, this.canvasWidth, this.canvasHeight);
        } else {
            // Fallback: Clear canvas with gradient
            this.ctx.fillStyle = 'rgba(10, 10, 46, 0.1)';
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Draw stars only if no background image
            this.stars.forEach(star => {
                const alpha = 0.5 + 0.5 * Math.sin(star.twinkle / 100);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }
        
        // Draw city lights only if background image is not loaded
        if (!this.imagesLoaded || !this.images.background || !this.images.background.complete) {
            this.cityLights.forEach(building => {
                // Building silhouette
                this.ctx.fillStyle = '#1a1a2e';
                this.ctx.fillRect(building.x, building.y, building.width, building.height);
                
                // Lights in windows
                building.lights.forEach(light => {
                    this.ctx.fillStyle = light.color;
                    this.ctx.fillRect(building.x + light.x, building.y + light.y, 4, 6);
                });
            });
        }
        
        // Draw enemy missiles
        this.enemyMissiles.forEach(missile => {
            // Draw trail (thicker and more visible)
            this.ctx.strokeStyle = 'rgba(255, 68, 68, 0.8)';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            missile.trail.forEach((point, index) => {
                const alpha = index / missile.trail.length;
                this.ctx.globalAlpha = alpha;
                if (index === 0) {
                    this.ctx.moveTo(point.x, point.y);
                } else {
                    this.ctx.lineTo(point.x, point.y);
                }
            });
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
            
            // Draw missile image if loaded, otherwise fallback to circle
            if (this.imagesLoaded && this.images.iranRocket && this.images.iranRocket.complete) {
                // Calculate angle for missile direction
                const angle = Math.atan2(missile.vy, missile.vx) + Math.PI / 2;
                
                // Save context for rotation
                this.ctx.save();
                
                // Move to missile position and rotate
                this.ctx.translate(missile.x, missile.y);
                this.ctx.rotate(angle);
                
                // Draw the rocket image centered (bigger and more visible)
                const width = 35;
                const height = 70;
                this.ctx.drawImage(
                    this.images.iranRocket,
                    -width / 2,
                    -height / 2,
                    width,
                    height
                );
                
                // Restore context
                this.ctx.restore();
            } else {
                // Fallback: Draw missile (bigger to match Iran rocket size)
                this.ctx.fillStyle = '#ff4444';
                this.ctx.beginPath();
                this.ctx.arc(missile.x, missile.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add strong glow effect for enemy missiles
                this.ctx.shadowColor = '#ff4444';
                this.ctx.shadowBlur = 25;
                this.ctx.fillStyle = '#ff6666';
                this.ctx.beginPath();
                this.ctx.arc(missile.x, missile.y, 10, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        });
        
        // Draw interceptors (mouse mode)
        if (this.controlMode === 'mouse') {
            this.interceptors.forEach(interceptor => {
                // Draw trail
                this.ctx.strokeStyle = 'rgba(68, 255, 68, 0.8)';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                interceptor.trail.forEach((point, index) => {
                    const alpha = index / interceptor.trail.length;
                    this.ctx.globalAlpha = alpha;
                    if (index === 0) {
                        this.ctx.moveTo(point.x, point.y);
                    } else {
                        this.ctx.lineTo(point.x, point.y);
                    }
                });
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
                
                // Draw Israeli missile image if loaded, otherwise fallback to circle
                if (this.imagesLoaded && this.images.israelRocket && this.images.israelRocket.complete) {
                    // Save context for rotation
                    this.ctx.save();
                    
                    // Move to interceptor position and rotate
                    this.ctx.translate(interceptor.x, interceptor.y);
                    this.ctx.rotate(interceptor.angle);
                    
                    // Draw the rocket image centered
                    this.ctx.drawImage(
                        this.images.israelRocket,
                        -interceptor.width / 2,
                        -interceptor.height / 2,
                        interceptor.width,
                        interceptor.height
                    );
                    
                    // Restore context
                    this.ctx.restore();
                } else {
                    // Fallback to circle
                    this.ctx.fillStyle = '#44ff44';
                    this.ctx.beginPath();
                    this.ctx.arc(interceptor.x, interceptor.y, 8, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Add glow effect
                    this.ctx.shadowColor = '#44ff44';
                    this.ctx.shadowBlur = 15;
                    this.ctx.fillStyle = '#88ff88';
                    this.ctx.beginPath();
                    this.ctx.arc(interceptor.x, interceptor.y, 5, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                }
            });
        }
        
        // Draw player missile (arrows mode)
        if (this.playerMissile && this.controlMode === 'arrows') {
            // Draw red fire effect behind missile
            this.drawFireEffect(this.playerMissile);
            
            // Draw trail (optimized for larger canvas)
            this.ctx.strokeStyle = 'rgba(68, 255, 68, 0.9)';
            this.ctx.lineWidth = 6;
            this.ctx.beginPath();
            this.playerMissile.trail.forEach((point, index) => {
                const alpha = index / this.playerMissile.trail.length;
                this.ctx.globalAlpha = alpha;
                if (index === 0) {
                    this.ctx.moveTo(point.x, point.y);
                } else {
                    this.ctx.lineTo(point.x, point.y);
                }
            });
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
            
            // Draw missile image if loaded, otherwise fallback to circle
            if (this.imagesLoaded && this.images.israelRocket && this.images.israelRocket.complete) {
                // Save context for rotation
                this.ctx.save();
                
                // Move to missile position and rotate
                this.ctx.translate(this.playerMissile.x, this.playerMissile.y);
                this.ctx.rotate(this.playerMissile.angle);
                
                // Draw the rocket image centered
                this.ctx.drawImage(
                    this.images.israelRocket,
                    -this.playerMissile.width / 2,
                    -this.playerMissile.height / 2,
                    this.playerMissile.width,
                    this.playerMissile.height
                );
                
                // Restore context
                this.ctx.restore();
            } else {
                // Fallback to original circle drawing (bigger)
                this.ctx.fillStyle = '#44ff44';
                this.ctx.beginPath();
                this.ctx.arc(this.playerMissile.x, this.playerMissile.y, 10, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add a stronger glow effect
                this.ctx.shadowColor = '#44ff44';
                this.ctx.shadowBlur = 20;
                this.ctx.fillStyle = '#88ff88';
                this.ctx.beginPath();
                this.ctx.arc(this.playerMissile.x, this.playerMissile.y, 7, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }
        
        // Draw explosions
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                this.ctx.fillStyle = particle.color;
                this.ctx.globalAlpha = particle.alpha;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            });
        });
        this.ctx.globalAlpha = 1;
        
        // Draw Iron Dome launcher
        const launcherX = this.canvasWidth / 2;
        const launcherY = this.canvasHeight - 100;
        const launcherWidth = 150;  // Optimized for larger canvas
        const launcherHeight = 90;  // Better proportions
        
        if (this.imagesLoaded && this.images.ironDom && this.images.ironDom.complete) {
            // Draw the Iron Dome image
            this.ctx.drawImage(
                this.images.ironDom,
                launcherX - launcherWidth / 2,
                launcherY,
                launcherWidth,
                launcherHeight
            );
        } else {
            // Fallback to rectangle drawing
            this.ctx.fillStyle = '#4a90e2';
            this.ctx.fillRect(launcherX - 15, launcherY, 30, 20);
            this.ctx.fillStyle = '#357abd';
            this.ctx.fillRect(launcherX - 3, launcherY - 10, 6, 10);
        }
    }
    
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.updateGame(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.hits = 0;
        this.intercepts = 0;
        this.enemyMissiles = [];
        this.playerMissile = null;
        this.interceptors = [];
        this.explosions = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000;
        
        this.gameMessage.classList.add('hidden');
        this.updateUI();
        this.updateControlButtons();
        this.updateInstructions();
        
        // Initialize audio context on user interaction
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.pauseBtn.textContent = 'Resume';
            this.showMessage('Game Paused', 'Click Resume to continue');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.pauseBtn.textContent = 'Pause';
            this.gameMessage.classList.add('hidden');
        }
    }
    
    restartGame() {
        this.gameState = 'menu';
        this.pauseBtn.textContent = 'Pause';
        this.showMessage('Iron DOM', 'Use arrow keys to control your interceptor missile!<br>Crash into enemy missiles to destroy them and protect the cities below.<br><strong>Controls:</strong> ↑↓←→ Arrow Keys', 'Start Game');
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.playSound(150, 1, 'sawtooth');
        this.showMessage('Game Over!', `Your cities were destroyed!<br>Score: ${this.score}<br>Intercepts: ${this.intercepts}`, 'Try Again');
    }
    
    victory() {
        this.gameState = 'victory';
        this.playSound(440, 0.5, 'sine');
        this.playSound(550, 0.5, 'sine');
        this.showMessage('Victory!', `You successfully defended Israel!<br>Score: ${this.score}<br>Perfect intercepts: ${this.intercepts}`, 'Play Again');
    }
    
    showMessage(title, message, buttonText = 'Start Game') {
        this.gameMessage.classList.remove('hidden');
        this.gameMessage.querySelector('h2').textContent = title;
        this.gameMessage.querySelector('p').innerHTML = message;
        this.startBtn.textContent = buttonText;
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('hits').textContent = this.hits;
        document.getElementById('intercepts').textContent = this.intercepts;
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new IronDOMGame();
}); 