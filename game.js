/* ============================================
   MAHJONG MINECRAFT - LÓGICA DEL JUEGO
   ============================================ */

/* ============================================
   SISTEMA DE SONIDOS - WEB AUDIO API
   ============================================ */

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    play(soundType) {
        if (!this.enabled) return;

        // Inicializar contexto en la primera interacción del usuario
        this.init();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        switch (soundType) {
            case 'select':
                this.playTone(440, 0.1, 'sine', 0.3);
                break;
            case 'match':
                this.playChord([523, 659, 784], 0.3, 'sine', 0.4);
                break;
            case 'wrong':
                this.playTone(200, 0.3, 'sawtooth', 0.3);
                break;
            case 'draw':
                this.playTone(330, 0.15, 'triangle', 0.3);
                break;
            case 'discard':
                this.playTone(294, 0.12, 'sine', 0.25);
                break;
            case 'reveal':
                this.playTone(392, 0.2, 'sine', 0.35);
                break;
            case 'transfer':
                this.playSlide(500, 300, 0.3, 0.4);
                break;
            case 'victory':
                this.playVictoryFanfare();
                break;
        }
    }

    playTone(frequency, duration, type = 'sine', volume = 0.5) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playChord(frequencies, duration, type = 'sine', volume = 0.3) {
        frequencies.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, duration, type, volume);
            }, i * 80);
        });
    }

    playSlide(startFreq, endFreq, duration, volume = 0.4) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playVictoryFanfare() {
        const notes = [523, 587, 659, 784, 880];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.25, 'sine', 0.4);
            }, i * 150);
        });
    }
}

// Instancia global del gestor de sonidos
const soundManager = new SoundManager();

// Tipos de fichas con imágenes personalizadas de Minecraft (12 tipos)
// Fichas especiales tienen mecánicas únicas en modo Solitario
const TILE_TYPES = [
    { id: 'villager', image: 'assets/villager.png', name: 'Aldeano' },
    { id: 'alex', image: 'assets/alex.png', name: 'Alex' },
    { id: 'pig', image: 'assets/pig.png', name: 'Cerdo', special: 'sniff' },
    { id: 'creeper', image: 'assets/creeper.png', name: 'Creeper', special: 'explosive', timerSeconds: 10 },
    { id: 'ender_dragon', image: 'assets/ender_dragon.png', name: 'Ender Dragon', special: 'wildcard' },
    { id: 'skeleton', image: 'assets/skeleton.png', name: 'Esqueleto' },
    { id: 'panda', image: 'assets/panda.png', name: 'Panda' },
    { id: 'diamond_pickaxe', image: 'assets/diamond_pickaxe.png', name: 'Pico de Diamante' },
    { id: 'steve', image: 'assets/steve.png', name: 'Steve' },
    { id: 'zombie', image: 'assets/zombie.png', name: 'Zombie', special: 'moving' },
    { id: 'tnt', image: 'assets/tnt.png', name: 'TNT', special: 'combo', extraTiles: 2 },
    { id: 'diamond_sword', image: 'assets/diamond_sword.png', name: 'Espada de Diamante', special: 'cutting', charges: 3 }
];

// Layouts de tableros
const LAYOUTS = {
    // Fortaleza - Diseño clásico tipo tortuga
    fortress: {
        name: 'Fortaleza',
        // Cada capa es un array de [fila, columna] donde hay fichas
        layers: [
            // Capa 0 (base) - 12x6 con huecos
            generateRectangle(0, 0, 12, 6, []),
            // Capa 1 - 10x4
            generateRectangle(1, 1, 10, 4, []),
            // Capa 2 - 6x2
            generateRectangle(3, 2, 6, 2, []),
            // Capa 3 - 2x1
            generateRectangle(5, 2.5, 2, 1, [])
        ]
    },

    // Pirámide del Nether
    pyramid: {
        name: 'Pirámide del Nether',
        layers: [
            // Capa 0 - Base grande
            generateRectangle(0, 0, 10, 5, []),
            // Capa 1
            generateRectangle(1, 0.5, 8, 4, []),
            // Capa 2
            generateRectangle(2, 1, 6, 3, []),
            // Capa 3
            generateRectangle(3, 1.5, 4, 2, []),
            // Capa 4 - Punta
            generateRectangle(4, 2, 2, 1, [])
        ]
    },

    // Cueva de Minas - Horizontal
    mine: {
        name: 'Cueva de Minas',
        layers: [
            // Capa 0 - Forma de cueva
            [
                ...generateRow(0, 2, 14),
                ...generateRow(1, 1, 14),
                ...generateRow(2, 0, 14),
                ...generateRow(3, 0, 14),
                ...generateRow(4, 1, 14),
                ...generateRow(5, 2, 14)
            ],
            // Capa 1 - Interior
            [
                ...generateRow(1, 3, 10),
                ...generateRow(2, 2, 10),
                ...generateRow(3, 2, 10),
                ...generateRow(4, 3, 10)
            ],
            // Capa 2 - Centro
            [
                ...generateRow(2, 5, 4),
                ...generateRow(3, 5, 4)
            ]
        ]
    },

    // Portal del End - Circular
    portal: {
        name: 'Portal del End',
        layers: [
            // Capa 0 - Forma circular
            [
                [3, 0], [4, 0], [5, 0], [6, 0],
                [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
                [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
                [0, 3], [1, 3], [2, 3], [7, 3], [8, 3], [9, 3],
                [0, 4], [1, 4], [2, 4], [7, 4], [8, 4], [9, 4],
                [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
                [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6],
                [3, 7], [4, 7], [5, 7], [6, 7]
            ],
            // Capa 1 - Anillo interior
            [
                [3, 1], [4, 1], [5, 1], [6, 1],
                [2, 2], [3, 2], [6, 2], [7, 2],
                [2, 5], [3, 5], [6, 5], [7, 5],
                [3, 6], [4, 6], [5, 6], [6, 6]
            ],
            // Capa 2 - Centro
            [
                [4, 3], [5, 3],
                [4, 4], [5, 4]
            ]
        ]
    }
};

// Función auxiliar para generar rectángulos
function generateRectangle(startCol, startRow, width, height, exclude = []) {
    const positions = [];
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const pos = [startCol + col, startRow + row];
            if (!exclude.some(e => e[0] === pos[0] && e[1] === pos[1])) {
                positions.push(pos);
            }
        }
    }
    return positions;
}

// Función auxiliar para generar filas
function generateRow(row, startCol, count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
        positions.push([startCol + i, row]);
    }
    return positions;
}

