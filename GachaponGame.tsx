import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

interface GachaPrize {
    id: number;
    name: string;
    image_url: string;
    rarity: 'common' | 'rare' | 'legendary';
    is_active: boolean;
}

type GameState = 'idle' | 'coin_inserted' | 'cranking' | 'dropping' | 'revealing';

const RARITY_WEIGHTS: Record<string, number> = { common: 60, rare: 30, legendary: 10 };
const RARITY_COLORS: Record<string, string> = {
    common: '#60a5fa',
    rare: '#a78bfa',
    legendary: '#fbbf24',
};
const RARITY_GLOW: Record<string, string> = {
    common: '0 0 20px rgba(96,165,250,0.5)',
    rare: '0 0 30px rgba(167,139,250,0.7)',
    legendary: '0 0 40px rgba(251,191,36,0.9), 0 0 80px rgba(251,191,36,0.4)',
};
const RARITY_LABELS: Record<string, string> = {
    common: 'Common',
    rare: 'Rare!',
    legendary: 'LEGENDARY!!',
};

// ─── Web Audio synthesized SFX ───
class SoundEngine {
    private ctx: AudioContext | null = null;

    private getCtx(): AudioContext {
        if (!this.ctx) this.ctx = new AudioContext();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    coinInsert() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        [800, 1200, 1600].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.3, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.2);
        });
    }

    crankTurn() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        for (let i = 0; i < 6; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150 + Math.random() * 80, now + i * 0.12);
            gain.gain.setValueAtTime(0.15, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.1);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.12);
        }
        const noise = ctx.createOscillator();
        const nGain = ctx.createGain();
        noise.type = 'triangle';
        noise.frequency.setValueAtTime(80, now);
        noise.frequency.linearRampToValueAtTime(40, now + 0.7);
        nGain.gain.setValueAtTime(0.1, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        noise.connect(nGain).connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.8);
    }

    ballDrop() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        const bounces = [400, 300, 350, 250, 200];
        bounces.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + i * 0.15 + 0.12);
            gain.gain.setValueAtTime(0.25 - i * 0.04, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.12);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.15);
        });
    }

    prizeReveal(rarity: string) {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        const base = rarity === 'legendary' ? 523 : rarity === 'rare' ? 440 : 392;
        const notes = [base, base * 1.25, base * 1.5, base * 2];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = rarity === 'legendary' ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            gain.gain.setValueAtTime(0.3, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.5);
        });
        if (rarity === 'legendary') {
            const shimmer = ctx.createOscillator();
            const sGain = ctx.createGain();
            shimmer.type = 'sine';
            shimmer.frequency.setValueAtTime(base * 3, now + 0.5);
            shimmer.frequency.exponentialRampToValueAtTime(base * 4, now + 1.2);
            sGain.gain.setValueAtTime(0.15, now + 0.5);
            sGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            shimmer.connect(sGain).connect(ctx.destination);
            shimmer.start(now + 0.5);
            shimmer.stop(now + 1.3);
        }
    }
}

// ─── Confetti system ───
interface Particle {
    x: number; y: number; vx: number; vy: number;
    size: number; color: string; rotation: number; rotSpeed: number; life: number;
}

function createConfetti(count: number, color: string): Particle[] {
    const colors = color === '#fbbf24'
        ? ['#fbbf24', '#f59e0b', '#fde68a', '#fffbeb', '#d97706']
        : color === '#a78bfa'
            ? ['#a78bfa', '#8b5cf6', '#c4b5fd', '#ddd6fe', '#7c3aed']
            : ['#60a5fa', '#3b82f6', '#93c5fd', '#bfdbfe', '#2563eb'];
    return Array.from({ length: count }, () => ({
        x: 50 + (Math.random() - 0.5) * 20,
        y: 40 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 6,
        vy: -(Math.random() * 4 + 2),
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 15,
        life: 1,
    }));
}

const ConfettiCanvas: React.FC<{ particles: Particle[] }> = ({ particles }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animRef = useRef<number>(0);

    useEffect(() => {
        if (particles.length === 0) return;
        particlesRef.current = [...particles];
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;

        const animate = () => {
            ctx.clearRect(0, 0, w, h);
            let alive = false;
            particlesRef.current.forEach(p => {
                if (p.life <= 0) return;
                alive = true;
                p.x += p.vx * 0.3;
                p.y += p.vy * 0.3;
                p.vy += 0.12;
                p.rotation += p.rotSpeed;
                p.life -= 0.008;
                const px = (p.x / 100) * w;
                const py = (p.y / 100) * h;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            });
            if (alive) animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [particles]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 50 }}
        />
    );
};

