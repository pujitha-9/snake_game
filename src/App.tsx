import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const GRID_SIZE = 20;
type Point = { x: number; y: number };

const generateFood = (snake: Point[]): Point => {
  let newFood: Point;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (snake.length >= GRID_SIZE * GRID_SIZE) return newFood;
    if (!snake.some((s) => s.x === newFood.x && s.y === newFood.y)) {
      return newFood;
    }
  }
};

export default function App() {
  const [gameState, setGameState] = useState({
    snake: [
      { x: 10, y: 14 },
      { x: 10, y: 15 },
      { x: 10, y: 16 },
    ],
    food: { x: 8, y: 8 },
    score: 0,
    gameOver: false,
    hasStarted: false,
  });

  const directionRef = useRef({ x: 0, y: -1 });
  const nextDirectionRef = useRef({ x: 0, y: -1 });
  
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgMusicRef.current = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3");
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.2;
    return () => {
      bgMusicRef.current?.pause();
    }
  }, []);

  useEffect(() => {
    if (bgMusicRef.current) {
        bgMusicRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (bgMusicRef.current && bgMusicRef.current.paused) {
      bgMusicRef.current.play().catch(console.error);
    }
  };

  const playSound = (type: 'eat' | 'die' | 'start') => {
    if (isMuted) return;
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'eat') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'start') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch(e) {
      console.error("Audio error", e);
    }
  };

  const resetGame = () => {
    initAudio();
    playSound('start');
    directionRef.current = { x: 0, y: -1 };
    nextDirectionRef.current = { x: 0, y: -1 };
    const initialSnake = [
      { x: 10, y: 14 },
      { x: 10, y: 15 },
      { x: 10, y: 16 },
    ];
    setGameState({
      snake: initialSnake,
      food: generateFood(initialSnake),
      score: 0,
      gameOver: false,
      hasStarted: true,
    });
    setIsPaused(false);
  };

  useEffect(() => {
    if (gameState.gameOver || !gameState.hasStarted || isPaused) return;

    const interval = setInterval(() => {
      setGameState((prev) => {
        if (prev.gameOver) return prev;

        const head = prev.snake[0];
        directionRef.current = nextDirectionRef.current;
        const dir = directionRef.current;
        const newHead = { x: head.x + dir.x, y: head.y + dir.y };

        // Wall collisions
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          playSound('die');
          return { ...prev, gameOver: true };
        }

        // Self collision
        if (prev.snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
          playSound('die');
          return { ...prev, gameOver: true };
        }

        const newSnake = [newHead, ...prev.snake];
        let newFood = prev.food;
        let newScore = prev.score;

        if (newHead.x === prev.food.x && newHead.y === prev.food.y) {
          newScore += 10;
          newFood = generateFood(newSnake);
          playSound('eat');
        } else {
          newSnake.pop(); // Remove tail if no food eaten
        }

        return {
          ...prev,
          snake: newSnake,
          food: newFood,
          score: newScore,
        };
      });
    }, 120);

    return () => clearInterval(interval);
  }, [gameState.gameOver, gameState.hasStarted, isPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(e.key)
      ) {
        e.preventDefault();
      }

      const currentDir = directionRef.current;

      if (e.key === "Enter") {
        if (!gameState.hasStarted || gameState.gameOver) {
          resetGame();
        }
      }
      
      if (e.key === " " && gameState.hasStarted && !gameState.gameOver) {
        setIsPaused(p => !p);
      }

      if (!gameState.hasStarted || gameState.gameOver || isPaused) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.gameOver, gameState.hasStarted, isPaused]);

  return (
    <div className="relative min-h-[100dvh] bg-slate-950 text-slate-200 font-sans flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="absolute top-0 w-full p-6 sm:p-10 flex justify-between items-start z-20 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-light tracking-[0.4em] text-white uppercase drop-shadow-md" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            LUMINA<span className="text-teal-400 font-medium">SNAKE</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] mt-2 uppercase">Ethereal Edition</p>
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-medium tracking-[0.2em] uppercase">Score</span>
            <span className="text-3xl font-light tracking-tighter text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{gameState.score}</span>
          </div>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md shadow-lg cursor-pointer"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {/* Game Container */}
      <div className="relative z-10 p-4 sm:p-6 lg:p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        <div
          className="grid bg-[#020613] w-[300px] h-[300px] sm:w-[480px] sm:h-[480px] rounded-2xl overflow-hidden shadow-inner relative"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
        >
          {/* Subtle grid lines background overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: `calc(100% / ${GRID_SIZE}) calc(100% / ${GRID_SIZE})`
          }}></div>

          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
            const x = i % GRID_SIZE;
            const y = Math.floor(i / GRID_SIZE);
            const isSnakeBody = gameState.snake.slice(1).some((segment) => segment.x === x && segment.y === y);
            const isSnakeHead = gameState.snake.length > 0 && gameState.snake[0].x === x && gameState.snake[0].y === y;
            const isFood = gameState.food.x === x && gameState.food.y === y;
            
            return (
              <div
                key={i}
                className="w-full h-full relative p-[1px] sm:p-[2px]"
              >
                {isSnakeHead && (
                  <div className="w-full h-full bg-teal-300 rounded shadow-[0_0_12px_rgba(94,234,212,0.8)] z-20 relative" />
                )}
                {isSnakeBody && (
                  <div className="w-full h-full bg-teal-600/70 rounded shadow-[0_0_8px_rgba(13,148,136,0.5)] z-10 relative" />
                )}
                {isFood && (
                   <div className="w-full h-full bg-indigo-400 rounded-full shadow-[0_0_15px_rgba(129,140,248,0.9)] animate-[pulse_1s_ease-in-out_infinite] z-10 relative" />
                )}
              </div>
            );
          })}
        </div>

        {/* Overlay States */}
        {(!gameState.hasStarted || gameState.gameOver || isPaused) && (
          <div className="absolute inset-4 sm:inset-6 lg:inset-8 flex flex-col items-center justify-center bg-slate-950/70 rounded-2xl backdrop-blur-md z-30 border border-white/5">
            {gameState.gameOver && (
              <div className="text-white text-3xl font-light mb-6 text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                You dead
              </div>
            )}
            {isPaused && !gameState.gameOver && gameState.hasStarted && (
              <div className="text-white text-3xl font-light mb-6 text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Paused
              </div>
            )}
            <div className="text-teal-400 text-xs sm:text-sm text-center font-medium tracking-[0.2em] shadow-black">
              {gameState.gameOver ? 'PLEASE PRESS ENTER TO RESTART GAME' : isPaused ? 'PRESS SPACE TO MERGE' : 'PRESS ENTER TO AWAKEN'}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 text-center w-full z-20">
        <p className="text-[10px] text-slate-500 font-medium tracking-[0.1em] uppercase">
          W, A, S, D / Arrows to drift. Space to hold.
        </p>
      </div>

    </div>
  );
}