class MahjongGame {
    constructor() {
        this.boardContainer = document.getElementById('board-container');
        this.menuScreen = document.getElementById('menu-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.victoryScreen = document.getElementById('victory-screen');
        this.pairsLeft = document.getElementById('pairs-left');
        this.movesCount = document.getElementById('moves-count');
        this.finalMoves = document.getElementById('final-moves');

        this.tiles = [];
        this.selectedTile = null;
        this.moves = 0;
        this.pairs = 0;
        this.currentLayout = null;
        this.isAnimating = false;

        // Mecánicas especiales
        this.creeperTimer = null;
        this.creeperTimerValue = 0;
        this.creeperTimerElement = null;
        this.cuttingCharges = 0;
        this.comboCount = 0;

        this.init();
    }

    init() {
        // Event listeners para los botones del menú
        document.querySelectorAll('.board-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const layout = btn.dataset.layout;
                this.startGame(layout);
            });
        });

        // Botón volver al menú
        document.getElementById('back-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });

        // Botón mezclar
        document.getElementById('shuffle-btn').addEventListener('click', () => {
            this.shuffleAvailableTiles();
        });

        // Botones de victoria
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.startGame(this.currentLayout);
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });
    }

    showScreen(screen) {
        // Ocultar todas las pantallas
        this.menuScreen.classList.remove('active');
        this.gameScreen.classList.remove('active');
        this.victoryScreen.classList.remove('active');
        document.getElementById('solitaire-menu').classList.remove('active');

        switch (screen) {
            case 'menu':
                this.menuScreen.classList.add('active');
                break;
            case 'solitaire-menu':
                document.getElementById('solitaire-menu').classList.add('active');
                break;
            case 'game':
                this.gameScreen.classList.add('active');
                break;
            case 'victory':
                this.victoryScreen.classList.add('active');
                break;
        }
    }

    startGame(layoutName) {
        this.currentLayout = layoutName;
        this.tiles = [];
        this.selectedTile = null;
        this.moves = 0;
        this.isAnimating = false;

        // Aplicar fondo temático
        this.gameScreen.setAttribute('data-layout', layoutName);

        const layout = LAYOUTS[layoutName];
        this.generateBoard(layout);
        this.updateUI();
        this.showScreen('game');
    }

    generateBoard(layout) {
        this.boardContainer.innerHTML = '';

        // Crear el contenedor del tablero
        const board = document.createElement('div');
        board.className = 'board';

        // Contar total de posiciones
        let totalPositions = 0;
        layout.layers.forEach(layer => {
            totalPositions += layer.length;
        });

        // Asegurar número par de fichas
        if (totalPositions % 2 !== 0) {
            totalPositions--;
        }

        // Generar tipos de fichas (cada tipo aparece en parejas)
        const numPairs = totalPositions / 2;
        this.pairs = numPairs;

        let tileTypeIds = [];
        for (let i = 0; i < numPairs; i++) {
            const typeIndex = i % TILE_TYPES.length;
            tileTypeIds.push(typeIndex);
            tileTypeIds.push(typeIndex);
        }

        // Mezclar
        tileTypeIds = this.shuffle(tileTypeIds);

        // Crear las fichas
        let tileIndex = 0;
        const tileSize = { width: 70, height: 88 };
        const layerOffset = { x: 3, y: 3 };

        layout.layers.forEach((layer, z) => {
            layer.forEach(([col, row]) => {
                if (tileIndex >= tileTypeIds.length) return;

                const typeId = tileTypeIds[tileIndex];
                const tileType = TILE_TYPES[typeId];

                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.id = tileIndex;
                tile.dataset.typeId = typeId;
                tile.dataset.col = col;
                tile.dataset.row = row;
                tile.dataset.z = z;
                tile.innerHTML = `<img src="${tileType.image}" alt="${tileType.name}" draggable="false">`;
                tile.title = tileType.name;

                // Posicionar la ficha
                const x = col * (tileSize.width * 0.9) - z * layerOffset.x;
                const y = row * (tileSize.height * 0.85) - z * layerOffset.y;

                tile.style.left = `${x}px`;
                tile.style.top = `${y}px`;

                tile.addEventListener('click', () => this.handleTileClick(tile));

                board.appendChild(tile);

                this.tiles.push({
                    element: tile,
                    id: tileIndex,
                    typeId: typeId,
                    col: col,
                    row: row,
                    z: z,
                    matched: false
                });

                tileIndex++;
            });
        });

        // Centrar el tablero
        this.centerBoard(board, layout);

        this.boardContainer.appendChild(board);
        this.updateBlockedTiles();
    }

    centerBoard(board, layout) {
        // Calcular dimensiones del tablero
        let maxX = 0, maxY = 0;
        layout.layers.forEach((layer, z) => {
            layer.forEach(([col, row]) => {
                const x = col * 54 + 60;
                const y = row * 64 + 75;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            });
        });

        const boardWidth = maxX + 80;
        const boardHeight = maxY + 80;

        board.style.width = `${boardWidth}px`;
        board.style.height = `${boardHeight}px`;

        // Función para calcular y aplicar la escala
        const applyScale = () => {
            const container = this.boardContainer;
            const containerWidth = container.clientWidth - 10;
            const containerHeight = container.clientHeight - 10;

            // Detectar modo retrato en móvil
            const isPortrait = window.innerHeight > window.innerWidth;
            const isMobile = window.innerWidth <= 768;
            const isBoardWiderThanTall = boardWidth > boardHeight;

            // Rotar el tablero si estamos en modo retrato y el tablero es más ancho que alto
            const shouldRotate = isMobile && isPortrait && isBoardWiderThanTall;

            let scaleX, scaleY, scale;

            if (shouldRotate) {
                // En modo rotado, intercambiamos las dimensiones para calcular la escala
                scaleX = containerWidth / boardHeight;
                scaleY = containerHeight / boardWidth;
                scale = Math.min(scaleX, scaleY, 1.3);

                board.style.transform = `rotate(90deg) scale(${scale})`;
                board.style.transformOrigin = 'center center';
            } else {
                scaleX = containerWidth / boardWidth;
                scaleY = containerHeight / boardHeight;
                const maxScale = isMobile ? 1.5 : 1.2;
                scale = Math.min(scaleX, scaleY, maxScale);

                board.style.transform = `scale(${scale})`;
                board.style.transformOrigin = 'center center';
            }
        };

        // Aplicar escala inicial con pequeño delay
        setTimeout(applyScale, 100);
        // Reaplicar después de que todo cargue
        setTimeout(applyScale, 300);

        // Re-escalar al cambiar tamaño de ventana u orientación
        const resizeHandler = () => setTimeout(applyScale, 50);
        window.addEventListener('resize', resizeHandler);
        window.addEventListener('orientationchange', () => setTimeout(applyScale, 150));

        // Guardar referencia para poder limpiar el listener después
        board._resizeHandler = resizeHandler;
    }

    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    handleTileClick(tileElement) {
        if (this.isAnimating) return;

        const tile = this.tiles.find(t => t.element === tileElement);
        if (!tile || tile.matched) return;

        // Verificar si la ficha está bloqueada
        if (this.isTileBlocked(tile)) {
            tileElement.classList.add('wrong');
            setTimeout(() => tileElement.classList.remove('wrong'), 400);
            return;
        }

        // Si es la misma ficha, deseleccionar
        if (this.selectedTile === tile) {
            this.deselectTile(tile);
            return;
        }

        // Seleccionar ficha
        soundManager.play('select');
        tileElement.classList.add('selected');

        if (this.selectedTile === null) {
            // Primera ficha seleccionada
            this.selectedTile = tile;

            // Activar mecánica especial si aplica
            this.handleSpecialTile(tile);
        } else {
            // Segunda ficha seleccionada
            this.moves++;
            this.updateUI();

            // Cancelar timer del Creeper si se encuentra pareja
            if (this.creeperTimer) {
                this.clearCreeperTimer();
            }

            // Verificar match (incluyendo comodín Ender Dragon)
            const tileType1 = TILE_TYPES[this.selectedTile.typeId];
            const tileType2 = TILE_TYPES[tile.typeId];
            const isWildcard = tileType1.special === 'wildcard' || tileType2.special === 'wildcard';

            if (this.selectedTile.typeId === tile.typeId || isWildcard) {
                // ¡Match!
                this.matchTiles(this.selectedTile, tile);
            } else {
                // No match
                this.wrongMatch(this.selectedTile, tile);
            }
        }
    }

    deselectTile(tile) {
        tile.element.classList.remove('selected');
        this.selectedTile = null;
    }

    matchTiles(tile1, tile2) {
        this.isAnimating = true;
        soundManager.play('match');

        // Limpiar timer del Creeper si existe
        this.clearCreeperTimer();

        tile1.element.classList.remove('selected', 'vibrating');
        tile2.element.classList.remove('selected');
        tile1.element.classList.add('matched');
        tile2.element.classList.add('matched');

        tile1.matched = true;
        tile2.matched = true;
        this.pairs--;

        // Verificar si es TNT para activar combo
        const isTNT = TILE_TYPES[tile1.typeId].special === 'combo' ||
            TILE_TYPES[tile2.typeId].special === 'combo';

        setTimeout(() => {
            tile1.element.style.visibility = 'hidden';
            tile2.element.style.visibility = 'hidden';
            this.selectedTile = null;
            this.isAnimating = false;
            this.updateBlockedTiles();
            this.updateUI();

            // Activar combo TNT después del match
            if (isTNT) {
                setTimeout(() => this.triggerTNTCombo(), 300);
            }

            // Verificar victoria
            if (this.pairs <= 0) {
                setTimeout(() => this.showVictory(), 500);
            }
        }, 500);
    }

    wrongMatch(tile1, tile2) {
        this.isAnimating = true;
        soundManager.play('wrong');

        tile1.element.classList.add('wrong');
        tile2.element.classList.add('wrong');

        setTimeout(() => {
            tile1.element.classList.remove('selected', 'wrong');
            tile2.element.classList.remove('selected', 'wrong');
            this.selectedTile = null;
            this.isAnimating = false;
        }, 400);
    }

    isTileBlocked(tile) {
        // Una ficha está bloqueada si:
        // 1. Tiene una ficha encima (z+1 en la misma posición o solapándose)
        // 2. Tiene fichas a ambos lados (izquierda Y derecha)

        const activeTiles = this.tiles.filter(t => !t.matched && t !== tile);

        // Verificar ficha encima
        const hasAbove = activeTiles.some(t => {
            if (t.z !== tile.z + 1) return false;
            // Verificar superposición
            const colOverlap = Math.abs(t.col - tile.col) < 1;
            const rowOverlap = Math.abs(t.row - tile.row) < 1;
            return colOverlap && rowOverlap;
        });

        if (hasAbove) return true;

        // Verificar lados (misma capa z y row similar)
        const sameLevelTiles = activeTiles.filter(t =>
            t.z === tile.z && Math.abs(t.row - tile.row) < 0.5
        );

        const hasLeft = sameLevelTiles.some(t =>
            t.col < tile.col && t.col >= tile.col - 1
        );

        const hasRight = sameLevelTiles.some(t =>
            t.col > tile.col && t.col <= tile.col + 1
        );

        return hasLeft && hasRight;
    }

    updateBlockedTiles() {
        this.tiles.forEach(tile => {
            if (tile.matched) return;

            if (this.isTileBlocked(tile)) {
                tile.element.classList.add('blocked');
            } else {
                tile.element.classList.remove('blocked');
            }
        });
    }

    shuffleAvailableTiles() {
        if (this.isAnimating) return;

        // Obtener fichas disponibles (no emparejadas)
        const availableTiles = this.tiles.filter(t => !t.matched);

        // Obtener sus tipos
        let typeIds = availableTiles.map(t => t.typeId);
        typeIds = this.shuffle(typeIds);

        // Reasignar tipos
        availableTiles.forEach((tile, i) => {
            tile.typeId = typeIds[i];
            tile.element.dataset.typeId = typeIds[i];
            tile.element.innerHTML = `<img src="${TILE_TYPES[typeIds[i]].image}" alt="${TILE_TYPES[typeIds[i]].name}" draggable="false">`;
            tile.element.title = TILE_TYPES[typeIds[i]].name;
        });

        this.updateBlockedTiles();
    }

    updateUI() {
        this.pairsLeft.textContent = `Parejas: ${this.pairs}`;
        this.movesCount.textContent = `Movimientos: ${this.moves}`;
    }

    // ============================================
    // MECÁNICAS ESPECIALES
    // ============================================

    handleSpecialTile(tile) {
        const tileType = TILE_TYPES[tile.typeId];
        if (!tileType.special) return;

        switch (tileType.special) {
            case 'explosive':
                this.startCreeperTimer(tile);
                break;
            case 'sniff':
                this.showPairHint(tile);
                break;
            case 'moving':
                this.moveZombie(tile);
                break;
            case 'cutting':
                // La espada activa el modo corte
                this.cuttingCharges = tileType.charges || 3;
                this.showMessage('⚔️ ¡Modo Corte! ' + this.cuttingCharges + ' fichas ignoran bloqueos');
                break;
        }
    }

    startCreeperTimer(tile) {
        const tileType = TILE_TYPES[tile.typeId];
        this.creeperTimerValue = tileType.timerSeconds || 10;

        // Crear elemento del timer
        this.creeperTimerElement = document.createElement('div');
        this.creeperTimerElement.className = 'creeper-timer';
        this.creeperTimerElement.innerHTML = `<span class="timer-value">${this.creeperTimerValue}</span>`;
        tile.element.appendChild(this.creeperTimerElement);

        // Añadir vibración
        tile.element.classList.add('vibrating');

        // Sonido de tick
        soundManager.play('select');

        // Iniciar cuenta atrás
        this.creeperTimer = setInterval(() => {
            this.creeperTimerValue--;
            if (this.creeperTimerElement) {
                this.creeperTimerElement.querySelector('.timer-value').textContent = this.creeperTimerValue;
            }

            if (this.creeperTimerValue <= 3) {
                soundManager.play('wrong');
            }

            if (this.creeperTimerValue <= 0) {
                this.explodeCreeper(tile);
            }
        }, 1000);
    }

    clearCreeperTimer() {
        if (this.creeperTimer) {
            clearInterval(this.creeperTimer);
            this.creeperTimer = null;
        }

        if (this.selectedTile && this.selectedTile.element) {
            this.selectedTile.element.classList.remove('vibrating');
            const timerEl = this.selectedTile.element.querySelector('.creeper-timer');
            if (timerEl) timerEl.remove();
        }

        this.creeperTimerElement = null;
    }

    explodeCreeper(tile) {
        this.clearCreeperTimer();

        // Sonido de explosión
        soundManager.play('transfer');

        // Animación de explosión
        tile.element.classList.remove('selected', 'vibrating');
        tile.element.classList.add('exploding');

        // Eliminar fichas cercanas (penalización)
        const neighbors = this.getNeighborTiles(tile);
        neighbors.slice(0, 2).forEach(neighbor => {
            if (!neighbor.matched) {
                neighbor.element.classList.add('exploding');
                setTimeout(() => {
                    neighbor.matched = true;
                    neighbor.element.style.visibility = 'hidden';
                }, 500);
            }
        });

        // El creeper también desaparece
        setTimeout(() => {
            tile.matched = true;
            tile.element.style.visibility = 'hidden';
            this.selectedTile = null;
            this.pairs -= Math.min(2, neighbors.length) + 1;
            this.updateBlockedTiles();
            this.updateUI();
            this.showMessage('💥 ¡BOOM! Creeper explotó');
        }, 600);
    }

    getNeighborTiles(tile) {
        return this.tiles.filter(t => {
            if (t === tile || t.matched) return false;
            const dx = Math.abs(t.col - tile.col);
            const dy = Math.abs(t.row - tile.row);
            return dx <= 2 && dy <= 2 && t.z === tile.z;
        });
    }

    showPairHint(tile) {
        // Encontrar la pareja del cerdo
        const pair = this.tiles.find(t =>
            t !== tile &&
            t.typeId === tile.typeId &&
            !t.matched
        );

        if (pair) {
            // Mostrar brevemente dónde está
            pair.element.classList.add('hint-glow');
            soundManager.play('reveal');

            setTimeout(() => {
                pair.element.classList.remove('hint-glow');
            }, 2000);

            this.showMessage('🐷 ¡El cerdo olfatea su pareja!');
        }
    }

    moveZombie(tile) {
        // El zombie se mueve lentamente a otra posición
        const availablePositions = this.tiles
            .filter(t => t.matched && t.z === tile.z)
            .slice(0, 1);

        if (availablePositions.length > 0) {
            const newPos = availablePositions[0];

            // Animación de movimiento
            tile.element.style.transition = 'left 1s, top 1s';
            tile.element.style.left = newPos.element.style.left;
            tile.element.style.top = newPos.element.style.top;

            // Actualizar posición lógica
            tile.col = newPos.col;
            tile.row = newPos.row;

            this.showMessage('🧟 ¡El zombie se mueve!');

            setTimeout(() => {
                tile.element.style.transition = '';
                this.updateBlockedTiles();
            }, 1000);
        }
    }

    triggerTNTCombo() {
        // Eliminar 2 fichas aleatorias adicionales
        const availableTiles = this.tiles.filter(t => !t.matched && !this.isTileBlocked(t));
        const toRemove = this.shuffle(availableTiles).slice(0, 2);

        toRemove.forEach((tile, i) => {
            setTimeout(() => {
                tile.element.classList.add('exploding');
                setTimeout(() => {
                    tile.matched = true;
                    tile.element.style.visibility = 'hidden';
                    this.pairs--;
                    this.updateBlockedTiles();
                    this.updateUI();
                }, 500);
            }, i * 300);
        });

        if (toRemove.length > 0) {
            soundManager.play('transfer');
            this.showMessage('💣 ¡TNT elimina ' + toRemove.length + ' fichas extra!');
        }
    }

    showMessage(text) {
        // Mostrar mensaje motivacional
        let messageEl = document.querySelector('.game-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'game-message';
            this.boardContainer.appendChild(messageEl);
        }

        messageEl.textContent = text;
        messageEl.classList.add('visible');

        setTimeout(() => {
            messageEl.classList.remove('visible');
        }, 2000);
    }

    showVictory() {
        soundManager.play('victory');
        this.finalMoves.textContent = this.moves;
        this.showScreen('victory');
    }
}

