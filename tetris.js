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

    // DOM 요소
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('next-canvas');
    const nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;
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

    // 모바일 컨트롤 토글
    let isMobileControl = false;
    
    controlToggleBtn.addEventListener('click', () => {
        isMobileControl = !isMobileControl;
        mobileControls.style.display = isMobileControl ? 'flex' : 'none';
        controlToggleBtn.textContent = isMobileControl ? '키보드 컨트롤' : '모바일 컨트롤';
        
        if (isMobileControl) {
            document.removeEventListener('keydown', handleKeyDown);
        } else {
            document.addEventListener('keydown', handleKeyDown);
        }
    });

    // 초기 상태 설정
    mobileControls.style.display = 'none';
    document.addEventListener('keydown', handleKeyDown);

    // 시작 버튼 이벤트 리스너
    startBtn.addEventListener('click', () => {
        if (gameOver) {
            resetGame();
        }
        
        if (!requestId) {
            play();
        }
        
        startBtn.textContent = '재시작';
    });

    // 일시정지 버튼 이벤트 리스너
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

    // 모바일 컨트롤 버튼 이벤트 리스너
    rotateBtn.addEventListener('click', () => {
        if (!gameOver && !paused && isMobileControl && p) {
            p.rotate();
        }
    });

    leftBtn.addEventListener('click', () => {
        if (!gameOver && !paused && isMobileControl && p) {
            p.move(-1);
        }
    });

    rightBtn.addEventListener('click', () => {
        if (!gameOver && !paused && isMobileControl && p) {
            p.move(1);
        }
    });

    downBtn.addEventListener('click', () => {
        if (!gameOver && !paused && isMobileControl && p) {
            p.drop();
        }
    });

    dropBtn.addEventListener('click', () => {
        if (!gameOver && !paused && isMobileControl && p) {
            hardDrop();
        }
    });

    // 키보드 이벤트 핸들러
    function handleKeyDown(event) {
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
    }

    // 게임 변수
    let board = createBoard();
    let score = 0;
    let level = 1;
    let lines = 0;
    let gameOver = false;
    let paused = false;
    let requestId = null;
    let time = { start: 0, elapsed: 0, level: LEVEL_SPEEDS[1] };
    let p = null;
    let nextPiece = null;

    // 게임 초기화 (최초 로드 시)
    function initializeGame() {
        // 캔버스 크기 설정
        resizeCanvas();
        
        // 게임 보드 생성
        board = createBoard();
        gameOver = false;
        paused = false;
        
        // 초기 점수 설정
        score = 0;
        level = 1;
        lines = 0;
        time = { start: 0, elapsed: 0, level: LEVEL_SPEEDS[1] };
        
        // 초기 블록 생성
        nextPiece = getRandomPiece();
        p = getRandomPiece();
        
        // UI 업데이트
        updateScore();
        drawBoard();
        if (nextCtx) {
            drawNextPiece();
        }
    }

    // 게임 리셋 (재시작 시)
    function resetGame() {
        board = createBoard();
        score = 0;
        level = 1;
        lines = 0;
        gameOver = false;
        paused = false;
        time = { start: 0, elapsed: 0, level: LEVEL_SPEEDS[1] };
        nextPiece = getRandomPiece();
        p = getRandomPiece();
        updateScore();
        drawBoard();
        if (nextCtx) {
            drawNextPiece();
        }
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
        if (gameOver) {
            resetGame();
        }
        
        // 이미 블록이 생성되어 있지 않으면 생성
        if (!p) {
            p = getRandomPiece();
        }
        
        if (!nextPiece) {
            nextPiece = getRandomPiece();
        }
        
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
        if (gameOver || paused) {
            cancelAnimationFrame(requestId);
            requestId = null;
            return;
        }

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
                // 다음 조각을 현재 조각으로
                p = nextPiece;
                // 새로운 다음 조각 생성
                nextPiece = getRandomPiece();
                // 다음 조각 그리기
                if (nextCtx) {
                    drawNextPiece();
                }
            }
        }

        ctx.clearRect(0, 0, COLS, ROWS);
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
            this.x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);  // 중앙에서 시작
            this.y = 0;
        }

        draw() {
            const value = this.shape[0].find(v => v > 0) || 1;  // 블록 색상 값 찾기
            this.shape.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell > 0) {
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

    // 새로운 조각 가져오기
    function getRandomPiece() {
        const pieces = [1, 2, 3, 4, 5, 6, 7];  // 1부터 7까지의 숫자로 변경
        const piece = pieces[Math.floor(Math.random() * pieces.length)];
        return new Piece(SHAPES[piece], ctx);
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

    // 다음 조각 그리기
    function drawNextPiece() {
        if (!nextCtx || !nextPiece) return;
        
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        nextCtx.fillStyle = '#2a2a2a';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    nextCtx.fillStyle = COLORS[value];
                    nextCtx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    nextCtx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    // 캔버스 크기 설정
    function resizeCanvas() {
        // 화면 크기 가져오기
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // 게임 보드 요소 가져오기
        const gameBoard = document.querySelector('.game-board');
        const container = document.querySelector('.container');
        const leftPanel = document.querySelector('.left-panel');
        const rightPanel = document.querySelector('.right-panel');
        
        // 사용 가능한 최대 높이 계산
        const availableHeight = screenHeight * 0.85;
        
        // 게임 보드의 크기 계산 (2:1 비율 유지)
        let boardHeight = Math.min(availableHeight, screenHeight * 0.7);
        let boardWidth = boardHeight / 2;
        
        // 화면 너비를 초과하지 않도록 조정
        if (boardWidth > screenWidth * 0.4) {
            boardWidth = screenWidth * 0.4;
            boardHeight = boardWidth * 2;
        }
        
        // 게임 보드 스타일 설정
        gameBoard.style.width = `${boardWidth}px`;
        gameBoard.style.height = `${boardHeight}px`;
        
        // 캔버스 크기 설정
        canvas.width = boardWidth;
        canvas.height = boardHeight;
        BLOCK_SIZE = boardWidth / COLS;
        
        // 컨텍스트 초기화
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
        
        // 다음 블록 캔버스 크기 설정
        if (nextCanvas && nextCtx) {
            const nextBlockSize = Math.min(boardWidth * 0.3, 90);
            nextCanvas.width = nextBlockSize;
            nextCanvas.height = nextBlockSize;
            
            // 다음 블록 컨텍스트 초기화
            nextCtx.setTransform(1, 0, 0, 1, 0, 0);
            nextCtx.scale(nextBlockSize/4, nextBlockSize/4);
        }
        
        // 게임 보드 다시 그리기
        if (p) {
            drawBoard();
            p.draw();
            if (nextPiece && nextCtx) {
                drawNextPiece();
            }
        }
    }

    // 초기 캔버스 크기 설정
    resizeCanvas();

    // 화면 크기 변경 시 캔버스 크기 조정
    window.addEventListener('resize', resizeCanvas);

    // viewport 높이 설정 함수
    function setViewportHeight() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    // 초기 viewport 높이 설정
    setViewportHeight();

    // 화면 크기가 변경될 때마다 viewport 높이 다시 계산
    window.addEventListener('resize', () => {
        setViewportHeight();
    });

    // 모바일 기기에서 방향이 변경될 때도 viewport 높이 다시 계산
    window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
    });

    // 초기 게임 설정
    initializeGame();
    drawBoard();

    // 게임 보드 생성
    function createBoard() {
        return Array(ROWS).fill().map(() => Array(COLS).fill(0));
    }
}); 