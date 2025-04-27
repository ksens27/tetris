const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startButton = document.getElementById('start-btn');

// 효과음 추가
const clearSound = new Audio('sounds/clear.mp3');
clearSound.volume = 0.5; // 볼륨 설정

context.scale(30, 30);

// 테트리스 블록 모양 정의
const pieces = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[1, 1, 1], [0, 1, 0]], // T
    [[1, 1, 1], [1, 0, 0]], // L
    [[1, 1, 1], [0, 0, 1]], // J
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]]  // Z
];

// 색상 정의
const colors = [
    '#FF0D72', '#0DC2FF', '#0DFF72',
    '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'
];

let score = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameOver = false;
let gameStarted = false;
let startTime = null;
let speedUpApplied = false;

// 게임 보드 생성
const board = Array(20).fill().map(() => Array(10).fill(0));

// 현재 블록 생성
let piece = {
    pos: {x: 0, y: 0},
    matrix: null,
    color: null
};

// 새 블록 생성
function createPiece() {
    const pieceType = Math.floor(Math.random() * pieces.length);
    piece.matrix = pieces[pieceType];
    piece.color = colors[pieceType];
    piece.pos.y = 0;
    piece.pos.x = Math.floor(board[0].length / 2) - Math.floor(piece.matrix[0].length / 2);
}

// 충돌 감지
function collide() {
    const [m, o] = [piece.matrix, piece.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (board[y + o.y] &&
                board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// 블록 회전
function rotate() {
    const matrix = piece.matrix;
    const N = matrix.length;
    const M = matrix[0].length;
    const rotated = Array(M).fill().map(() => Array(N).fill(0));
    
    for (let y = 0; y < N; ++y) {
        for (let x = 0; x < M; ++x) {
            rotated[x][N - 1 - y] = matrix[y][x];
        }
    }
    
    piece.matrix = rotated;
    if (collide()) {
        piece.matrix = matrix;
    }
}

// 블록 이동
function move(dir) {
    piece.pos.x += dir;
    if (collide()) {
        piece.pos.x -= dir;
    }
}

// 블록 떨어뜨리기
function drop() {
    piece.pos.y++;
    if (collide()) {
        piece.pos.y--;
        merge();
        createPiece();
        if (collide()) {
            gameOver = true;
            gameStarted = false;
            startButton.textContent = '다시 시작';
        }
    }
    dropCounter = 0;
}

// 블록 즉시 떨어뜨리기
function hardDrop() {
    while (!collide()) {
        piece.pos.y++;
    }
    piece.pos.y--;
    merge();
    createPiece();
}

// 블록 고정
function merge() {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.pos.y][x + piece.pos.x] = piece.color;
            }
        });
    });
    clearLines();
}

// 줄 제거
function clearLines() {
    let linesCleared = 0;
    outer: for (let y = board.length - 1; y >= 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        linesCleared++;
    }
    if (linesCleared > 0) {
        // 효과음 재생
        clearSound.currentTime = 0;
        clearSound.play().catch(error => {
            console.log('효과음 재생 실패:', error);
        });
        
        score += linesCleared * 100 * level;
        scoreElement.textContent = score;
        if (score >= level * 1000) {
            level++;
            levelElement.textContent = level;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        }
    }
}

// 블록 그리기 함수 (이미지 스타일)
function drawBlock(x, y, color) {
    // 그라데이션 생성
    const grad = context.createLinearGradient(x, y, x + 1, y + 1);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, color);
    grad.addColorStop(1, '#222');
    context.fillStyle = grad;
    context.fillRect(x, y, 1, 1);

    // 밝은 하이라이트
    context.fillStyle = 'rgba(255,255,255,0.25)';
    context.fillRect(x, y, 1, 0.3);
    context.fillRect(x, y, 0.3, 1);

    // 테두리
    context.strokeStyle = '#222';
    context.lineWidth = 0.08;
    context.strokeRect(x + 0.04, y + 0.04, 0.92, 0.92);
}

// 게임 보드 그리기
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#006B70';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 보드 그리기
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(x, y, value);
            }
        });
    });
    
    // 현재 블록 그리기
    if (piece.matrix) {
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(x + piece.pos.x, y + piece.pos.y, piece.color);
                }
            });
        });
    }
}

// 게임 업데이트
function update(time = 0) {
    if (!gameStarted || gameOver) return;
    
    if (!startTime) startTime = time;
    // 30초(30000ms) 경과 시 속도 증가
    if (!speedUpApplied && time - startTime > 30000) {
        dropInterval = Math.max(50, dropInterval * 0.6); // 속도를 40% 더 빠르게
        speedUpApplied = true;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        drop();
    }
    
    draw();
    requestAnimationFrame(update);
}

// 키보드 이벤트 처리
document.addEventListener('keydown', event => {
    if (!gameStarted) return;
    
    switch (event.keyCode) {
        case 37: // 왼쪽
            move(-1);
            break;
        case 39: // 오른쪽
            move(1);
            break;
        case 40: // 아래
            drop();
            break;
        case 38: // 위
            rotate();
            break;
        case 32: // 스페이스바
            hardDrop();
            break;
    }
});

// 게임 시작 버튼
startButton.addEventListener('click', () => {
    // 게임 재시작
    for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
            board[y][x] = 0;
        }
    }
    score = 0;
    level = 1;
    dropCounter = 0;
    dropInterval = 1000;
    lastTime = 0;
    gameOver = false;
    scoreElement.textContent = score;
    levelElement.textContent = level;
    piece = {
        pos: {x: 0, y: 0},
        matrix: null,
        color: null
    };
    
    gameStarted = true;
    startButton.textContent = '게임 중...';
    createPiece();
    startTime = null;
    speedUpApplied = false;
    update();
}); 