/* ============================================
   MODO COMPETITIVO - MAHJONG TRADICIONAL VS BOT
   ============================================ */

class TraditionalGame {
    constructor() {
        // Pantallas
        this.menuScreen = document.getElementById('menu-screen');
        this.competitiveScreen = document.getElementById('competitive-screen');
        this.endScreen = document.getElementById('competitive-end-screen');

        // Elementos del juego
        this.playerHandEl = document.getElementById('player-hand');
        this.botHandEl = document.getElementById('bot-hand');
        this.playerMeldsEl = document.getElementById('player-melds');
        this.botMeldsEl = document.getElementById('bot-melds');
        this.wallEl = document.getElementById('wall');
        this.discardsEl = document.getElementById('discards');
        this.turnIndicator = document.getElementById('current-turn');
        this.wallCount = document.getElementById('wall-count');

        // Botones
        this.drawBtn = document.getElementById('draw-btn');
        this.mahjongBtn = document.getElementById('mahjong-btn');

        // Estado del juego
        this.wall = [];
        this.playerHand = [];
        this.botHand = [];
        this.playerMelds = [];
        this.botMelds = [];
        this.discards = [];
        this.isPlayerTurn = true;
        this.hasDrawn = false;
        this.selectedTile = null;
        this.gameOver = false;

        this.init();
    }

