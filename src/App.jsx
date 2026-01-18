import React, { useState, useEffect, useRef } from 'react';
import { Flame, Users, Plus, Volume2, VolumeX } from 'lucide-react';

export default function SilentBonfire() {
  const [viewers, setViewers] = useState(0);
  const [woodAdded, setWoodAdded] = useState(0);
  const [intensity, setIntensity] = useState(1);
  const [showAddWood, setShowAddWood] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const fireNoiseRef = useRef(null);

  // 接続者数のシミュレーション
  useEffect(() => {
    const baseViewers = Math.floor(Math.random() * 50) + 80;
    setViewers(baseViewers);

    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.floor(Math.random() * 7) - 3;
        return Math.max(50, Math.min(200, prev + change));
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // 焚き火の環境音生成（Web Audio API）
  useEffect(() => {
    if (!soundEnabled) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    audioContextRef.current = audioCtx;

    // ホワイトノイズ生成（パチパチ音のベース）
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // フィルターで「焚き火らしい」音に加工
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.05 * intensity;

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    whiteNoise.start();
    fireNoiseRef.current = { whiteNoise, gainNode };

    return () => {
      whiteNoise.stop();
      audioCtx.close();
    };
  }, [soundEnabled]);

  // 音量を炎の強さに連動
  useEffect(() => {
    if (fireNoiseRef.current) {
      fireNoiseRef.current.gainNode.gain.setTargetAtTime(
        0.05 * intensity,
        audioContextRef.current.currentTime,
        0.3
      );
    }
  }, [intensity]);

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const addWood = () => {
    setWoodAdded(prev => prev + 1);
    setIntensity(prev => Math.min(2, prev + 0.3));
    setShowAddWood(true);
    
    setTimeout(() => setShowAddWood(false), 2000);
    setTimeout(() => {
      setIntensity(prev => Math.max(1, prev - 0.3));
    }, 5000);
  };

  // 炎のアニメーション描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width = 400;
    const h = canvas.height = 500;
    
    const particles = [];
    
    class Particle {
      constructor() {
        this.reset();
      }
      
      reset() {
        this.x = w/2 + (Math.random() - 0.5) * 100;
        this.y = h - 50;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -Math.random() * 3 - 2;
        this.life = 1;
        this.size = Math.random() * 20 + 10;
      }
      
      update() {
        this.x += this.vx * intensity;
        this.y += this.vy * intensity;
        this.vx *= 0.99;
        this.life -= 0.01 * intensity;
        
        if (this.life <= 0) this.reset();
      }
      
      draw() {
        const alpha = this.life * 0.8;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        
        gradient.addColorStop(0, `rgba(255, 220, 100, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(255, 140, 60, ${alpha * 0.8})`);
        gradient.addColorStop(0.7, `rgba(200, 60, 20, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(50, 20, 10, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
      }
    }
    
    for (let i = 0; i < 50; i++) {
      particles.push(new Particle());
    }
    
    function animate() {
      ctx.fillStyle = 'rgba(10, 5, 5, 0.3)';
      ctx.fillRect(0, 0, w, h);
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      
      requestAnimationFrame(animate);
    }
    
    animate();
  }, [intensity]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center p-4">
      {/* ヘッダー */}
      <div className="text-center mb-8 space-y-2">
        <div className="flex items-center justify-center gap-2 text-orange-200">
          <Flame className="w-6 h-6" />
          <h1 className="text-3xl font-light tracking-wide">焚き火</h1>
        </div>
        <p className="text-gray-400 text-sm">Alone, together</p>
      </div>

      {/* 接続者数 */}
      <div className="mb-6 flex items-center gap-2 text-orange-100 bg-black/30 px-6 py-3 rounded-full backdrop-blur-sm">
        <Users className="w-5 h-5" />
        <span className="text-lg font-light">
          <span className="text-2xl font-normal">{viewers}</span> souls watching
        </span>
      </div>

      {/* 焚き火キャンバス */}
      <div className="relative mb-8">
        <canvas 
          ref={canvasRef}
          className="rounded-lg shadow-2xl"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        
        {/* 薪を追加した時の通知 */}
        {showAddWood && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-orange-500/90 text-white px-4 py-2 rounded-full text-sm animate-pulse">
            Wood added to the fire 🪵
          </div>
        )}
      </div>

      {/* コントロール */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={addWood}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-full transition-all transform hover:scale-105 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Wood
        </button>

        <button
          onClick={toggleSound}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full transition-all shadow-lg"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* 統計 */}
      <div className="text-center text-gray-500 text-sm space-y-1">
        <p>{woodAdded} pieces of wood added by you</p>
        <p className="text-xs text-gray-600">No chat. No names. Just presence.</p>
      </div>
    </div>
  );
}
