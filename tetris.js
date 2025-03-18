document.addEventListener('DOMContentLoaded', () => {
    // 게임 상수
    const COLS = 10;
    const ROWS = 20;
    let BLOCK_SIZE = 30;  // const를 let으로 변경
    const COLORS = [
        'transparent',
        '#FF3D92', // I - 더 밝은 핑크
        '#00EAFF', // J - 더 밝은 하늘색
        '#2AFF92', // L - 더 밝은 녹색
        '#FF58FF', // O - 더 밝은 보라색
        '#FFAE2D', // S - 더 밝은 주황색
        '#FFFF58', // T - 더 밝은 노란색
        '#58A7FF'  // Z - 더 밝은 파란색
    ];

    // 테트로미노 모양 정의
    const SHAPES = [
        [],
        [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
        [[2, 0, 0], [2, 2, 2], [0, 0, 0]],                         // J
        [[0, 0, 3], [3, 3, 3], [0, 0, 0]],                         // L
        [[0, 4, 4], [0, 4, 4], [0, 0, 0]],                         // O
        [[0, 5, 5], [5, 5, 0], [0, 0, 0]],                         // S
        [[0, 6, 0], [6, 6, 6], [0, 0, 0]],                         // T
        [[7, 7, 0], [0, 7, 7], [0, 0, 0]]                          // Z
    ];

    // 레벨별 속도 설정 (밀리초)
    const LEVEL_SPEEDS = {
        1: 500,     // 레벨 1: 0.5초 (기존 1초)
        2: 400,     // 레벨 2: 0.4초 (기존 0.8초)
        3: 325,     // 레벨 3: 0.325초 (기존 0.65초)
        4: 250,     // 레벨 4: 0.25초 (기존 0.5초)
        5: 200,     // 레벨 5: 0.2초 (기존 0.4초)
        6: 150,     // 레벨 6: 0.15초 (기존 0.3초)
        7: 125,     // 레벨 7: 0.125초 (기존 0.25초)
        8: 100,     // 레벨 8: 0.1초 (기존 0.2초)
        9: 75,      // 레벨 9: 0.075초 (기존 0.15초)
        10: 50      // 레벨 10 이상: 0.05초 (기존 0.1초)
    };

    // 게임 변수
    let board = createBoard();
    let score = 0;
    let level = 1;
    let lines = 0;
    let gameOver = false;
    let paused = false;
    let requestId = null;
    let time = { start: 0, elapsed: 0, level: LEVEL_SPEEDS[1] };
    let nextPiece = null;  // 다음 블록 저장 변수 추가

    // DOM 요소
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('next-canvas');
    const nextCtx = nextCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');
    const startBtn = document.getElementById('start-button');
    const pauseBtn = document.getElementById('pause-button');
    const controlToggleBtn = document.getElementById('control-toggle');
    const mobileControls = document.querySelector('.mobile-controls');
    const rotateBtn = document.getElementById('rotate-btn');
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const downBtn = document.getElementById('down-btn');
    const dropBtn = document.getElementById('drop-btn');

    // 캔버스 크기 설정
    function resizeCanvas() {
        const gameBoard = document.querySelector('.game-board');
        const boardWidth = gameBoard.clientWidth;
        const boardHeight = gameBoard.clientHeight;
        
        // 게임 보드 캔버스 크기 설정
        canvas.width = boardWidth;
        canvas.height = boardHeight;
        BLOCK_SIZE = boardWidth / COLS;
        
        // 컨텍스트 초기화
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
        
        // 다음 블록 캔버스 크기 설정
        const nextCanvas = document.getElementById('next-canvas');
        nextCanvas.width = 100;
        nextCanvas.height = 100;
        
        // 다음 블록 컨텍스트 초기화
        nextCtx.setTransform(1, 0, 0, 1, 0, 0);
        nextCtx.scale(25, 25);
        
        // 게임 보드 다시 그리기
        if (p) {
            drawBoard();
            p.draw();
        }
    }

    // 초기 캔버스 크기 설정
    resizeCanvas();

    // 화면 크기 변경 시 캔버스 크기 조정
    window.addEventListener('resize', resizeCanvas);

    // 모바일 컨트롤 토글
    let isMobileControl = false;
    controlToggleBtn.addEventListener('click', () => {
        isMobileControl = !isMobileControl;
        mobileControls.classList.toggle('active');
        controlToggleBtn.textContent = isMobileControl ? '키보드 컨트롤' : '모바일 컨트롤';
    });

    // 모바일 컨트롤 이벤트 리스너
    rotateBtn.addEventListener('click', () => {
        if (!gameOver && !paused && isMobileControl) {
            p.rotate();
        }
    });

    leftBtn.addEventListener('click', () => {
        if (!gameOver && !paused && isMobileControl) {
            p.move(-1);
        }
    });

    rightBtn.addEventListener('click', () => {
        if (!gameOver && !paused && isMobileControl) {
            p.move(1);
        }
    });

    downBtn.addEventListener('click', () => {
        if (!gameOver && !paused && isMobileControl) {
            p.drop();
        }
    });

    dropBtn.addEventListener('click', () => {
        if (!gameOver && !paused && isMobileControl) {
            hardDrop();
        }
    });

    // 이벤트 리스너
    startBtn.addEventListener('click', () => {
        if (gameOver) {
            resetGame();
        }
        if (!requestId) {
            play();
            startBtn.textContent = '재시작';
        }
    });

    pauseBtn.addEventListener('click', () => {
        if (!gameOver) {
            if (paused) {
                play();
                pauseBtn.textContent = '일시정지';
            } else {
                pause();
                pauseBtn.textContent = '계속하기';
            }
            paused = !paused;
        }
    });

    document.addEventListener('keydown', event => {
        if (gameOver || paused || isMobileControl) return;

        switch (event.keyCode) {
            case 37: // 왼쪽 화살표
                p.move(-1);
                break;
            case 39: // 오른쪽 화살표
                p.move(1);
                break;
            case 40: // 아래 화살표
                p.drop();
                break;
            case 38: // 위 화살표
                p.rotate();
                break;
            case 32: // 스페이스바
                hardDrop();
                break;
        }
    });

    // 게임 보드 생성
    function createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    // 게임 초기화
    function resetGame() {
        board = createBoard();
        score = 0;
        level = 1;
        lines = 0;
        gameOver = false;
        time = { start: 0, elapsed: 0, level: LEVEL_SPEEDS[1] };
        nextPiece = getRandomPiece();  // 다음 블록 초기화
        drawNext();  // 다음 블록 그리기
        updateScore();
    }

    // 점수 업데이트
    function updateScore() {
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = lines;
    }

    // 게임 일시정지
    function pause() {
        if (!paused) {
            cancelAnimationFrame(requestId);
            requestId = null;
        }
    }

    // 게임 플레이
    function play() {
        time.start = performance.now();
        if (requestId) {
            cancelAnimationFrame(requestId);
        }
        animate();
    }

    // 게임 오버
    function gameOverFunc() {
        cancelAnimationFrame(requestId);
        gameOver = true;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, COLS, ROWS);
        ctx.fillStyle = 'white';
        ctx.font = '1px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', COLS / 2, ROWS / 2);
        startBtn.textContent = '다시 시작';
    }

    // 애니메이션 루프
    function animate(now = 0) {
        time.elapsed = now - time.start;
        if (time.elapsed > time.level) {
            time.start = now;
            if (!p.drop()) {
                freeze();
                clearLines();
                if (p.y === 0) {
                    gameOverFunc();
                    return;
                }
                p = getNextPiece();
            }
        }

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        drawBoard();
        p.draw();
        requestId = requestAnimationFrame(animate);
    }

    // 보드 그리기
    function drawBoard() {
        // 그리드 라인 그리기
        ctx.strokeStyle = '#888';  // 더 밝은 회색으로 변경
        ctx.lineWidth = 0.02;
        
        // 수직선
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ROWS);
            ctx.stroke();
        }
        
        // 수평선
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(COLS, y);
            ctx.stroke();
        }
        
        // 블록 그리기
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    ctx.fillStyle = COLORS[value];
                    ctx.fillRect(x, y, 1, 1);
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 0.05;
                    ctx.strokeRect(x, y, 1, 1);
                }
            });
        });
    }

    // 조각 고정
    function freeze() {
        p.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    board[y + p.y][x + p.x] = value;
                }
            });
        });
    }

    // 라인 제거
    function clearLines() {
        let linesCleared = 0;
        board.forEach((row, y) => {
            if (row.every(value => value > 0)) {
                linesCleared++;
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
            }
        });

        if (linesCleared > 0) {
            // 점수 계산
            switch (linesCleared) {
                case 1:
                    score += 100 * level;
                    break;
                case 2:
                    score += 300 * level;
                    break;
                case 3:
                    score += 500 * level;
                    break;
                case 4:
                    score += 800 * level;
                    break;
            }

            lines += linesCleared;
            
            // 레벨업 처리
            updateLevel();

            updateScore();
        }
    }

    // 하드 드롭 (즉시 내리기)
    function hardDrop() {
        while (p.drop()) {}
    }

    // 조각 클래스
    class Piece {
        constructor(shape, ctx) {
            this.shape = shape;
            this.ctx = ctx;
            this.x = 3;
            this.y = 0;
        }

        draw() {
            this.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value > 0) {
                        this.ctx.fillStyle = COLORS[value];
                        this.ctx.fillRect(this.x + x, this.y + y, 1, 1);
                        this.ctx.strokeStyle = 'white';
                        this.ctx.lineWidth = 0.05;
                        this.ctx.strokeRect(this.x + x, this.y + y, 1, 1);
                    }
                });
            });
        }

        move(dir) {
            this.x += dir;
            if (this.collision()) {
                this.x -= dir;
                return false;
            }
            return true;
        }

        drop() {
            this.y++;
            if (this.collision()) {
                this.y--;
                return false;
            }
            return true;
        }

        rotate() {
            const rotated = [];
            for (let i = 0; i < this.shape[0].length; i++) {
                const row = [];
                for (let j = this.shape.length - 1; j >= 0; j--) {
                    row.push(this.shape[j][i]);
                }
                rotated.push(row);
            }

            const originalShape = this.shape;
            this.shape = rotated;
            
            if (this.collision()) {
                this.shape = originalShape;
                return false;
            }
            return true;
        }

        collision() {
            for (let y = 0; y < this.shape.length; y++) {
                for (let x = 0; x < this.shape[y].length; x++) {
                    if (this.shape[y][x] > 0) {
                        const boardX = this.x + x;
                        const boardY = this.y + y;

                        if (
                            boardX < 0 || 
                            boardX >= COLS || 
                            boardY >= ROWS ||
                            (boardY >= 0 && board[boardY][boardX] > 0)
                        ) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
    }

    // 랜덤 조각 생성
    function getRandomPiece() {
        const pieceType = Math.floor(Math.random() * 7) + 1;
        return new Piece(SHAPES[pieceType], ctx);
    }

    // 다음 조각 그리기
    function drawNext() {
        nextCtx.clearRect(0, 0, nextCtx.canvas.width, nextCtx.canvas.height);
        if (nextPiece) {
            // 다음 블록을 중앙에 배치하기 위한 오프셋 계산
            const offsetX = (4 - nextPiece.shape[0].length) / 2;
            const offsetY = (4 - nextPiece.shape.length) / 2;
            
            nextPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value > 0) {
                        nextCtx.fillStyle = COLORS[value];
                        nextCtx.fillRect(offsetX + x, offsetY + y, 1, 1);
                        nextCtx.strokeStyle = 'white';
                        nextCtx.lineWidth = 0.05;
                        nextCtx.strokeRect(offsetX + x, offsetY + y, 1, 1);
                    }
                });
            });
        }
    }

    // 다음 조각 가져오기
    function getNextPiece() {
        const piece = nextPiece || getRandomPiece();
        nextPiece = getRandomPiece();
        drawNext();
        return piece;
    }

    // 레벨업 처리
    function updateLevel() {
        const newLevel = Math.floor(lines / 5) + 1;
        if (newLevel !== level) {
            level = newLevel;
            time.level = LEVEL_SPEEDS[level];
            updateScore();
            
            // 레벨업 시 배경색 변경
            const gameBoard = document.querySelector('.game-board');
            const colors = ['#2a2a2a', '#2a3a2a', '#2a2a3a', '#3a2a2a', '#2a3a3a'];
            gameBoard.style.backgroundColor = colors[level % colors.length];
        }
    }

    // 게임 시작
    let p = null;
    resetGame();
    p = getNextPiece();
    drawBoard();
}); 