// ─── Bouncing balls inside dome ───
const BouncingBalls: React.FC<{ prizes: GachaPrize[]; shaking: boolean }> = ({ prizes, shaking }) => {
    const balls = prizes.slice(0, 12);
    const positions = useRef(
        balls.map(() => ({
            x: 15 + Math.random() * 70,
            y: 15 + Math.random() * 60,
        }))
    );

    if (positions.current.length < balls.length) {
        while (positions.current.length < balls.length) {
            positions.current.push({ x: 15 + Math.random() * 70, y: 15 + Math.random() * 60 });
        }
    }

    return (
        <>
            {balls.map((prize, i) => {
                const pos = positions.current[i] || { x: 50, y: 50 };
                const delay = i * 0.3;
                return (
                    <div
                        key={prize.id}
                        className="absolute rounded-full overflow-hidden border-2 shadow-lg"
                        style={{
                            width: '28px',
                            height: '28px',
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            borderColor: RARITY_COLORS[prize.rarity] || '#60a5fa',
                            animation: shaking
                                ? `ballShuffle 0.3s ease-in-out infinite ${delay * 0.1}s`
                                : `ballFloat 3s ease-in-out infinite ${delay}s`,
                            transition: 'all 0.3s',
                        }}
                    >
                        <img
                            src={prize.image_url}
                            alt={prize.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                );
            })}
        </>
    );
};

// ─── Main GachaponGame component ───
const GachaponGame: React.FC = () => {
    const [prizes, setPrizes] = useState<GachaPrize[]>([]);
    const [gameState, setGameState] = useState<GameState>('idle');
    const [wonPrize, setWonPrize] = useState<GachaPrize | null>(null);
    const [confetti, setConfetti] = useState<Particle[]>([]);
    const [loading, setLoading] = useState(true);
    const soundRef = useRef(new SoundEngine());

    const fetchPrizes = useCallback(async () => {
        const { data } = await supabase
            .from('gacha_prizes')
            .select('*')
            .eq('is_active', true);
        if (data) setPrizes(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPrizes();
        const channel = supabase
            .channel('gacha-prizes-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gacha_prizes' }, () => {
                fetchPrizes();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchPrizes]);

    const pickPrize = useCallback((): GachaPrize | null => {
        if (prizes.length === 0) return null;
        const grouped: Record<string, GachaPrize[]> = { common: [], rare: [], legendary: [] };
        prizes.forEach(p => {
            if (grouped[p.rarity]) grouped[p.rarity].push(p);
        });
        const available = Object.keys(grouped).filter(r => grouped[r].length > 0);
        if (available.length === 0) return prizes[Math.floor(Math.random() * prizes.length)];

        let totalWeight = 0;
        available.forEach(r => { totalWeight += RARITY_WEIGHTS[r]; });
        let roll = Math.random() * totalWeight;
        let chosenRarity = available[0];
        for (const r of available) {
            roll -= RARITY_WEIGHTS[r];
            if (roll <= 0) { chosenRarity = r; break; }
        }
        const pool = grouped[chosenRarity];
        return pool[Math.floor(Math.random() * pool.length)];
    }, [prizes]);

    const handlePlay = useCallback(() => {
        if (gameState !== 'idle' || prizes.length === 0) return;

        soundRef.current.coinInsert();
        setGameState('coin_inserted');

        setTimeout(() => {
            soundRef.current.crankTurn();
            setGameState('cranking');

            setTimeout(() => {
                soundRef.current.ballDrop();
                setGameState('dropping');

                setTimeout(() => {
                    const prize = pickPrize();
                    setWonPrize(prize);
                    setGameState('revealing');
                    if (prize) {
                        soundRef.current.prizeReveal(prize.rarity);
                        const count = prize.rarity === 'legendary' ? 120 : prize.rarity === 'rare' ? 80 : 50;
                        setConfetti(createConfetti(count, RARITY_COLORS[prize.rarity]));
                    }
                }, 1200);
            }, 800);
        }, 600);
    }, [gameState, prizes, pickPrize]);

    const handleReset = useCallback(() => {
        setGameState('idle');
        setWonPrize(null);
        setConfetti([]);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-purple-300 font-medium" style={{ fontFamily: "'Fredoka One', cursive" }}>
                        Memuat Gachapon...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
            <style>{`
                @keyframes ballFloat {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    25% { transform: translateY(-8px) rotate(5deg); }
                    50% { transform: translateY(-3px) rotate(-3deg); }
                    75% { transform: translateY(-10px) rotate(3deg); }
                }
                @keyframes ballShuffle {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(8px, -5px) rotate(10deg); }
                    50% { transform: translate(-6px, 3px) rotate(-8deg); }
                    75% { transform: translate(4px, 6px) rotate(5deg); }
                    100% { transform: translate(0, 0) rotate(0deg); }
                }
                @keyframes coinSlide {
                    0% { transform: translateY(-40px) scale(1); opacity: 0; }
                    30% { transform: translateY(0) scale(1); opacity: 1; }
                    60% { transform: translateY(0) scale(0.8); opacity: 1; }
                    100% { transform: translateY(20px) scale(0.3); opacity: 0; }
                }
                @keyframes handleTurn {
                    0% { transform: rotate(0deg); }
                    50% { transform: rotate(90deg); }
                    100% { transform: rotate(180deg); }
                }
                @keyframes machineShuffle {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-4px) rotate(-0.5deg); }
                    40% { transform: translateX(4px) rotate(0.5deg); }
                    60% { transform: translateX(-3px) rotate(-0.3deg); }
                    80% { transform: translateX(3px) rotate(0.3deg); }
                }
                @keyframes ballExit {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    40% { transform: translateY(30px) scale(0.8); opacity: 1; }
                    100% { transform: translateY(80px) scale(0.5); opacity: 0; }
                }
                @keyframes prizePopIn {
                    0% { transform: scale(0) rotate(-20deg); opacity: 0; }
                    60% { transform: scale(1.15) rotate(5deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes glowPulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(251,191,36,0.3); }
                    50% { box-shadow: 0 0 40px rgba(251,191,36,0.7), 0 0 80px rgba(251,191,36,0.3); }
                }
                @keyframes starFloat {
                    0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
                    100% { transform: translateY(-60px) rotate(180deg) scale(0); opacity: 0; }
                }
                @keyframes domeGlow {
                    0%, 100% { box-shadow: inset 0 0 30px rgba(168,85,247,0.1), 0 0 15px rgba(168,85,247,0.1); }
                    50% { box-shadow: inset 0 0 50px rgba(168,85,247,0.2), 0 0 25px rgba(168,85,247,0.2); }
                }
            `}</style>

            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full opacity-10"
                        style={{
                            width: `${Math.random() * 6 + 2}px`,
                            height: `${Math.random() * 6 + 2}px`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            background: ['#a78bfa', '#60a5fa', '#fbbf24', '#f472b6'][Math.floor(Math.random() * 4)],
                            animation: `starFloat ${3 + Math.random() * 4}s linear infinite ${Math.random() * 3}s`,
                        }}
                    />
                ))}
            </div>

            {/* Title */}
            <h1
                className="text-4xl sm:text-5xl text-center mb-2 text-transparent bg-clip-text"
                style={{
                    fontFamily: "'Fredoka One', cursive",
                    backgroundImage: 'linear-gradient(135deg, #c084fc, #f472b6, #fbbf24)',
                    WebkitBackgroundClip: 'text',
                    filter: 'drop-shadow(0 2px 8px rgba(192,132,252,0.3))',
                }}
            >
                GACHAPON
            </h1>
            <p className="text-purple-300/70 text-sm mb-6" style={{ fontFamily: "'Fredoka One', cursive" }}>
                Doorprize Spesial
            </p>

            {/* Machine container */}
            <div
                className="relative w-72 sm:w-80"
                style={{
                    animation: gameState === 'cranking' ? 'machineShuffle 0.15s ease-in-out infinite' : 'none',
                }}
            >
                {/* Glass Dome */}
                <div
                    className="relative mx-auto rounded-t-full overflow-hidden"
                    style={{
                        width: '240px',
                        height: '200px',
                        background: 'linear-gradient(180deg, rgba(168,85,247,0.08) 0%, rgba(99,102,241,0.12) 100%)',
                        border: '3px solid rgba(168,85,247,0.3)',
                        borderBottom: 'none',
                        animation: 'domeGlow 3s ease-in-out infinite',
                    }}
                >
                    {/* Glass reflection */}
                    <div
                        className="absolute top-4 left-6 w-16 h-24 rounded-full opacity-10"
                        style={{
                            background: 'linear-gradient(135deg, white 0%, transparent 100%)',
                        }}
                    />
                    {/* Bouncing balls inside */}
                    {prizes.length > 0 && (
                        <BouncingBalls
                            prizes={prizes}
                            shaking={gameState === 'cranking'}
                        />
                    )}
                    {prizes.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-purple-400/50 text-xs text-center px-4">
                                Belum ada hadiah.<br />Upload di CMS Admin.
                            </p>
                        </div>
                    )}
                </div>

                {/* Machine Body */}
                <div
                    className="relative mx-auto"
                    style={{
                        width: '260px',
                        background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 40%, #7f1d1d 100%)',
                        borderRadius: '0 0 20px 20px',
                        padding: '12px 0 20px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                    }}
                >
                    {/* Metal trim */}
                    <div
                        className="mx-auto mb-3"
                        style={{
                            width: '260px',
                            height: '8px',
                            background: 'linear-gradient(180deg, #d4d4d8 0%, #a1a1aa 50%, #71717a 100%)',
                        }}
                    />

                    {/* Center panel with coin slot + handle */}
                    <div className="flex items-center justify-center gap-6 py-3">
                        {/* Coin slot */}
                        <div className="relative">
                            <div
                                className="w-10 h-14 rounded-lg flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(180deg, #52525b, #3f3f46)',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                                }}
                            >
                                <div
                                    className="w-6 h-1.5 rounded-full"
                                    style={{ background: '#18181b', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }}
                                />
                            </div>
                            {/* Coin animation */}
                            {gameState === 'coin_inserted' && (
                                <div
                                    className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full"
                                    style={{
                                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                        boxShadow: '0 0 10px rgba(251,191,36,0.5)',
                                        animation: 'coinSlide 0.6s ease-in forwards',
                                    }}
                                >
                                    <span className="flex items-center justify-center h-full text-[8px] font-bold text-yellow-900">$</span>
                                </div>
                            )}
                        </div>

                        {/* Handle */}
                        <div className="relative flex flex-col items-center">
                            <div
                                className="w-8 h-8 rounded-full border-4"
                                style={{
                                    borderColor: '#d4d4d8',
                                    background: 'linear-gradient(135deg, #fafafa, #a1a1aa)',
                                    animation: gameState === 'cranking' ? 'handleTurn 0.8s ease-in-out' : 'none',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                }}
                            />
                            <div
                                className="w-3 h-10 rounded-b-lg"
                                style={{
                                    background: 'linear-gradient(180deg, #a1a1aa, #71717a)',
                                    boxShadow: '1px 0 3px rgba(0,0,0,0.2)',
                                }}
                            />
                        </div>
                    </div>

                    {/* Output chute */}
                    <div className="flex justify-center mt-2">
                        <div
                            className="relative w-20 h-12 rounded-b-2xl"
                            style={{
                                background: 'linear-gradient(180deg, #18181b, #0a0a0a)',
                                boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.8)',
                                border: '2px solid #3f3f46',
                                borderTop: 'none',
                            }}
                        >
                            {gameState === 'dropping' && (
                                <div
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full"
                                    style={{
                                        background: `radial-gradient(circle at 30% 30%, ${RARITY_COLORS[wonPrize?.rarity || 'common']}88, ${RARITY_COLORS[wonPrize?.rarity || 'common']})`,
                                        animation: 'ballExit 1.2s ease-in forwards',
                                        boxShadow: `0 0 12px ${RARITY_COLORS[wonPrize?.rarity || 'common']}66`,
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Machine label */}
                    <div className="text-center mt-3">
                        <span
                            className="text-xs tracking-widest uppercase"
                            style={{
                                fontFamily: "'Fredoka One', cursive",
                                color: '#fbbf2488',
                            }}
                        >
                            Doorprize
                        </span>
                    </div>
                </div>

                {/* Machine base/feet */}
                <div className="flex justify-center gap-24 -mt-1">
                    <div className="w-8 h-4 rounded-b-lg" style={{ background: 'linear-gradient(180deg, #52525b, #3f3f46)' }} />
                    <div className="w-8 h-4 rounded-b-lg" style={{ background: 'linear-gradient(180deg, #52525b, #3f3f46)' }} />
                </div>
            </div>

            {/* Play Button */}
            {gameState === 'idle' && (
                <button
                    onClick={handlePlay}
                    disabled={prizes.length === 0}
                    className="mt-8 px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                        fontFamily: "'Fredoka One', cursive",
                        background: prizes.length > 0
                            ? 'linear-gradient(135deg, #a855f7, #ec4899)'
                            : '#4b5563',
                        color: 'white',
                        boxShadow: prizes.length > 0
                            ? '0 4px 20px rgba(168,85,247,0.4), 0 0 40px rgba(168,85,247,0.1)'
                            : 'none',
                    }}
                >
                    {prizes.length > 0 ? 'PUTAR GACHA!' : 'Tidak Ada Hadiah'}
                </button>
            )}

            {/* Status text during game */}
            {gameState === 'coin_inserted' && (
                <p className="mt-8 text-yellow-300 text-lg animate-pulse" style={{ fontFamily: "'Fredoka One', cursive" }}>
                    Memasukkan koin...
                </p>
            )}
            {gameState === 'cranking' && (
                <p className="mt-8 text-orange-300 text-lg animate-pulse" style={{ fontFamily: "'Fredoka One', cursive" }}>
                    Memutar handle...
                </p>
            )}
            {gameState === 'dropping' && (
                <p className="mt-8 text-pink-300 text-lg animate-pulse" style={{ fontFamily: "'Fredoka One', cursive" }}>
                    Bola keluar...
                </p>
            )}

            {/* Prize reveal overlay */}
            {gameState === 'revealing' && wonPrize && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <ConfettiCanvas particles={confetti} />
                    <div
                        className="relative z-50 flex flex-col items-center p-8 rounded-3xl max-w-sm w-full mx-4"
                        style={{
                            background: 'linear-gradient(180deg, rgba(30,20,60,0.95), rgba(15,10,40,0.98))',
                            border: `2px solid ${RARITY_COLORS[wonPrize.rarity]}44`,
                            boxShadow: RARITY_GLOW[wonPrize.rarity],
                            animation: 'prizePopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                    >
                        {/* Rarity badge */}
                        <span
                            className="text-xs font-bold uppercase tracking-widest mb-4 px-4 py-1 rounded-full"
                            style={{
                                fontFamily: "'Fredoka One', cursive",
                                background: `${RARITY_COLORS[wonPrize.rarity]}22`,
                                color: RARITY_COLORS[wonPrize.rarity],
                                border: `1px solid ${RARITY_COLORS[wonPrize.rarity]}44`,
                                animation: wonPrize.rarity === 'legendary' ? 'glowPulse 1.5s ease-in-out infinite' : 'none',
                            }}
                        >
                            {RARITY_LABELS[wonPrize.rarity]}
                        </span>

                        {/* Prize image */}
                        <div
                            className="w-40 h-40 rounded-2xl overflow-hidden mb-4"
                            style={{
                                boxShadow: RARITY_GLOW[wonPrize.rarity],
                                border: `3px solid ${RARITY_COLORS[wonPrize.rarity]}66`,
                            }}
                        >
                            <img
                                src={wonPrize.image_url}
                                alt={wonPrize.name}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Prize name */}
                        <h2
                            className="text-2xl text-center mb-1"
                            style={{
                                fontFamily: "'Fredoka One', cursive",
                                color: RARITY_COLORS[wonPrize.rarity],
                                textShadow: `0 0 20px ${RARITY_COLORS[wonPrize.rarity]}44`,
                            }}
                        >
                            {wonPrize.name}
                        </h2>

                        <p className="text-purple-300/60 text-sm mb-6">Selamat! Kamu mendapatkan hadiah!</p>

                        {/* Play again button */}
                        <button
                            onClick={handleReset}
                            className="px-8 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 active:scale-95"
                            style={{
                                fontFamily: "'Fredoka One', cursive",
                                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                                color: 'white',
                                boxShadow: '0 4px 15px rgba(168,85,247,0.3)',
                            }}
                        >
                            Putar Lagi!
                        </button>
                    </div>
                </div>
            )}

            {/* Footer */}
            <p className="mt-8 text-purple-400/30 text-xs" style={{ fontFamily: "'Fredoka One', cursive" }}>
                Kediaman Corp &middot; Gachapon Doorprize
            </p>
        </div>
    );
};

export default GachaponGame;