    init() {
        // Botón volver
        document.getElementById('competitive-back-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });

        // Botón robar
        this.drawBtn.addEventListener('click', () => {
            if (this.isPlayerTurn && !this.hasDrawn && !this.gameOver) {
                this.drawTile('player');
            }
        });

        // Botón Mahjong
        this.mahjongBtn.addEventListener('click', () => {
            if (this.checkMahjong(this.playerHand, this.playerMelds)) {
                this.endGame('player');
            }
        });

        // Botones de fin de partida
        document.getElementById('competitive-play-again-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('competitive-menu-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });

        // Botón de ayuda
        const helpModal = document.getElementById('help-modal');
        document.getElementById('help-btn').addEventListener('click', () => {
            helpModal.classList.add('active');
        });

        document.getElementById('close-help-btn').addEventListener('click', () => {
            helpModal.classList.remove('active');
        });

        // Cerrar modal al hacer clic fuera
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        });
    }

    showScreen(screen) {
        this.menuScreen.classList.remove('active');
        this.competitiveScreen.classList.remove('active');
        this.endScreen.classList.remove('active');

        switch (screen) {
            case 'menu':
                this.menuScreen.classList.add('active');
                break;
            case 'competitive':
                this.competitiveScreen.classList.add('active');
                break;
            case 'end':
                this.endScreen.classList.add('active');
                break;
        }
    }

    startGame() {
        // Reiniciar estado
        this.wall = [];
        this.playerHand = [];
        this.botHand = [];
        this.playerMelds = [];
        this.botMelds = [];
        this.discards = [];
        this.isPlayerTurn = true;
        this.hasDrawn = false;
        this.selectedTile = null;
        this.gameOver = false;

        // Crear muro (cada tipo de ficha x4)
        TILE_TYPES.forEach((type, index) => {
            for (let i = 0; i < 4; i++) {
                this.wall.push({
                    typeId: index,
                    id: `${type.id}_${i}`
                });
            }
        });

        // Mezclar muro
        this.wall = this.shuffle(this.wall);

        // Repartir 7 fichas a cada jugador
        for (let i = 0; i < 7; i++) {
            this.playerHand.push(this.wall.pop());
            this.botHand.push(this.wall.pop());
        }

        // Renderizar
        this.render();
        this.updateTurnIndicator();
        this.showScreen('competitive');
    }

    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    render() {
        this.renderHand(this.playerHandEl, this.playerHand, true);
        this.renderHand(this.botHandEl, this.botHand, false);
        this.renderMelds(this.playerMeldsEl, this.playerMelds);
        this.renderMelds(this.botMeldsEl, this.botMelds);
        this.renderWall();
        this.renderDiscards();
        this.updateButtons();
    }

    renderHand(container, hand, isPlayer) {
        container.innerHTML = '';

        // Ordenar por tipo
        const sortedHand = [...hand].sort((a, b) => a.typeId - b.typeId);

        sortedHand.forEach((tile, index) => {
            const tileEl = this.createTileElement(tile, !isPlayer);

            if (isPlayer) {
                tileEl.addEventListener('click', () => {
                    if (this.hasDrawn && this.isPlayerTurn && !this.gameOver) {
                        this.selectTileToDiscard(tile, tileEl);
                    }
                });
            }

            container.appendChild(tileEl);
        });
    }

    renderMelds(container, melds) {
        container.innerHTML = '';

        melds.forEach(meld => {
            const meldEl = document.createElement('div');
            meldEl.className = 'meld';

            meld.tiles.forEach(tile => {
                const tileEl = this.createTileElement(tile, false);
                meldEl.appendChild(tileEl);
            });

            container.appendChild(meldEl);
        });
    }

    renderWall() {
        this.wallEl.innerHTML = '';
        this.wallCount.textContent = `Muro: ${this.wall.length}`;

        // Mostrar hasta 5 fichas representativas
        const showCount = Math.min(5, this.wall.length);
        for (let i = 0; i < showCount; i++) {
            const tileEl = document.createElement('div');
            tileEl.className = 'tile';
            this.wallEl.appendChild(tileEl);
        }

        if (this.wall.length > 5) {
            const more = document.createElement('span');
            more.textContent = `+${this.wall.length - 5}`;
            more.style.cssText = 'color: white; font-size: 1.2rem; padding: 10px;';
            this.wallEl.appendChild(more);
        }
    }

    renderDiscards() {
        this.discardsEl.innerHTML = '';

        this.discards.forEach(tile => {
            const tileEl = this.createTileElement(tile, false);
            this.discardsEl.appendChild(tileEl);
        });
    }

    createTileElement(tile, hidden = false) {
        const tileEl = document.createElement('div');
        tileEl.className = 'tile';
        tileEl.dataset.id = tile.id;
        tileEl.dataset.typeId = tile.typeId;

        if (!hidden) {
            const tileType = TILE_TYPES[tile.typeId];
            tileEl.innerHTML = `<img src="${tileType.image}" alt="${tileType.name}" draggable="false">`;
            tileEl.title = tileType.name;
        }

        return tileEl;
    }

    updateButtons() {
        this.drawBtn.disabled = !this.isPlayerTurn || this.hasDrawn || this.gameOver || this.wall.length === 0;
        this.mahjongBtn.disabled = !this.checkMahjong(this.playerHand, this.playerMelds) || this.gameOver;
    }

    updateTurnIndicator() {
        const indicator = document.querySelector('.turn-indicator');
        if (this.isPlayerTurn) {
            this.turnIndicator.textContent = this.hasDrawn ? 'Descarta una ficha' : 'Tu turno - Roba';
            indicator.classList.remove('bot-turn');
        } else {
            this.turnIndicator.textContent = 'Turno del Bot...';
            indicator.classList.add('bot-turn');
        }
    }

    drawTile(player) {
        if (this.wall.length === 0) {
            this.endGame('draw');
            return;
        }

        const tile = this.wall.pop();

        if (player === 'player') {
            soundManager.play('draw');
            this.playerHand.push(tile);
            this.hasDrawn = true;
        } else {
            this.botHand.push(tile);
        }

        this.render();
        this.updateTurnIndicator();

        // Verificar Mahjong después de robar
        if (player === 'player' && this.checkMahjong(this.playerHand, this.playerMelds)) {
            this.mahjongBtn.disabled = false;
        }
    }

    selectTileToDiscard(tile, tileEl) {
        // Quitar selección anterior
        document.querySelectorAll('.player-hand .tile').forEach(t => {
            t.classList.remove('selected-to-discard');
        });

        if (this.selectedTile === tile) {
            // Descartar la ficha seleccionada
            this.discardTile('player', tile);
        } else {
            // Seleccionar ficha
            soundManager.play('select');
            this.selectedTile = tile;
            tileEl.classList.add('selected-to-discard');
        }
    }

    discardTile(player, tile) {
        if (player === 'player') {
            soundManager.play('discard');
            const index = this.playerHand.findIndex(t => t.id === tile.id);
            if (index > -1) {
                this.playerHand.splice(index, 1);
                this.discards.push(tile);
                this.selectedTile = null;
                this.hasDrawn = false;
                this.isPlayerTurn = false;
                this.render();
                this.updateTurnIndicator();

                // Turno del bot después de un pequeño delay
                setTimeout(() => this.botTurn(), 1000);
            }
        } else {
            const index = this.botHand.findIndex(t => t.id === tile.id);
            if (index > -1) {
                this.botHand.splice(index, 1);
                this.discards.push(tile);
            }
        }
    }

    botTurn() {
        if (this.gameOver) return;

        // Bot roba
        this.drawTile('bot');

        // Comprobar si el bot tiene Mahjong
        if (this.checkMahjong(this.botHand, this.botMelds)) {
            setTimeout(() => this.endGame('bot'), 500);
            return;
        }

        // IA simple: descartar la ficha menos útil
        setTimeout(() => {
            const tileToDiscard = this.botChooseDiscard();
            this.discardTile('bot', tileToDiscard);

            // Volver al turno del jugador
            this.isPlayerTurn = true;
            this.render();
            this.updateTurnIndicator();
        }, 800);
    }

    botChooseDiscard() {
        // Contar ocurrencias de cada tipo
        const typeCounts = {};
        this.botHand.forEach(tile => {
            typeCounts[tile.typeId] = (typeCounts[tile.typeId] || 0) + 1;
        });

        // Buscar fichas solitarias (prioridad para descartar)
        const singleTiles = this.botHand.filter(t => typeCounts[t.typeId] === 1);

        if (singleTiles.length > 0) {
            // Descartar una ficha solitaria aleatoria
            return singleTiles[Math.floor(Math.random() * singleTiles.length)];
        }

        // Si no hay solitarias, descartar una de las parejas
        const pairTiles = this.botHand.filter(t => typeCounts[t.typeId] === 2);
        if (pairTiles.length > 0) {
            return pairTiles[0];
        }

        // Último recurso: descartar la primera
        return this.botHand[0];
    }

    checkMahjong(hand, melds) {
        // Para ganar: 2 tríos + 1 pareja = 8 fichas en mano
        // O 1 trío + 1 pareja = 5 fichas si ya tienes 1 meld
        // Simplificado: necesitas exactamente 8 fichas que formen 2 tríos + 1 pareja

        if (hand.length < 8) return false;

        // Contar ocurrencias
        const typeCounts = {};
        hand.forEach(tile => {
            typeCounts[tile.typeId] = (typeCounts[tile.typeId] || 0) + 1;
        });

        // Buscar combinaciones válidas
        const types = Object.keys(typeCounts).map(Number);

        // Necesitamos: 2 tríos (3+3) + 1 pareja (2) = 8 fichas
        let trios = 0;
        let pairs = 0;

        types.forEach(type => {
            const count = typeCounts[type];
            if (count >= 3) {
                trios++;
                typeCounts[type] -= 3;
            }
        });

        types.forEach(type => {
            const count = typeCounts[type];
            if (count >= 2) {
                pairs++;
            }
        });

        return trios >= 2 && pairs >= 1;
    }

    endGame(winner) {
        this.gameOver = true;

        const titleEl = document.getElementById('competitive-result-title');
        const textEl = document.getElementById('competitive-result-text');

        if (winner === 'player') {
            soundManager.play('victory');
            titleEl.textContent = '🎉 ¡MAHJONG! 🎉';
            titleEl.style.color = '#FCEE4B';
            textEl.textContent = '¡Has ganado la partida!';
        } else if (winner === 'bot') {
            titleEl.textContent = '😔 Derrota 😔';
            titleEl.style.color = '#ff6b6b';
            textEl.textContent = 'El bot ha completado Mahjong';
        } else {
            titleEl.textContent = '🤝 Empate 🤝';
            titleEl.style.color = '#B0B0B0';
            textEl.textContent = 'Se acabaron las fichas del muro';
        }

        this.showScreen('end');
    }
}

