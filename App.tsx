import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Grid, GameState, Tetromino, TetrominoType, Player, GridCell } from './types';
import { TETROMINOS, BOARD_HEIGHT, BOARD_WIDTH, MAX_LEVEL } from './constants';
import TetrisBoard from './components/TetrisBoard';
import CubeMinigame from './components/CubeMinigame';
import { soundService } from './services/soundService';
import { Trophy, RotateCw, ArrowDownToLine, Layers, Repeat, Play, X, Share2, Check, ArrowLeft, ArrowRight, ArrowDown } from 'lucide-react';

const createEmptyGrid = (): Grid => 
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));

const getRandomTetromino = (): Tetromino => {
  const types = Object.values(TetrominoType).filter(t => t !== TetrominoType.STONE && t !== TetrominoType.PENDING);
  const type = types[Math.floor(Math.random() * types.length)] as TetrominoType;
  // Deep copy
  const original = TETROMINOS[type];
  return {
    ...original,
    shape: original.shape.map(row => [...row])
  };
};

const rotateMatrix = (matrix: number[][]) => {
  return matrix[0].map((val, index) => matrix.map(row => row[index]).reverse());
};

const App: React.FC = () => {
  const [grid, setGrid] = useState<Grid>(createEmptyGrid());
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [activePiece, setActivePiece] = useState<{data: Tetromino, x: number, y: number, rotation: number} | null>(null);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0); // Current Game Score
  const [playerName, setPlayerName] = useState('');
  const [pendingLines, setPendingLines] = useState<number[]>([]); 
  const [gameTime, setGameTime] = useState(0);
  const [explodingLines, setExplodingLines] = useState<number[]>([]);
  const [pendingCount, setPendingCount] = useState(0); // Count of PENDING lines on board

  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [savedGame, setSavedGame] = useState<{level: number, playerName: string, gameTime: number, score: number} | null>(null);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
  const [showToast, setShowToast] = useState(false); // For copy feedback

  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dropCounterRef = useRef<number>(0);
  
  // Touch Handling Refs (Kept for optional swipe, but buttons are primary now)
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const touchLastPos = useRef<{x: number, y: number} | null>(null);
  const touchAccumulator = useRef<{x: number, y: number}>({x: 0, y: 0});

  // Calculate Drop Interval based on Level (Faster as levels go up)
  const dropInterval = Math.max(200, 800 - (level - 1) * 60);

  useEffect(() => {
    const saved = localStorage.getItem('tetrisCubeLeaderboard');
    if (saved) {
      try {
          const parsed = JSON.parse(saved);
          setLeaderboard(parsed);
      } catch (e) {
          console.error("Error parsing leaderboard", e);
      }
    }
    const savedProgress = localStorage.getItem('tetrisCubeSavedGame');
    if (savedProgress) {
        setSavedGame(JSON.parse(savedProgress));
    }
  }, []);

  // Save progress automatically when level changes or game starts
  useEffect(() => {
      if (gameState === GameState.PLAYING) {
          const progress = { level, playerName, gameTime, score };
          localStorage.setItem('tetrisCubeSavedGame', JSON.stringify(progress));
          setSavedGame(progress);
      }
  }, [level, gameState, score]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const saveScore = useCallback(() => {
    const currentSaved = localStorage.getItem('tetrisCubeLeaderboard');
    const currentBoard: Player[] = currentSaved ? JSON.parse(currentSaved) : [];

    const newPlayer: Player = {
      name: playerName || 'Anónimo',
      score: score,
      level: level,
      time: formatTime(gameTime),
      timeSeconds: gameTime,
      date: Date.now()
    };
    
    // Sort: Higher Score first. Tie-breaker: Lower Time (Faster)
    const newBoard = [...currentBoard, newPlayer]
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const timeA = a.timeSeconds || 99999; 
            const timeB = b.timeSeconds || 99999;
            return timeA - timeB;
        })
        .slice(0, 10);

    setLeaderboard(newBoard);
    localStorage.setItem('tetrisCubeLeaderboard', JSON.stringify(newBoard));
  }, [level, gameTime, playerName, score]);

  const handleShare = async () => {
    const url = window.location.href;
    const text = `🧊 TETRISCUBE 🧊\n\n¡He conseguido ${score} puntos en el Nivel ${level}!\nSoy el Maestro del Cubo. 🏆\n\n¿Puedes superarme?\nJuega aquí: ${url}`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'TETRISCUBE Challenge',
                text: text,
                url: url,
            });
        } catch (error) {
            console.log('Error sharing:', error);
        }
    } else {
        // Fallback to clipboard
        try {
            await navigator.clipboard.writeText(text);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }
  };

  const spawnPiece = useCallback(() => {
    const piece = getRandomTetromino();
    const x = Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2);
    setActivePiece({
      data: piece,
      x: x,
      y: 0,
      rotation: 0
    });

    if (checkCollision(piece.shape, x, 0, grid)) {
      setGameState(GameState.GAMEOVER);
      soundService.playSimonFail();
      saveScore();
      // Clear save on game over
      localStorage.removeItem('tetrisCubeSavedGame');
      setSavedGame(null);
    }
  }, [grid, saveScore]);

  const checkCollision = (shape: number[][], x: number, y: number, board: Grid) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newY = y + r;
          const newX = x + c;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true;
          // Collision with blocks (Stone or Pending included)
          if (newY >= 0 && board[newY][newX]) return true;
        }
      }
    }
    return false;
  };

  const lockPiece = (pieceToLock = activePiece) => {
    if (!pieceToLock) return;
    soundService.playDrop();
    
    // Add points for placing a piece
    setScore(prev => prev + 10);

    const newGrid = grid.map(row => [...row]);
    const { data, x, y } = pieceToLock;
    
    for (let r = 0; r < data.shape.length; r++) {
      for (let c = 0; c < data.shape[r].length; c++) {
        if (data.shape[r][c]) {
          if (y + r >= 0 && y + r < BOARD_HEIGHT && x + c >= 0 && x + c < BOARD_WIDTH) {
             newGrid[y + r][x + c] = { type: data.type, color: data.color };
          }
        }
      }
    }

    // Identify Full Rows and convert them to PENDING state
    // We only convert rows that are full of standard blocks (not Stone, not already Pending)
    const newGridWithPending = newGrid.map(row => {
        const isFull = row.every(cell => cell !== null);
        const hasStone = row.some(cell => cell?.type === TetrominoType.STONE);
        const isAlreadyPending = row.some(cell => cell?.type === TetrominoType.PENDING);
        
        if (isFull && !hasStone && !isAlreadyPending) {
             // Convert to PENDING
             return row.map(cell => ({ ...cell!, type: TetrominoType.PENDING, color: 'yellow-400' }));
        }
        return row;
    });

    // Count Total Pending Lines on Board
    const currentPendingIndices: number[] = [];
    newGridWithPending.forEach((row, index) => {
        if (row.some(cell => cell?.type === TetrominoType.PENDING)) {
            currentPendingIndices.push(index);
        }
    });

    setPendingCount(currentPendingIndices.length);
    setGrid(newGridWithPending);
    setActivePiece(null);

    // Check if we met the Level Requirement
    // Level N requires N lines to be gathered
    if (currentPendingIndices.length >= level) {
      setPendingLines(currentPendingIndices);
      
      // -- NEW LOGIC: Visual Feedback Delay --
      // Set a temporary state to freeze game loop but show the board with pulsing yellow lines
      setGameState(GameState.LINE_CLEAR); 
      soundService.playLineClear();
      
      // Wait for visual effect (approx 2 flashes/pulses)
      setTimeout(() => {
         setGameState(GameState.MINIGAME);
      }, 1500); 

    } else {
      // Just continue, lines are now "Pending/Charged"
      if (currentPendingIndices.length > pendingCount) {
          soundService.playLineClear();
      }
      spawnPiece();
    }
  };

  const manualMove = (dirX: number, dirY: number) => {
      if (!activePiece || gameState !== GameState.PLAYING) return;
      
      const { data, x, y } = activePiece;
      if (!checkCollision(data.shape, x + dirX, y + dirY, grid)) {
          setActivePiece({ ...activePiece, x: x + dirX, y: y + dirY });
          if (dirX !== 0) soundService.playMove();
      } else if (dirY > 0) {
          lockPiece();
      }
  };
  
  const hardDrop = () => {
      if (!activePiece || gameState !== GameState.PLAYING) return;
      let currentY = activePiece.y;
      while (!checkCollision(activePiece.data.shape, activePiece.x, currentY + 1, grid)) {
          currentY++;
      }
      const droppedPiece = { ...activePiece, y: currentY };
      setActivePiece(droppedPiece);
      lockPiece(droppedPiece);
  };

  const rotate = () => {
    if (!activePiece || gameState !== GameState.PLAYING) return;
    const rotatedShape = rotateMatrix(activePiece.data.shape);
    let offset = 0;
    if (checkCollision(rotatedShape, activePiece.x, activePiece.y, grid)) {
      offset = activePiece.x < BOARD_WIDTH / 2 ? 1 : -1;
      if (checkCollision(rotatedShape, activePiece.x + offset, activePiece.y, grid)) {
        return; 
      }
    }
    setActivePiece({
      ...activePiece,
      data: { ...activePiece.data, shape: rotatedShape },
      x: activePiece.x + offset
    });
    soundService.playRotate();
  };

  const update = (time: number) => {
    // Only update if strictly in PLAYING state
    if (gameState !== GameState.PLAYING) return;

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    dropCounterRef.current += deltaTime;
    if (dropCounterRef.current > dropInterval) {
      manualMove(0, 1);
      dropCounterRef.current = 0;
    }
    
    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, activePiece, grid, dropInterval]); 

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState === GameState.PLAYING) {
      interval = setInterval(() => setGameTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      switch(e.key) {
        case 'ArrowLeft': manualMove(-1, 0); break;
        case 'ArrowRight': manualMove(1, 0); break;
        case 'ArrowDown': manualMove(0, 1); break;
        case 'ArrowUp': rotate(); break;
        case ' ': hardDrop(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activePiece, grid]);

  // --- TOUCH HANDLERS (GESTURES) ---
  // Keeping these for hybrid feel, but buttons are primary now
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== GameState.PLAYING) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchLastPos.current = { x: touch.clientX, y: touch.clientY };
    touchAccumulator.current = { x: 0, y: 0 };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState !== GameState.PLAYING || !touchLastPos.current) return;
    const touch = e.touches[0];
    
    const deltaX = touch.clientX - touchLastPos.current.x;
    const deltaY = touch.clientY - touchLastPos.current.y;
    
    touchAccumulator.current.x += deltaX;
    touchAccumulator.current.y += deltaY;

    // Movement Thresholds (Higher to prefer buttons)
    const MOVE_THRESHOLD = 20; 
    const DROP_THRESHOLD = 30; 

    // Horizontal Movement
    if (Math.abs(touchAccumulator.current.x) > MOVE_THRESHOLD) {
        const direction = touchAccumulator.current.x > 0 ? 1 : -1;
        manualMove(direction, 0);
        touchAccumulator.current.x = 0; 
    }

    // Vertical Movement (Soft Drop)
    if (touchAccumulator.current.y > DROP_THRESHOLD) {
        manualMove(0, 1);
        touchAccumulator.current.y = 0;
    }

    touchLastPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    touchStartPos.current = null;
    touchLastPos.current = null;
    touchAccumulator.current = { x: 0, y: 0 };
  };

  const startGame = () => {
    if (!playerName.trim()) {
        alert("¡Por favor ingresa tu nombre!");
        return;
    }
    
    const newGrid = createEmptyGrid();
    setGrid(newGrid);
    
    setLevel(1);
    setScore(0);
    setPendingCount(0);
    setGameTime(0);
    setGameState(GameState.PLAYING);
    
    // Initial spawn
    const piece = getRandomTetromino();
    const x = Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2);
    setActivePiece({
      data: piece,
      x: x,
      y: 0,
      rotation: 0
    });
    
    soundService.playGameStart();
  };

  const resumeGame = () => {
      if (!savedGame) return;
      const newGrid = createEmptyGrid();
      setGrid(newGrid);
      
      setPlayerName(savedGame.playerName);
      setLevel(savedGame.level);
      setGameTime(savedGame.gameTime);
      setScore(savedGame.score || 0);
      setPendingCount(0);
      setPendingLines([]);
      setExplodingLines([]);
      
      setGameState(GameState.PLAYING);
      
      const piece = getRandomTetromino();
      const x = Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2);
      setActivePiece({
        data: piece,
        x: x,
        y: 0,
        rotation: 0
      });
      soundService.playGameStart();
  };

  const handleMinigameSuccess = () => {
    setGameState(GameState.ANIMATING);
    setExplodingLines(pendingLines);
    soundService.playExplosion();
    
    // Award Points for cleared lines (100 pts per line)
    const points = pendingLines.length * 100;
    setScore(prev => prev + points);

    // Destroy the pending lines
    setTimeout(() => {
        // Remove exploded lines
        const newGrid = grid.filter((_, index) => !pendingLines.includes(index));
        const linesCleared = pendingLines.length;
        
        for(let i=0; i<linesCleared; i++) {
            newGrid.unshift(Array(BOARD_WIDTH).fill(null));
        }
        
        setGrid(newGrid);
        setExplodingLines([]);
        setPendingLines([]);
        setPendingCount(0);
        
        const nextLevel = level + 1;
        if (nextLevel > MAX_LEVEL) {
            setGameState(GameState.VICTORY);
            saveScore();
            // Clear save on victory
            localStorage.removeItem('tetrisCubeSavedGame');
            setSavedGame(null);
        } else {
            setLevel(nextLevel);
            setGameState(GameState.PLAYING);
            spawnPiece();
        }
    }, 2000); 
  };

  const handleMinigameFailure = () => {
    // Punish: Turn PENDING lines to STONE
    const newGrid = grid.map((row, index) => {
        if (pendingLines.includes(index)) {
            return row.map(cell => cell ? { ...cell, type: TetrominoType.STONE } : null);
        }
        return row;
    });

    setGrid(newGrid);
    setPendingLines([]);
    setPendingCount(0); 
    
    setGameState(GameState.ANIMATING);
    
    setTimeout(() => {
        setGameState(GameState.PLAYING);
        spawnPiece();
    }, 2000);
  };

  // Render Ranking List Item
  const renderRankingItem = (p: Player, i: number) => (
    <div key={i} className="flex justify-between items-center text-sm border-b border-gray-800 pb-2 mb-2">
        <div className="flex flex-col">
            <span className={`${i===0 ? 'text-yellow-400 font-bold': 'text-gray-300'}`}>{i+1}. {p.name}</span>
            <span className="text-xs text-gray-500">{p.time}</span>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-neon-pink font-bold">{p.score} pts</span>
            <span className="text-xs text-neon-blue">Nvl {p.level || p.score}</span> 
            {/* Fallback for old data where score was level */}
        </div>
    </div>
  );

  // Use dvh for mobile viewport height to prevent browser bar issues
  return (
    <div className="h-[100dvh] bg-dark-bg text-white font-rajdhani flex flex-col items-center justify-start md:justify-center p-2 overflow-hidden touch-none select-none">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#0f0f25] to-[#000000] -z-10"></div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-neon-green text-black px-6 py-2 rounded-full font-bold shadow-[0_0_20px_#0aff00] animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
            <Check size={18} /> ¡LINK COPIADO!
        </div>
      )}

      {/* Compact Header for Mobile */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-2 md:mb-6 z-10 relative">
        <h1 className="text-xl md:text-6xl font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink drop-shadow-[0_0_10px_rgba(0,243,255,0.5)] truncate max-w-[40%]">
          TETRISCUBE
        </h1>
        {gameState !== GameState.MENU && (
             <div className="flex gap-2 md:gap-6 text-sm md:text-xl items-center">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] md:text-xs text-gray-400">PUNTOS</span>
                    <span className="text-neon-green font-bold text-lg md:text-2xl">{score}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] md:text-xs text-gray-400">PISOS</span>
                    <div className="flex items-center gap-1">
                        <Layers size={14} className={pendingCount >= level ? 'text-green-400' : 'text-gray-400'} />
                        <span className="text-white font-bold text-lg md:text-2xl">{pendingCount}/{level}</span>
                    </div>
                </div>
                {/* Time */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] md:text-xs text-gray-400">TIEMPO</span>
                    <span className="text-neon-blue font-bold text-lg md:text-2xl">{formatTime(gameTime)}</span>
                </div>
             </div>
        )}
        
        {/* Mobile Leaderboard Button - Not visible in GAME OVER as we have a specific one there */}
        {gameState !== GameState.GAMEOVER && (
            <button 
                className="md:hidden p-2 text-neon-yellow hover:bg-white/10 rounded-full transition-colors"
                onClick={() => setShowMobileLeaderboard(true)}
                aria-label="Ver Ranking"
            >
                <Trophy size={24} />
            </button>
        )}
      </header>

      <main className="relative flex flex-col md:flex-row gap-4 md:gap-8 items-center w-full max-w-5xl flex-1 justify-center pb-24 md:pb-0">
        
        {/* Desktop Leaderboard - Hidden on Mobile */}
        <div className="hidden md:block w-64 bg-dark-panel p-4 rounded-xl border border-gray-800 shadow-xl h-[500px] overflow-hidden">
          <div className="flex items-center gap-2 mb-4 text-neon-green">
            <Trophy size={20} />
            <h3 className="font-orbitron">RANKING</h3>
          </div>
          <div className="h-full overflow-y-auto pb-8 pr-2">
            {leaderboard.length === 0 ? <p className="text-gray-500 text-sm">Sin récords aún.</p> : 
              leaderboard.map(renderRankingItem)
            }
          </div>
        </div>

        {/* Mobile Leaderboard Modal */}
        {showMobileLeaderboard && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-dark-panel w-full max-w-sm rounded-2xl border border-neon-yellow p-6 shadow-[0_0_30px_rgba(255,238,0,0.2)] relative max-h-[80vh] flex flex-col">
                    <button 
                        onClick={() => setShowMobileLeaderboard(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                    
                    <div className="flex items-center gap-2 mb-6 text-neon-yellow justify-center">
                        <Trophy size={28} />
                        <h3 className="font-orbitron text-2xl font-bold">MEJORES</h3>
                    </div>

                    <div className="overflow-y-auto flex-1 pr-2">
                        {leaderboard.length === 0 ? 
                            <p className="text-gray-500 text-center py-8">Sin récords aún.</p> : 
                            leaderboard.map(renderRankingItem)
                        }
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-800 text-center text-xs text-gray-500">
                        Ordenado por Puntaje, luego Tiempo.
                    </div>
                </div>
            </div>
        )}

        <div 
            className="relative flex-shrink-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
          <TetrisBoard grid={grid} activePiece={activePiece} explodingLines={explodingLines} />
          
          {gameState === GameState.MENU && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-[60] rounded-lg">
               <div className="p-8 text-center space-y-6 w-full max-w-sm">
                 <div className="w-16 h-16 bg-gradient-to-br from-neon-blue to-neon-pink rounded-xl mx-auto rotate-45 shadow-[0_0_20px_rgba(255,0,255,0.5)] mb-4 animate-pulse-fast"></div>
                 <h2 className="text-2xl font-bold">ENTRA AL CUBO</h2>
                 <input 
                    type="text" 
                    placeholder="INGRESA TU NOMBRE" 
                    className="bg-transparent border-b-2 border-neon-blue text-center text-xl outline-none py-2 w-full uppercase tracking-widest focus:border-neon-pink transition-colors"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={10}
                 />
                 
                 {savedGame && (
                    <button 
                        onClick={resumeGame}
                        className="group relative px-8 py-4 bg-neon-green text-black font-bold font-orbitron tracking-widest clip-path-polygon hover:bg-white transition-all w-full mt-4 text-xl flex items-center justify-center gap-2"
                        style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}
                    >
                        <Play size={24} fill="black" /> CONTINUAR ({savedGame.score} pts)
                    </button>
                 )}

                 <button 
                    onClick={startGame}
                    className="group relative px-8 py-4 bg-neon-blue text-black font-bold font-orbitron tracking-widest clip-path-polygon hover:bg-white transition-all w-full mt-4 text-xl"
                    style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}
                 >
                    INICIAR {savedGame && 'NUEVO'}
                 </button>
               </div>
            </div>
          )}

          {gameState === GameState.GAMEOVER && (
            <div className="fixed inset-0 bg-red-900/90 backdrop-blur-md flex flex-col items-center justify-center z-[60] animate-in zoom-in duration-300 p-4">
               <h2 className="text-4xl md:text-6xl font-orbitron text-white mb-4 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)] text-center">MISIÓN<br/>FALLIDA</h2>
               <p className="text-xl md:text-2xl mb-2 text-gray-200">Puntaje Final: {score}</p>
               <p className="text-md md:text-lg mb-8 text-gray-400">Nivel Alcanzado: {level}</p>
               
               <div className="flex flex-col md:flex-row gap-4 items-center w-full max-w-md">
                   {/* Share Button (Primary) */}
                   <button 
                      onClick={handleShare}
                      className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-neon-blue text-black font-bold text-xl rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_#00f3ff]"
                   >
                      <Share2 size={24} /> COMPARTE
                   </button>

                   <button 
                      onClick={() => setGameState(GameState.MENU)}
                      className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-white text-red-900 font-bold text-xl rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_white]"
                   >
                      <Repeat size={24} /> REINICIAR
                   </button>
                   
                   {/* Mobile Ranking Button */}
                   <button 
                      onClick={() => setShowMobileLeaderboard(true)}
                      className="md:hidden flex items-center justify-center gap-2 px-6 py-4 bg-neon-yellow text-black font-bold text-xl rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_#ffee00]"
                      aria-label="Ver Ranking"
                   >
                      <Trophy size={24} />
                   </button>
               </div>
            </div>
          )}

          {gameState === GameState.VICTORY && (
            <div className="fixed inset-0 bg-green-900/90 backdrop-blur-md flex flex-col items-center justify-center z-[60] animate-in zoom-in duration-300 p-4">
               <h2 className="text-4xl md:text-6xl font-orbitron text-neon-yellow mb-4 drop-shadow-[0_0_15px_rgba(255,255,0,0.8)] text-center">DESAFÍO<br/>COMPLETADO</h2>
               <p className="text-xl md:text-2xl mb-6 text-white text-center">¡Eres el Maestro del Cubo!</p>
               <p className="text-4xl font-bold text-neon-green mb-8">{score} PTS</p>
               <div className="text-8xl mb-8 animate-bounce">👑</div>
               
               <div className="flex flex-col gap-4 w-full max-w-xs">
                 <button 
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-neon-blue text-black font-bold text-xl rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_#00f3ff]"
                 >
                    <Share2 size={24} /> COMPARTE TU LOGRO
                 </button>

                 <button 
                    onClick={() => setGameState(GameState.MENU)}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-neon-yellow text-black font-bold text-xl rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_#ffee00]"
                 >
                    JUGAR DE NUEVO
                 </button>
               </div>
            </div>
          )}

          {gameState === GameState.MINIGAME && (
             <CubeMinigame 
                key={`${level}-${pendingLines.length}`} // Force remount for new level
                level={level} 
                onSuccess={handleMinigameSuccess} 
                onFailure={handleMinigameFailure}
             />
          )}
        </div>

        {/* --- MOBILE ON-SCREEN CONTROLS (D-PAD STYLE) --- */}
        {(gameState === GameState.PLAYING || gameState === GameState.LINE_CLEAR || gameState === GameState.ANIMATING) && (
            <div className="fixed bottom-0 left-0 right-0 md:hidden h-40 pb-2 px-4 z-[90] pointer-events-none flex justify-between items-end">
                
                {/* Left Control Zone: D-Pad Logic (Left, Down, Right) */}
                <div className="flex gap-2 pointer-events-auto items-end mb-2">
                    <button 
                        className="w-16 h-16 bg-gray-800/80 border border-gray-500 rounded-full flex items-center justify-center active:bg-neon-blue active:text-black transition-colors"
                        onClick={() => manualMove(-1, 0)}
                    >
                        <ArrowLeft size={32} />
                    </button>
                    <button 
                        className="w-16 h-16 bg-gray-800/80 border border-gray-500 rounded-full flex items-center justify-center active:bg-neon-blue active:text-black transition-colors"
                        onClick={() => manualMove(0, 1)}
                    >
                        <ArrowDown size={32} />
                    </button>
                    <button 
                        className="w-16 h-16 bg-gray-800/80 border border-gray-500 rounded-full flex items-center justify-center active:bg-neon-blue active:text-black transition-colors"
                        onClick={() => manualMove(1, 0)}
                    >
                        <ArrowRight size={32} />
                    </button>
                </div>

                {/* Right Control Zone: Action (Rotate, Hard Drop) */}
                <div className="flex gap-4 pointer-events-auto items-end mb-2">
                    <button 
                        className="w-20 h-20 bg-neon-blue/20 border-2 border-neon-blue rounded-full active:bg-neon-blue active:text-black transition-all shadow-[0_0_15px_rgba(0,243,255,0.5)] flex items-center justify-center"
                        onClick={() => rotate()}
                        style={{ backgroundColor: 'rgba(0, 243, 255, 0.15)' }}
                    >
                        <RotateCw size={40} />
                    </button>
                    
                    <button 
                        className="w-16 h-16 bg-red-900/50 border-2 border-red-500 rounded-full active:bg-red-500 active:text-white transition-all shadow-[0_0_15px_rgba(255,0,0,0.5)] flex items-center justify-center"
                        onClick={() => hardDrop()}
                    >
                        <ArrowDownToLine size={28} />
                    </button>
                </div>
            </div>
        )}

        {/* Desktop Mission Info */}
        <div className="hidden md:block w-48 text-sm text-gray-400 space-y-4">
             <div className="bg-dark-panel p-4 rounded-xl border border-gray-800">
                <h4 className="font-bold text-white mb-2">CONTROLES</h4>
                <div className="grid grid-cols-2 gap-2">
                    <span>⬅️ Izquierda</span>
                    <span>➡️ Derecha</span>
                    <span>⬆️ Rotar</span>
                    <span>⬇️ Caída Suave</span>
                    <span>Espacio: Caída Dura</span>
                </div>
             </div>
             <div className="bg-dark-panel p-4 rounded-xl border border-gray-800">
                <h4 className="font-bold text-white mb-2">MISIÓN</h4>
                <p>Acumula líneas para invocar al Cubo.</p>
                <p className="mt-2 text-neon-blue font-bold">Objetivo Nivel {level}:</p>
                <p className="text-white">Reunir <span className="text-neon-yellow">{level}</span> líneas.</p>
             </div>
        </div>

      </main>
    </div>
  );
};

export default App;