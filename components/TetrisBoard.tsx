import React, { useMemo } from 'react';
import { Grid, Tetromino, TetrominoType } from '../types';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants';

interface TetrisBoardProps {
  grid: Grid;
  activePiece: {
    data: Tetromino;
    x: number;
    y: number;
    rotation: number;
  } | null;
  explodingLines: number[]; // Indices of lines currently exploding
}

const TetrisBoard: React.FC<TetrisBoardProps> = ({ grid, activePiece, explodingLines }) => {
  
  // Create a display grid that merges static grid + active piece
  const displayGrid = useMemo(() => {
    const newGrid = grid.map(row => [...row]);

    if (activePiece) {
      const { data, x, y } = activePiece;
      const shape = data.shape;
      
      const pieceMatrix = shape; 

      for (let r = 0; r < pieceMatrix.length; r++) {
        for (let c = 0; c < pieceMatrix[r].length; c++) {
          if (pieceMatrix[r][c]) {
             const finalY = y + r;
             const finalX = x + c;
             if (finalY >= 0 && finalY < BOARD_HEIGHT && finalX >= 0 && finalX < BOARD_WIDTH) {
               newGrid[finalY][finalX] = { type: data.type, color: data.color };
             }
          }
        }
      }
    }
    return newGrid;
  }, [grid, activePiece]);

  return (
    <div className="relative p-1 bg-gray-900 border-4 border-neon-blue rounded-lg shadow-[0_0_20px_rgba(0,243,255,0.2)]">
      <div 
        className="grid grid-cols-10 gap-[1px] bg-gray-800"
        style={{ width: '250px', height: '500px' }} // Fixed aspect ratio
      >
        {displayGrid.map((row, y) => {
            const isExploding = explodingLines.includes(y);
            return row.map((cell, x) => {
                let cellClass = 'bg-dark-bg/50';
                let borderClass = '';
                let style = {};
                
                if (cell) {
                    if (cell.type === TetrominoType.STONE) {
                        // ROCK TEXTURE
                        cellClass = 'bg-gray-700'; 
                        borderClass = 'border border-gray-800';
                        // Add noise texture for rock look
                        style = {
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
                            filter: 'contrast(120%) brightness(80%)'
                        };
                    } else if (cell.type === TetrominoType.PENDING) {
                        // PENDING LINE TEXTURE (Gold/Energy) - NOW FASTER PULSE
                        cellClass = 'bg-yellow-400 animate-pulse-fast';
                        borderClass = 'border border-yellow-200';
                        style = {
                            boxShadow: 'inset 0 0 10px rgba(255, 255, 0, 0.8), 0 0 10px rgba(255, 255, 0, 0.5)'
                        };
                    } else {
                        cellClass = `bg-${cell.color} shadow-inner`;
                        borderClass = 'border border-white/20';
                    }
                }
                
                // Explosion effect (Overrides previous classes)
                if (isExploding) {
                    cellClass = 'animate-explode z-50 relative';
                    borderClass = 'border-none';
                    style = {}; // Clear texture styles for explosion
                }

                return (
                    <div
                    key={`${y}-${x}`}
                    className={`
                        w-full h-full
                        ${cellClass}
                        ${borderClass}
                    `}
                    style={style}
                    />
                );
            });
        })}
      </div>
      
      {/* Grid Overlay Lines */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
    </div>
  );
};

export default TetrisBoard;