/* ============================================
   MODO BATTLE - CARRERA DE PALOS
   ============================================ */

// Definición de palos para Battle Mode
const BATTLE_SUITS = {
    mobs: {
        name: 'Mobs',
        color: '#5D8C3E', // Verde
        tiles: [
            { id: 'creeper', image: 'assets/creeper.png', name: 'Creeper' },
            { id: 'zombie', image: 'assets/zombie.png', name: 'Zombie' },
            { id: 'skeleton', image: 'assets/skeleton.png', name: 'Esqueleto' },
            { id: 'pig', image: 'assets/pig.png', name: 'Cerdo' },
            { id: 'panda', image: 'assets/panda.png', name: 'Panda' },
            { id: 'ender_dragon', image: 'assets/ender_dragon.png', name: 'Ender Dragon' }
        ]
    },
    items: {
        name: 'Items',
        color: '#4AEDD9', // Azul diamante
        tiles: [
            { id: 'steve', image: 'assets/steve.png', name: 'Steve' },
            { id: 'alex', image: 'assets/alex.png', name: 'Alex' },
            { id: 'diamond_sword', image: 'assets/diamond_sword.png', name: 'Espada de Diamante' },
            { id: 'diamond_pickaxe', image: 'assets/diamond_pickaxe.png', name: 'Pico de Diamante' },
            { id: 'tnt', image: 'assets/tnt.png', name: 'TNT' },
            { id: 'villager', image: 'assets/villager.png', name: 'Aldeano' }
        ]
    }
};

