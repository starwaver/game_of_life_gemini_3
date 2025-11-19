class GameOfLife {
    constructor() {
        this.canvas = document.getElementById('grid-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.chartCanvas = document.getElementById('chart-canvas');
        this.chartCtx = this.chartCanvas.getContext('2d');

        // Configuration
        this.rows = 50;
        this.cols = 50;
        this.cellSize = 10;
        this.grid = [];
        this.isRunning = false;
        this.speed = 100;
        this.generation = 0;
        this.animationId = null;
        this.lastFrameTime = 0;

        // Rules (Standard GoL)
        this.birthRules = [3];
        this.survivalRules = [2, 3];

        // Colors
        this.deadColor = '#0f172a';
        this.gridLineColor = '#1e293b';

        // Chart Data
        this.populationHistory = [];
        this.maxHistoryPoints = 100;

        this.init();
    }

    init() {
        this.resizeCanvas();
        this.resizeChart();
        this.createGrid();
        this.setupEventListeners();
        this.draw();
        this.drawChart();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.resizeChart();
            this.draw();
            this.drawChart();
        });
    }

    createGrid() {
        this.grid = new Array(this.rows).fill(null)
            .map(() => new Array(this.cols).fill(0));
        this.generation = 0;
        this.populationHistory = [];
        this.updateStats();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight) - 40;

        this.canvas.width = size;
        this.canvas.height = size;

        this.cellSize = size / Math.max(this.rows, this.cols);
    }

    resizeChart() {
        const container = this.chartCanvas.parentElement;
        this.chartCanvas.width = container.clientWidth;
        this.chartCanvas.height = container.clientHeight;
    }

    setupEventListeners() {
        // Playback
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('stop-btn').addEventListener('click', () => this.stop());
        document.getElementById('next-btn').addEventListener('click', () => this.step());

        // Speed
        const speedInput = document.getElementById('speed-range');
        speedInput.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
        });

        // Grid Settings
        document.getElementById('resize-btn').addEventListener('click', () => {
            const r = parseInt(document.getElementById('grid-rows').value);
            const c = parseInt(document.getElementById('grid-cols').value);
            if (r > 0 && c > 0) {
                this.rows = r;
                this.cols = c;
                this.stop();
                this.resizeCanvas();
                this.createGrid();
                this.draw();
                this.drawChart();
            }
        });

        // Rules
        document.getElementById('update-rules-btn').addEventListener('click', () => {
            const b = document.getElementById('birth-rule').value;
            const s = document.getElementById('survival-rule').value;

            this.birthRules = b.split('').map(Number);
            this.survivalRules = s.split('').map(Number);
        });

        // Actions
        document.getElementById('random-btn').addEventListener('click', () => {
            this.randomize();
            this.draw();
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.stop();
            this.createGrid();
            this.draw();
            this.drawChart();
        });

        // Canvas Interaction
        let isDrawing = false;

        const getCellCoords = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const col = Math.floor(x / this.cellSize);
            const row = Math.floor(y / this.cellSize);
            return { row, col };
        };

        this.canvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            const { row, col } = getCellCoords(e);
            this.toggleCell(row, col);
            this.draw();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (isDrawing) {
                const { row, col } = getCellCoords(e);
                if (this.isValidCell(row, col)) {
                    this.grid[row][col] = 1;
                    this.draw();
                }
            }
        });

        window.addEventListener('mouseup', () => {
            isDrawing = false;
        });
    }

    isValidCell(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    toggleCell(row, col) {
        if (this.isValidCell(row, col)) {
            this.grid[row][col] = this.grid[row][col] ? 0 : 1;
        }
    }

    randomize() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = Math.random() > 0.8 ? 1 : 0;
            }
        }
        this.generation = 0;
        this.populationHistory = [];
        this.updateStats();
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            document.getElementById('start-btn').disabled = true;
            document.getElementById('stop-btn').disabled = false;
            this.lastFrameTime = performance.now();
            this.loop();
        }
    }

    stop() {
        this.isRunning = false;
        document.getElementById('start-btn').disabled = false;
        document.getElementById('stop-btn').disabled = true;
        cancelAnimationFrame(this.animationId);
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame((t) => this.loop(t));

        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime > this.speed) {
            this.step();
            this.lastFrameTime = currentTime;
        }
    }

    step() {
        const newGrid = this.grid.map(arr => [...arr]);
        let population = 0;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const neighbors = this.countNeighbors(r, c);
                const isAlive = this.grid[r][c] === 1;

                if (isAlive) {
                    if (this.survivalRules.includes(neighbors)) {
                        newGrid[r][c] = 1;
                        population++;
                    } else {
                        newGrid[r][c] = 0;
                    }
                } else {
                    if (this.birthRules.includes(neighbors)) {
                        newGrid[r][c] = 1;
                        population++;
                    }
                }
            }
        }

        this.grid = newGrid;
        this.generation++;
        this.updateStats(population);
        this.draw();
    }

    countNeighbors(row, col) {
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;

                const r = row + i;
                const c = col + j;

                if (this.isValidCell(r, c)) {
                    count += this.grid[r][c];
                }
            }
        }
        return count;
    }

    updateStats(pop) {
        document.getElementById('generation-count').textContent = this.generation;

        if (pop === undefined) {
            pop = this.grid.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
        }
        document.getElementById('population-count').textContent = pop;

        // Update Chart Data
        this.populationHistory.push(pop);
        if (this.populationHistory.length > this.maxHistoryPoints) {
            this.populationHistory.shift();
        }
        this.drawChart();
    }

    draw() {
        // Clear
        this.ctx.fillStyle = this.deadColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Create Gradient
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#38bdf8'); // Cyan
        gradient.addColorStop(0.5, '#818cf8'); // Indigo
        gradient.addColorStop(1, '#c084fc'); // Purple

        this.ctx.fillStyle = gradient;

        // Draw Cells
        this.ctx.beginPath();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c]) {
                    this.ctx.rect(
                        c * this.cellSize,
                        r * this.cellSize,
                        this.cellSize - 1,
                        this.cellSize - 1
                    );
                }
            }
        }
        this.ctx.fill();
    }

    drawChart() {
        const w = this.chartCanvas.width;
        const h = this.chartCanvas.height;
        const ctx = this.chartCtx;
        const data = this.populationHistory;

        // Clear
        ctx.fillStyle = '#1e293b'; // Match sidebar bg
        ctx.fillRect(0, 0, w, h);

        if (data.length < 2) return;

        // Find min/max for scaling
        const maxPop = Math.max(...data, 100); // Minimum scale of 100
        const minPop = 0;

        const getX = (i) => (i / (this.maxHistoryPoints - 1)) * w;
        const getY = (val) => h - ((val - minPop) / (maxPop - minPop)) * h;

        // Draw Line
        ctx.beginPath();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;

        // Start path
        // If we have fewer points than max, we still want to stretch them across? 
        // Or just draw them from left? Let's draw from left.
        const stepX = w / (this.maxHistoryPoints - 1);

        data.forEach((val, i) => {
            const x = i * stepX;
            const y = getY(val);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();

        // Fill area under chart
        ctx.lineTo((data.length - 1) * stepX, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.fill();
    }
}

// Initialize game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const game = new GameOfLife();
});
