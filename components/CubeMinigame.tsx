import React, { useState, useEffect, useRef } from 'react';
import { ButtonConfig } from '../types';
import { CUBE_BUTTONS } from '../constants';
import { soundService } from '../services/soundService';

interface CubeMinigameProps {
  level: number;
  onSuccess: () => void;
  onFailure: () => void;
}

const CubeMinigame: React.FC<CubeMinigameProps> = ({ level, onSuccess, onFailure }) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  
  // Phases: INIT -> COUNTDOWN_PRE -> DEMO -> WAITING -> COUNTDOWN_POST -> INPUT -> RESULT
  const [phase, setPhase] = useState<'INIT' | 'COUNTDOWN_PRE' | 'DEMO' | 'WAITING' | 'COUNTDOWN_POST' | 'INPUT' | 'RESULT'>('INIT');
  
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Iniciando...');
  const [timeLeft, setTimeLeft] = useState(10);
  const [countdownValue, setCountdownValue] = useState(0);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Safe sound player
  const safePlayTone = (id: number) => {
    try {
        soundService.playSimonTone(id);
    } catch (e) {
        // Silent fail
    }
  };

  // Initialize Game Logic
  useEffect(() => {
    let mounted = true;

    const startSequence = async () => {
      try {
        // 1. Generate Sequence
        const newSequence: number[] = [];
        let lastButton = -1;

        for (let i = 0; i < level; i++) {
            let nextBtn;
            do {
            nextBtn = Math.floor(Math.random() * 5);
            } while (level > 1 && nextBtn === lastButton);
            
            newSequence.push(nextBtn);
            lastButton = nextBtn;
        }
        
        if (!mounted) return;
        setSequence(newSequence);
        setPlayerSequence([]);

        // 2. Pre-Sequence Countdown (3, 2, 1)
        if (!mounted) return;
        setPhase('COUNTDOWN_PRE');
        setStatusMessage(`Nivel ${level}: ¡Observa!`);
        
        for (let i = 3; i > 0; i--) {
            if (!mounted) return;
            setCountdownValue(i);
            try { soundService.playTone(440, 'sine', 0.1); } catch(e) {}
            await wait(500); 
        }
        if (!mounted) return;
        setCountdownValue(0);

        // 3. Play Sequence (Demo)
        setPhase('DEMO');
        await wait(500);
        
        for (let i = 0; i < newSequence.length; i++) {
            if (!mounted) return;
            const btnId = newSequence[i];
            
            // Visual + Audio
            setActiveButton(btnId);
            safePlayTone(btnId);
            
            await wait(600); // Light ON duration
            setActiveButton(null);
            await wait(300); // Gap
        }

        // 4. Waiting Period
        if (!mounted) return;
        setPhase('WAITING');
        setStatusMessage('Procesando...');
        await wait(500);

        // 5. Post-Sequence Countdown
        if (!mounted) return;
        setPhase('COUNTDOWN_POST');
        setStatusMessage('¡Tu Turno en...');
        
        for (let i = 3; i > 0; i--) {
            if (!mounted) return;
            setCountdownValue(i);
            try { soundService.playTone(440, 'sine', 0.1); } catch(e) {}
            await wait(500); 
        }
        if (!mounted) return;
        setCountdownValue(0);

        // 6. Enable Input
        setPhase('INPUT');
        setStatusMessage(`¡REPITE ${level} LUCES!`);
        startTimer();

      } catch (error) {
        console.error("Minigame critical error:", error);
        // CRITICAL FIX: If the game crashes (e.g. audio context blocked), 
        // DO NOT PUNISH THE PLAYER. Auto-win instead of petrifying.
        if (mounted) {
            console.log("Triggering failsafe success");
            onSuccess();
        }
      }
    };

    startSequence();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(10 + Math.floor(level / 2)); // Give a bit more time for higher levels
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('RESULT');
    setStatusMessage('¡Tiempo Agotado!');
    try { soundService.playSimonFail(); } catch(e) {}
    setTimeout(onFailure, 1500);
  };

  const handleButtonClick = (id: number) => {
    if (phase !== 'INPUT') return;
    
    safePlayTone(id);
    
    // Visual feedback
    setActiveButton(id);
    setTimeout(() => setActiveButton(null), 200);

    const newPlayerSeq = [...playerSequence, id];
    setPlayerSequence(newPlayerSeq);

    // Validate input
    const currentIndex = newPlayerSeq.length - 1;
    
    if (sequence.length > 0 && newPlayerSeq[currentIndex] !== sequence[currentIndex]) {
      // Wrong button
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('RESULT');
      setStatusMessage('¡ERROR! PETRIFICANDO...');
      try { soundService.playSimonFail(); } catch(e) {}
      setTimeout(onFailure, 2000);
      return;
    }

    // Check if complete
    if (newPlayerSeq.length === sequence.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('RESULT');
      setStatusMessage('¡CORRECTO! DESTRUYENDO...');
      try { soundService.playSimonSuccess(); } catch(e) {}
      setTimeout(onSuccess, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300 touch-none pointer-events-auto">
      <div className="bg-dark-panel p-6 rounded-2xl border-2 border-neon-pink shadow-[0_0_30px_rgba(255,0,255,0.3)] text-center max-w-sm w-[90%] relative overflow-hidden">
        
        {/* Header */}
        <h2 className="text-2xl font-orbitron text-neon-pink mb-2 font-bold tracking-wider">DESAFÍO DEL CUBO</h2>
        <div className="flex justify-between items-center px-2 mb-2">
            <span className="text-neon-blue font-rajdhani font-bold">NIVEL {level}</span>
            <span className="text-gray-400 text-xs">SECUENCIA: {level}</span>
        </div>
        <p className="text-white font-rajdhani text-lg mb-4 h-8 animate-pulse">{statusMessage}</p>
        
        {/* Timer Bar */}
        {phase === 'INPUT' && (
          <div className="w-full h-2 bg-gray-800 rounded-full mb-6 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 4 ? 'bg-red-500' : 'bg-neon-blue'}`} 
              style={{ width: `${(timeLeft / (10 + Math.floor(level / 2))) * 100}%` }}
            ></div>
          </div>
        )}
        
        {/* Placeholder for spacing if timer is hidden */}
        {phase !== 'INPUT' && <div className="h-2 mb-6"></div>}

        {/* The Cube Face (Cross Layout) */}
        <div className="relative">
            {/* Big Countdown Overlay */}
            {countdownValue > 0 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <span className="text-9xl font-orbitron font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-pulse-fast">
                        {countdownValue}
                    </span>
                </div>
            )}

            <div className={`grid grid-cols-3 grid-rows-3 gap-3 mx-auto w-64 h-64 p-4 bg-gray-900 rounded-xl shadow-inner mb-4 transform transition-all duration-300 ${countdownValue > 0 ? 'opacity-50 blur-[2px]' : 'opacity-100'}`}>
            {CUBE_BUTTONS.map((btn) => (
                <button
                key={btn.id}
                className={`
                    ${btn.position}
                    w-full h-full rounded-lg shadow-lg border-b-4 border-black/30 transition-all duration-100
                    ${activeButton === btn.id 
                        ? `${btn.color} brightness-200 scale-95 border-0 shadow-[0_0_50px_currentColor] ring-4 ring-white z-10` 
                        : `${btn.color} opacity-80 hover:opacity-100`}
                    disabled:cursor-not-allowed
                `}
                onClick={() => handleButtonClick(btn.id)}
                disabled={phase !== 'INPUT'}
                >
                <div className="w-full h-full rounded-lg bg-white/10 flex items-center justify-center">
                    {/* Inner gloss effect */}
                    {btn.id === 2 && phase === 'DEMO' && !activeButton && <div className="w-2 h-2 rounded-full bg-white/20"></div>}
                </div>
                </button>
            ))}
            </div>
        </div>

        <p className="text-xs text-gray-400 font-rajdhani uppercase tracking-widest min-h-[1rem]">
            {phase === 'COUNTDOWN_PRE' && 'Preparando secuencia...'}
            {phase === 'DEMO' && 'Memoriza el patrón'}
            {phase === 'WAITING' && '...'}
            {phase === 'COUNTDOWN_POST' && 'Prepárate para jugar...'}
            {phase === 'INPUT' && '¡Repite el patrón ahora!'}
        </p>
      </div>
    </div>
  );
};

export default CubeMinigame;