class BattleGame {
    constructor() {
        // Pantallas
        this.menuScreen = document.getElementById('menu-screen');
        this.battleScreen = document.getElementById('battle-screen');
        this.endScreen = document.getElementById('battle-end-screen');

        // Elementos
        this.playerGridEl = document.getElementById('player-grid');
        this.botGridEl = document.getElementById('bot-grid');
        this.turnIndicator = document.getElementById('battle-turn');
        this.scoreEl = document.getElementById('battle-score');
        this.playerSuitLabel = document.getElementById('player-suit-label');
        this.botSuitLabel = document.getElementById('bot-suit-label');

        // Estado del juego
        this.playerGrid = [];
        this.botGrid = [];
        this.playerSuit = null;
        this.botSuit = null;
        this.playerScore = 0;
        this.botScore = 0;
        this.isPlayerTurn = true;
        this.gameOver = false;
        this.isAnimating = false;

        this.init();
    }

    init() {
        // Botón volver
        document.getElementById('battle-back-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });

        // Botones de fin de partida
        document.getElementById('battle-play-again-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('battle-menu-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });

        // Modal de ayuda
        const helpModal = document.getElementById('battle-help-modal');
        document.getElementById('battle-help-btn').addEventListener('click', () => {
            helpModal.classList.add('active');
        });

        document.getElementById('close-battle-help-btn').addEventListener('click', () => {
            helpModal.classList.remove('active');
        });

        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        });
    }

    showScreen(screen) {
        this.menuScreen.classList.remove('active');
        this.battleScreen.classList.remove('active');
        this.endScreen.classList.remove('active');

        switch (screen) {
            case 'menu':
                this.menuScreen.classList.add('active');
                break;
            case 'battle':
                this.battleScreen.classList.add('active');
                break;
            case 'end':
                this.endScreen.classList.add('active');
                break;
        }
    }

    startGame() {
        // Reiniciar estado
        this.playerGrid = [];
        this.botGrid = [];
        this.playerScore = 0;
        this.botScore = 0;
        this.isPlayerTurn = true;
        this.gameOver = false;
        this.isAnimating = false;

        // Asignar palos aleatoriamente
        if (Math.random() < 0.5) {
            this.playerSuit = 'mobs';
            this.botSuit = 'items';
        } else {
            this.playerSuit = 'items';
            this.botSuit = 'mobs';
        }

        // Actualizar labels de palo
        this.playerSuitLabel.textContent = `(${BATTLE_SUITS[this.playerSuit].name})`;
        this.playerSuitLabel.style.color = BATTLE_SUITS[this.playerSuit].color;
        this.botSuitLabel.textContent = `(${BATTLE_SUITS[this.botSuit].name})`;
        this.botSuitLabel.style.color = BATTLE_SUITS[this.botSuit].color;

        // Crear 48 fichas (24 de cada palo, 4 copias de cada tipo)
        let allTiles = [];

        Object.keys(BATTLE_SUITS).forEach(suitKey => {
            const suit = BATTLE_SUITS[suitKey];
            suit.tiles.forEach((tileType, typeIndex) => {
                for (let i = 0; i < 4; i++) {
                    allTiles.push({
                        id: `${tileType.id}_${i}`,
                        typeId: typeIndex,
                        suit: suitKey,
                        image: tileType.image,
                        name: tileType.name,
                        revealed: false
                    });
                }
            });
        });

        // Mezclar todas las fichas
        allTiles = this.shuffle(allTiles);

        // Distribuir 24 fichas a cada cuadrícula
        this.playerGrid = allTiles.slice(0, 24);
        this.botGrid = allTiles.slice(24, 48);

        // Renderizar
        this.render();
        this.updateUI();
        this.showScreen('battle');
    }

    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    render() {
        this.renderGrid(this.playerGridEl, this.playerGrid, true);
        this.renderGrid(this.botGridEl, this.botGrid, false);
    }

    renderGrid(container, grid, isPlayer) {
        container.innerHTML = '';

        grid.forEach((tile, index) => {
            const tileEl = document.createElement('div');
            tileEl.className = 'battle-tile';
            tileEl.dataset.index = index;

            if (tile.revealed) {
                tileEl.classList.add('revealed');
                tileEl.classList.add(`suit-${tile.suit}`);
                tileEl.innerHTML = `<img src="${tile.image}" alt="${tile.name}" draggable="false">`;
                tileEl.title = tile.name;
            }

            if (isPlayer && !tile.revealed && this.isPlayerTurn && !this.gameOver && !this.isAnimating) {
                tileEl.classList.add('clickable');
                tileEl.addEventListener('click', () => this.revealTile(index, 'player'));
            }

            container.appendChild(tileEl);
        });
    }

    revealTile(index, player) {
        if (this.gameOver || this.isAnimating) return;

        const grid = player === 'player' ? this.playerGrid : this.botGrid;
        const tile = grid[index];

        if (tile.revealed) return;

        this.isAnimating = true;
        tile.revealed = true;

        // Determinar el palo del jugador actual
        const currentPlayerSuit = player === 'player' ? this.playerSuit : this.botSuit;

        // Verificar si la ficha es del palo del jugador actual
        if (tile.suit === currentPlayerSuit) {
            // ¡Es de su palo! Se queda revelada
            if (player === 'player') {
                this.playerScore++;
            } else {
                this.botScore++;
            }
            soundManager.play('reveal');
            this.render();
            this.updateUI();

            // Verificar victoria
            if (this.checkWin(player)) {
                setTimeout(() => {
                    this.endGame(player);
                }, 500);
                return;
            }

            this.isAnimating = false;

            // Pasar turno
            if (player === 'player') {
                this.isPlayerTurn = false;
                this.render();
                setTimeout(() => this.botTurn(), 800);
            } else {
                this.isPlayerTurn = true;
                this.render();
            }
        } else {
            // Es del palo rival - transferir
            this.render();

            setTimeout(() => {
                soundManager.play('transfer');
                this.transferTile(tile, player);
            }, 600);
        }
    }

    transferTile(tile, fromPlayer) {
        const fromGrid = fromPlayer === 'player' ? this.playerGrid : this.botGrid;
        const toGrid = fromPlayer === 'player' ? this.botGrid : this.playerGrid;

        // Encontrar una posición no revelada en la cuadrícula destino
        const emptyIndex = toGrid.findIndex(t => !t.revealed);

        if (emptyIndex !== -1) {
            // Remover de la cuadrícula origen
            const tileIndex = fromGrid.findIndex(t => t.id === tile.id);
            if (tileIndex !== -1) {
                fromGrid.splice(tileIndex, 1);

                // Insertar en la cuadrícula destino (reemplazando una oculta)
                const replacedTile = toGrid[emptyIndex];
                toGrid[emptyIndex] = tile;

                // Mover la ficha reemplazada a la cuadrícula origen
                fromGrid.push(replacedTile);
            }
        }

        // Actualizar puntuación del destino
        if (fromPlayer === 'player') {
            this.botScore++;
        } else {
            this.playerScore++;
        }

        this.render();
        this.updateUI();

        // Verificar victoria del receptor
        const receiver = fromPlayer === 'player' ? 'bot' : 'player';
        if (this.checkWin(receiver)) {
            setTimeout(() => {
                this.endGame(receiver);
            }, 500);
            return;
        }

        this.isAnimating = false;

        // Pasar turno
        if (fromPlayer === 'player') {
            this.isPlayerTurn = false;
            this.render();
            setTimeout(() => this.botTurn(), 800);
        } else {
            this.isPlayerTurn = true;
            this.render();
        }
    }

    botTurn() {
        if (this.gameOver || this.isAnimating) return;

        // Buscar fichas no reveladas
        const hiddenIndices = this.botGrid
            .map((tile, index) => ({ tile, index }))
            .filter(item => !item.tile.revealed);

        if (hiddenIndices.length === 0) return;

        // Elegir una ficha aleatoria
        const randomItem = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
        this.revealTile(randomItem.index, 'bot');
    }

    checkWin(player) {
        const grid = player === 'player' ? this.playerGrid : this.botGrid;
        const suit = player === 'player' ? this.playerSuit : this.botSuit;

        // Contar fichas reveladas del palo correcto
        const correctRevealed = grid.filter(t => t.revealed && t.suit === suit).length;

        return correctRevealed >= 24;
    }

    updateUI() {
        this.scoreEl.textContent = `Tú: ${this.playerScore} | Bot: ${this.botScore}`;

        const indicator = document.querySelector('#battle-screen .turn-indicator');
        if (this.isPlayerTurn) {
            this.turnIndicator.textContent = 'Tu turno - ¡Revela una ficha!';
            indicator.classList.remove('bot-turn');
        } else {
            this.turnIndicator.textContent = 'Turno del Bot...';
            indicator.classList.add('bot-turn');
        }
    }

    endGame(winner) {
        this.gameOver = true;

        const titleEl = document.getElementById('battle-result-title');
        const textEl = document.getElementById('battle-result-text');

        if (winner === 'player') {
            soundManager.play('victory');
            titleEl.textContent = '🎉 ¡VICTORIA! 🎉';
            titleEl.style.color = '#FCEE4B';
            textEl.textContent = `¡Completaste tu palo ${BATTLE_SUITS[this.playerSuit].name} primero!`;
        } else {
            titleEl.textContent = '😔 Derrota 😔';
            titleEl.style.color = '#ff6b6b';
            textEl.textContent = `El bot completó su palo ${BATTLE_SUITS[this.botSuit].name} antes.`;
        }

        this.showScreen('end');
    }
}

