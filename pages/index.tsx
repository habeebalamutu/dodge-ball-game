import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [lane, setLane] = useState(1);
  const [obstacles, setObstacles] = useState<{ lane: number; y: number }[]>([]);
  const [powerUps, setPowerUps] = useState<{ lane: number; y: number; type: string }[]>([]);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(10);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [theme, setTheme] = useState('light');
  const [highScore, setHighScore] = useState(0);
  const [ballColor, setBallColor] = useState('#0070f3');
  const [showControls, setShowControls] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const shieldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);

  function toggleControls() {
    setShowControls((prev) => !prev);
    setPaused(true);
  }

  function resetGame() {
    setObstacles([]);
    setPowerUps([]);
    setLane(1);
    setScore(0);
    setSpeed(10);
    setLives(3);
    setShieldActive(false);
    if (shieldTimeoutRef.current) clearTimeout(shieldTimeoutRef.current);
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHighScore = localStorage.getItem('high_score');
      if (savedHighScore) {
        setHighScore(parseInt(savedHighScore, 10));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('high_score', highScore.toString());
    }
  }, [highScore]);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setObstacles((prev) =>
        prev
          .map((obstacle) => ({ ...obstacle, y: obstacle.y + speed }))
          .filter((obstacle) => obstacle.y < 600)
      );

      setPowerUps((prev) =>
        prev
          .map((powerUp) => ({ ...powerUp, y: powerUp.y + speed }))
          .filter((powerUp) => powerUp.y < 600)
      );

      setObstacles((prev) => {
        const lastObstacleY = prev.length > 0 ? Math.max(...prev.map((o) => o.y)) : 600;
        const minGap = Math.random() < 0.5 ? 200 : 300;

        if (lastObstacleY > minGap && Math.random() < 0.1) {
          const newObstacles = [];
          const emptyLane = Math.floor(Math.random() * 3);
          for (let i = 0; i < 3; i++) {
            if (i !== emptyLane) {
              newObstacles.push({ lane: i, y: 0 });
            }
          }
          return [...prev, ...newObstacles];
        }
        return prev;
      });

      if (Math.random() < 0.01) {
        const powerUpType = Math.random() < 0.8 ? 'shield' : 'life';
        const newPowerUp = { lane: Math.floor(Math.random() * 3), y: 0, type: powerUpType };
        setPowerUps((prev) => [...prev, newPowerUp]);
      }

      setScore((prev) => prev + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [paused, speed, score]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && lane > 0) setLane((prev) => prev - 1);
      if (e.key === 'ArrowRight' && lane < 2) setLane((prev) => prev + 1);
      if (e.key === ' ') setPaused((prev) => !prev);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touchX = e.touches[0].clientX;
      const gameArea = gameAreaRef.current;
      if (!gameArea) return;

      const gameAreaRect = gameArea.getBoundingClientRect();
      const relativeX = touchX - gameAreaRect.left;

      if (relativeX < gameAreaRect.width / 2 && lane > 0) setLane((prev) => prev - 1);
      if (relativeX >= gameAreaRect.width / 2 && lane < 2) setLane((prev) => prev + 1);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchX = e.touches[0].clientX;
      const gameArea = gameAreaRef.current;
      if (!gameArea) return;

      const gameAreaRect = gameArea.getBoundingClientRect();
      const relativeX = touchX - gameAreaRect.left;

      if (relativeX < gameAreaRect.width / 2 && lane > 0) setLane((prev) => prev - 1);
      if (relativeX >= gameAreaRect.width / 2 && lane < 2) setLane((prev) => prev + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [lane]);

  useEffect(() => {
    const ball = ballRef.current;
    if (!ball) return;

    const ballRect = ball.getBoundingClientRect();
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const gameAreaRect = gameArea.getBoundingClientRect();

    setObstacles((prev) =>
      prev.filter((obstacle) => {
        const obstacleX = gameAreaRect.left + obstacle.lane * (gameAreaRect.width / 3);
        const obstacleY = gameAreaRect.top + obstacle.y;

        if (
          ballRect.left < obstacleX + 50 &&
          ballRect.right > obstacleX &&
          ballRect.top < obstacleY + 50 &&
          ballRect.bottom > obstacleY
        ) {
          if (shieldActive) {
            return true;
          }

          setLives((prevLives) => {
            if (prevLives > 1) {
              return prevLives - 1;
            } else {
              alert(`Game Over! Your score: ${score}`);
              setHighScore((prev) => Math.max(prev, score));
              resetGame();
              return 3;
            }
          });
          return false;
        }
        return true;
      })
    );

    setPowerUps((prev) =>
      prev.filter((powerUp) => {
        const powerUpX = gameAreaRect.left + powerUp.lane * (gameAreaRect.width / 3);
        const powerUpY = gameAreaRect.top + powerUp.y;

        if (
          ballRect.left < powerUpX + 30 &&
          ballRect.right > powerUpX &&
          ballRect.top < powerUpY + 30 &&
          ballRect.bottom > powerUpY
        ) {
          if (powerUp.type === 'shield') {
            setShieldActive(true);
            if (shieldTimeoutRef.current) clearTimeout(shieldTimeoutRef.current);
            shieldTimeoutRef.current = setTimeout(() => {
              setShieldActive(false);
            }, 7000);
            ball.style.boxShadow = '0 0 15px 10px green';
          } else if (powerUp.type === 'life') {
            setLives((prev) => Math.min(prev + 1, 5));
          }
          return false;
        }
        return true;
      })
    );
  }, [obstacles, powerUps, lives, score, shieldActive]);

  useEffect(() => {
    if (!shieldActive && ballRef.current) {
      ballRef.current.style.boxShadow = 'none';
    }
  }, [shieldActive]);

  useEffect(() => {
    return () => {
      if (shieldTimeoutRef.current) clearTimeout(shieldTimeoutRef.current);
    };
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <div
      style={{
        position: 'relative',
        width: '300px',
        height: '600px',
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      <div
        ref={gameAreaRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: theme === 'light' ? '#f0f0f0' : '#333',
          color: theme === 'light' ? '#000' : '#fff',
          border: '2px solid #000',
          filter: showControls ? 'blur(5px)' : 'none',
          transition: 'filter 0.3s',
        }}
      >
        <Head>
          <title>Dodge Ball Game</title>
          <style>{`
            .ball {
              position: absolute;
              bottom: 20px;
              width: 50px;
              height: 50px;
              background-color: ${ballColor};
              border-radius: 50%;
              transition: left 0.2s;
            }
            .obstacle {
              position: absolute;
              width: 50px;
              height: 50px;
              background-color: red;
            }
            .power-up {
              position: absolute;
              width: 30px;
              height: 30px;
              background-color: green;
              border-radius: 50%;
            }
          `}</style>
        </Head>

        <div
          ref={ballRef}
          className="ball"
          style={{
            left: `${lane * 100 + 25}px`,
          }}
        ></div>

        {obstacles.map((obstacle, index) => (
          <div
            key={index}
            className="obstacle"
            style={{
              left: `${obstacle.lane * 100 + 25}px`,
              top: `${obstacle.y}px`,
            }}
          ></div>
        ))}

        {powerUps.map((powerUp, index) => (
          <div
            key={index}
            className="power-up"
            style={{
              left: `${powerUp.lane * 100 + 35}px`,
              top: `${powerUp.y}px`,
              backgroundColor: powerUp.type === 'shield' ? 'green' : 'red',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              position: 'absolute',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {powerUp.type === 'life' && (
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  width: '10px',
                  height: '10px',
                }}
              ></div>
            )}
          </div>
        ))}

        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
          <p>Score: {score}</p>
          <p>Lives: {lives}</p>
        </div>

        <button
          onClick={() => setPaused((prev) => !prev)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: theme === 'light' ? '#0070f3' : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '0.5rem',
            cursor: 'pointer',
          }}
        >
          {paused ? '▶️' : '⏸️'}
        </button>

        <button
          className="control-button"
          onClick={toggleControls}
          style={{
            position: 'absolute',
            top: '50px',
            right: '10px',
            background: 'black',
            color: 'white',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          ⚙️
        </button>
      </div>

      {showControls && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: theme === 'light' ? '#fff' : '#444',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
          }}
        >
          <p>High Score: {highScore}</p>
          <button onClick={toggleTheme}>
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Theme
          </button>
          <label>
            Ball Color:
            <input
              type="color"
              value={ballColor}
              onChange={(e) => setBallColor(e.target.value)}
              style={{ marginLeft: '0.5rem' }}
            />
          </label>
          <button
            onClick={toggleControls}
            style={{
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
            }}
          >
            Close Controls
          </button>
        </div>
      )}
    </div>
  );
}