/* ============================================
   MODO MEMORY - JUEGO DE MEMORIA
   ============================================ */

class MemoryGame {
    constructor() {
        this.memoryScreen = document.getElementById('memory-screen');
        this.memoryMenu = document.getElementById('memory-menu');
        this.memoryEndScreen = document.getElementById('memory-end-screen');
        this.memoryGrid = document.getElementById('memory-grid');
        this.pairsLeftDisplay = document.getElementById('memory-pairs-left');
        this.attemptsDisplay = document.getElementById('memory-attempts');
        this.finalAttemptsDisplay = document.getElementById('memory-final-attempts');

        this.tiles = [];
        this.flippedTiles = [];
        this.matchedPairs = 0;
        this.totalPairs = 0;
        this.attempts = 0;
        this.isLocked = false;
        this.currentDifficulty = 'easy';

        this.init();
    }

    init() {
        // Selector de dificultad
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                this.startGame(difficulty);
            });
        });

        // Botón volver al menú principal
        document.getElementById('memory-back-to-menu').addEventListener('click', () => {
            this.showScreen('menu');
        });

        // Botón volver durante el juego
        document.getElementById('memory-back-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });

        // Botón reiniciar
        document.getElementById('memory-restart-btn').addEventListener('click', () => {
            this.startGame(this.currentDifficulty);
        });

        // Botones de victoria
        document.getElementById('memory-play-again-btn').addEventListener('click', () => {
            this.startGame(this.currentDifficulty);
        });

        document.getElementById('memory-menu-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });
    }

    showScreen(screen) {
        // Ocultar todas las pantallas
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

        switch (screen) {
            case 'menu':
                document.getElementById('menu-screen').classList.add('active');
                break;
            case 'memory-menu':
                this.memoryMenu.classList.add('active');
                break;
            case 'game':
                this.memoryScreen.classList.add('active');
                break;
            case 'victory':
                this.memoryEndScreen.classList.add('active');
                break;
        }
    }

    startGame(difficulty) {
        this.currentDifficulty = difficulty;
        this.tiles = [];
        this.flippedTiles = [];
        this.matchedPairs = 0;
        this.attempts = 0;
        this.isLocked = false;

        // Determinar número de parejas según dificultad
        const pairCounts = {
            easy: 4,
            normal: 8,
            hard: 12
        };

        this.totalPairs = pairCounts[difficulty];
        this.generateGrid();
        this.updateUI();
        this.showScreen('game');
    }

    generateGrid() {
        this.memoryGrid.innerHTML = '';
        this.memoryGrid.className = `memory-grid ${this.currentDifficulty}`;

        // Obtener tipos de fichas a usar
        const numPairs = this.totalPairs;
        const availableTypes = TILE_TYPES.slice(0, numPairs);

        // Crear parejas
        let tileTypes = [];
        availableTypes.forEach(type => {
            tileTypes.push(type);
            tileTypes.push(type);
        });

        // Mezclar
        tileTypes = this.shuffle(tileTypes);

        // Crear fichas
        tileTypes.forEach((tileType, index) => {
            const tile = document.createElement('div');
            tile.className = 'memory-tile';
            tile.dataset.id = index;
            tile.dataset.typeId = tileType.id;
            tile.innerHTML = `
                <div class="memory-tile-inner">
                    <div class="memory-tile-face memory-tile-back"></div>
                    <div class="memory-tile-face memory-tile-front">
                        <img src="${tileType.image}" alt="${tileType.name}" draggable="false">
                    </div>
                </div>
            `;

            tile.addEventListener('click', () => this.handleTileClick(tile));

            this.memoryGrid.appendChild(tile);
            this.tiles.push({
                element: tile,
                id: index,
                typeId: tileType.id,
                matched: false
            });
        });
    }

    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    handleTileClick(tileElement) {
        if (this.isLocked) return;

        const tile = this.tiles.find(t => t.element === tileElement);
        if (!tile || tile.matched) return;

        // No permitir voltear la misma ficha
        if (this.flippedTiles.includes(tile)) return;

        // Voltear ficha
        soundManager.play('reveal');
        tileElement.classList.add('revealed');
        this.flippedTiles.push(tile);

        // Si hay 2 fichas volteadas, verificar match
        if (this.flippedTiles.length === 2) {
            this.attempts++;
            this.updateUI();
            this.checkMatch();
        }
    }

    checkMatch() {
        this.isLocked = true;
        const [tile1, tile2] = this.flippedTiles;

        if (tile1.typeId === tile2.typeId) {
            // ¡Match!
            soundManager.play('match');
            tile1.matched = true;
            tile2.matched = true;
            tile1.element.classList.add('matched');
            tile2.element.classList.add('matched');
            this.matchedPairs++;
            this.flippedTiles = [];
            this.isLocked = false;
            this.updateUI();

            // Verificar victoria
            if (this.matchedPairs >= this.totalPairs) {
                setTimeout(() => this.showVictory(), 500);
            }
        } else {
            // No match
            soundManager.play('wrong');
            tile1.element.classList.add('wrong');
            tile2.element.classList.add('wrong');

            setTimeout(() => {
                tile1.element.classList.remove('revealed', 'wrong');
                tile2.element.classList.remove('revealed', 'wrong');
                this.flippedTiles = [];
                this.isLocked = false;
            }, 1200);
        }
    }

    updateUI() {
        const remaining = this.totalPairs - this.matchedPairs;
        this.pairsLeftDisplay.textContent = `Parejas: ${remaining}`;
        this.attemptsDisplay.textContent = `Intentos: ${this.attempts}`;
    }

    showVictory() {
        soundManager.play('victory');
        this.finalAttemptsDisplay.textContent = this.attempts;
        this.showScreen('victory');
    }
}

/* ============================================
   CONTROLADOR PRINCIPAL
   ============================================ */

class GameController {
    constructor() {
        this.solitaireGame = null;
        this.traditionalGame = null;
        this.battleGame = null;
        this.memoryGame = null; // Added
        this.init();
    }

    init() {
        // Selector de modo
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode === 'solitaire') {
                    this.showSolitaireMenu();
                } else if (mode === 'competitive') {
                    this.startCompetitive();
                } else if (mode === 'battle') {
                    this.startBattle();
                } else if (mode === 'memory') { // Added
                    this.showMemoryMenu(); // Added
                }
            });
        });

        // Botón volver del menú solitario
        document.getElementById('back-to-menu').addEventListener('click', () => {
            document.getElementById('solitaire-menu').classList.remove('active');
            document.getElementById('menu-screen').classList.add('active');
        });

        // Inicializar juegos
        this.solitaireGame = new MahjongGame();
        this.traditionalGame = new TraditionalGame();
        this.battleGame = new BattleGame();
        this.memoryGame = new MemoryGame(); // Added
    }

    showSolitaireMenu() {
        document.getElementById('menu-screen').classList.remove('active');
        document.getElementById('solitaire-menu').classList.add('active');
    }

    showMemoryMenu() { // Added
        document.getElementById('menu-screen').classList.remove('active');
        document.getElementById('memory-menu').classList.add('active');
    }

    startCompetitive() {
        this.traditionalGame.startGame();
    }

    startBattle() {
        this.battleGame.startGame();
    }
}

// Iniciar el juego cuando cargue la página
document.addEventListener('DOMContentLoaded', () => {
    new GameController();
});
