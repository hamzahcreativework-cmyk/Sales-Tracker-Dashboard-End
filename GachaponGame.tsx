import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

// ─── Data model (unchanged) ───
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

// ─── Enhanced SoundEngine ───
class SoundEngine {
    private ctx: AudioContext | null = null;

    private getCtx(): AudioContext {
        if (!this.ctx) this.ctx = new AudioContext();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    private noise(ctx: AudioContext, duration: number, gain: number, startTime: number): void {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        src.connect(g).connect(ctx.destination);
        src.start(startTime);
    }

    coinInsert() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        // Metallic clink: high harmonics with fast decay
        [1400, 2100, 2800, 3500].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.02);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + i * 0.02 + 0.1);
            gain.gain.setValueAtTime(0.25 - i * 0.04, now + i * 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.02 + 0.15);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.02);
            osc.stop(now + i * 0.02 + 0.18);
        });
        // Sliding "clink" into slot
        const slide = ctx.createOscillator();
        const sGain = ctx.createGain();
        slide.type = 'triangle';
        slide.frequency.setValueAtTime(600, now + 0.1);
        slide.frequency.exponentialRampToValueAtTime(200, now + 0.35);
        sGain.gain.setValueAtTime(0.12, now + 0.1);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        slide.connect(sGain).connect(ctx.destination);
        slide.start(now + 0.1);
        slide.stop(now + 0.4);
    }

    crankTurn() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        // Mechanical gear clicks — building in intensity
        for (let i = 0; i < 8; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const intensity = 0.1 + (i / 8) * 0.15;
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80 + i * 15 + Math.random() * 20, now + i * 0.1);
            osc.frequency.exponentialRampToValueAtTime(50, now + i * 0.1 + 0.08);
            gain.gain.setValueAtTime(intensity, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.09);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.1);
            // Noise burst per click
            this.noise(ctx, 0.05, 0.06 + i * 0.01, now + i * 0.1);
        }
        // Low rumble underneath
        const rumble = ctx.createOscillator();
        const rGain = ctx.createGain();
        rumble.type = 'triangle';
        rumble.frequency.setValueAtTime(55, now);
        rumble.frequency.linearRampToValueAtTime(35, now + 0.9);
        rGain.gain.setValueAtTime(0.08, now);
        rGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        rumble.connect(rGain).connect(ctx.destination);
        rumble.start(now);
        rumble.stop(now + 1.0);
    }

    ballRattle() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        // Light ball clinks at random intervals
        const taps = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < taps; i++) {
            const t = now + Math.random() * 0.3;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600 + Math.random() * 400, t);
            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.08);
        }
    }

    ballDrop() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        // Rolling: filtered noise that fades
        this.noise(ctx, 0.4, 0.12, now);
        // Bounces decreasing
        [380, 280, 320, 200, 160].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + 0.35 + i * 0.16);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + 0.35 + i * 0.16 + 0.12);
            gain.gain.setValueAtTime(0.22 - i * 0.03, now + 0.35 + i * 0.16);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + i * 0.16 + 0.14);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + 0.35 + i * 0.16);
            osc.stop(now + 0.35 + i * 0.16 + 0.16);
        });
    }

    capsuleCrack() {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        // Sharp noise crack
        this.noise(ctx, 0.08, 0.3, now);
        // Crack tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    prizeReveal(rarity: string) {
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        if (rarity === 'legendary') {
            // Full fanfare: ascending arpeggio + shimmer reverb
            const freqs = [523, 659, 784, 1047, 1319];
            freqs.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.12);
                gain.gain.setValueAtTime(0.3, now + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.55);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now + i * 0.12);
                osc.stop(now + i * 0.12 + 0.6);
            });
            // Harmony
            [659, 784, 1047].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + 0.65 + i * 0.1);
                gain.gain.setValueAtTime(0.15, now + 0.65 + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65 + i * 0.1 + 0.6);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now + 0.65 + i * 0.1);
                osc.stop(now + 0.65 + i * 0.1 + 0.65);
            });
            // Shimmer
            for (let i = 0; i < 6; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(2093 + i * 200, now + 0.9 + i * 0.07);
                gain.gain.setValueAtTime(0.08, now + 0.9 + i * 0.07);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9 + i * 0.07 + 0.4);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now + 0.9 + i * 0.07);
                osc.stop(now + 0.9 + i * 0.07 + 0.45);
            }
        } else if (rarity === 'rare') {
            // Exciting arpeggio
            const freqs = [440, 554, 659, 880, 1109];
            freqs.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.13);
                gain.gain.setValueAtTime(0.25, now + i * 0.13);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.13 + 0.45);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now + i * 0.13);
                osc.stop(now + i * 0.13 + 0.5);
            });
        } else {
            // Pleasant chime
            [392, 494, 587, 784].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.15);
                gain.gain.setValueAtTime(0.22, now + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now + i * 0.15);
                osc.stop(now + i * 0.15 + 0.45);
            });
        }
    }
}

// ─── Physics ball simulation ───
interface Ball {
    x: number; y: number; vx: number; vy: number;
    radius: number; color: string; prizeId: number;
    equatorAngle: number;
}

const DOME_W = 260;
const DOME_H = 200;
const DOME_CX = DOME_W / 2;
const DOME_CY = DOME_H; // center of dome circle (at bottom of dome)
const DOME_R = DOME_W / 2 - 6;

function makeBalls(prizes: GachaPrize[]): Ball[] {
    const balls: Ball[] = [];
    const count = Math.min(prizes.length, 14);
    for (let i = 0; i < count; i++) {
        const prize = prizes[i];
        const angle = (Math.PI * (i + 0.5)) / count;
        const r = DOME_R * 0.5 * (0.4 + Math.random() * 0.45);
        balls.push({
            x: DOME_CX + r * Math.cos(angle),
            y: DOME_CY - r * Math.abs(Math.sin(angle)) - 30,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            radius: 14,
            color: RARITY_COLORS[prize.rarity] || '#60a5fa',
            prizeId: prize.id,
            equatorAngle: Math.random() * 360,
        });
    }
    return balls;
}

function useBallPhysics(prizes: GachaPrize[], gameState: GameState) {
    const ballsRef = useRef<Ball[]>([]);
    const frameRef = useRef<number>(0);
    const [renderTick, setRenderTick] = useState(0);
    const droppingBallRef = useRef<{ x: number; y: number; progress: number } | null>(null);
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;

    // Init balls when prizes load
    useEffect(() => {
        if (prizes.length > 0 && ballsRef.current.length === 0) {
            ballsRef.current = makeBalls(prizes);
        }
    }, [prizes]);

    // Physics loop
    useEffect(() => {
        let rattleTimer = 0;

        const step = () => {
            const balls = ballsRef.current;
            const state = gameStateRef.current;
            const gravity = 0.18;
            const damping = 0.68;

            balls.forEach(b => {
                // Gravity
                b.vy += gravity;

                // Cranking: random impulses
                if (state === 'cranking') {
                    b.vx += (Math.random() - 0.5) * 1.0;
                    b.vy += (Math.random() - 0.5) * 1.0;
                }

                // Clamp velocity
                const maxV = state === 'cranking' ? 8 : 5;
                const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                if (spd > maxV) { b.vx = (b.vx / spd) * maxV; b.vy = (b.vy / spd) * maxV; }

                b.x += b.vx;
                b.y += b.vy;
                b.equatorAngle += spd * 1.5;

                // Dome boundary (semicircle: center at DOME_CX, DOME_CY, radius DOME_R)
                const dx = b.x - DOME_CX;
                const dy = b.y - DOME_CY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = DOME_R - b.radius;
                if (dist > maxDist && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    b.x = DOME_CX + nx * maxDist;
                    b.y = DOME_CY + ny * maxDist;
                    const dot = b.vx * nx + b.vy * ny;
                    b.vx = (b.vx - 2 * dot * nx) * damping;
                    b.vy = (b.vy - 2 * dot * ny) * damping;
                }

                // Floor of dome
                const floorY = DOME_CY - b.radius - 2;
                if (b.y > floorY) {
                    b.y = floorY;
                    b.vy = -Math.abs(b.vy) * damping;
                    b.vx *= 0.9;
                }
            });

            // Ball-ball collisions
            for (let i = 0; i < balls.length; i++) {
                for (let j = i + 1; j < balls.length; j++) {
                    const a = balls[i];
                    const bBall = balls[j];
                    const dx = bBall.x - a.x;
                    const dy = bBall.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = a.radius + bBall.radius;
                    if (dist < minDist && dist > 0) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const overlap = (minDist - dist) / 2;
                        a.x -= nx * overlap;
                        a.y -= ny * overlap;
                        bBall.x += nx * overlap;
                        bBall.y += ny * overlap;
                        const dvx = bBall.vx - a.vx;
                        const dvy = bBall.vy - a.vy;
                        const dot = dvx * nx + dvy * ny;
                        if (dot < 0) {
                            const impulse = dot * 0.85;
                            a.vx += impulse * nx;
                            a.vy += impulse * ny;
                            bBall.vx -= impulse * nx;
                            bBall.vy -= impulse * ny;
                        }
                    }
                }
            }

            rattleTimer++;
            setRenderTick(t => t + 1);
            frameRef.current = requestAnimationFrame(step);
        };

        frameRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frameRef.current);
    }, []);

    return { balls: ballsRef.current, renderTick, droppingBallRef };
}

// ─── Confetti system ───
interface Particle {
    x: number; y: number; vx: number; vy: number;
    size: number; color: string; rotation: number; rotSpeed: number; life: number;
    shape: 'rect' | 'circle' | 'star';
}

function createConfetti(count: number, color: string): Particle[] {
    const palettes: Record<string, string[]> = {
        '#fbbf24': ['#fbbf24', '#f59e0b', '#fde68a', '#fffbeb', '#d97706', '#ff6b35'],
        '#a78bfa': ['#a78bfa', '#8b5cf6', '#c4b5fd', '#ddd6fe', '#7c3aed', '#e879f9'],
        '#60a5fa': ['#60a5fa', '#3b82f6', '#93c5fd', '#bfdbfe', '#2563eb', '#38bdf8'],
    };
    const colors = palettes[color] || palettes['#60a5fa'];
    const shapes: Array<'rect' | 'circle' | 'star'> = ['rect', 'rect', 'circle', 'star'];
    return Array.from({ length: count }, () => ({
        x: 50 + (Math.random() - 0.5) * 30,
        y: 35 + (Math.random() - 0.5) * 15,
        vx: (Math.random() - 0.5) * 8,
        vy: -(Math.random() * 5 + 2),
        size: Math.random() * 9 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 18,
        life: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
    }));
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
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
        const ctx2d = canvas.getContext('2d');
        if (!ctx2d) return;
        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        ctx2d.scale(window.devicePixelRatio, window.devicePixelRatio);
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;

        const animate = () => {
            ctx2d.clearRect(0, 0, w, h);
            let alive = false;
            particlesRef.current.forEach(p => {
                if (p.life <= 0) return;
                alive = true;
                p.x += p.vx * 0.35;
                p.y += p.vy * 0.35;
                p.vy += 0.14;
                p.vx *= 0.99;
                p.rotation += p.rotSpeed;
                p.life -= 0.007;
                const px = (p.x / 100) * w;
                const py = (p.y / 100) * h;
                ctx2d.save();
                ctx2d.translate(px, py);
                ctx2d.rotate((p.rotation * Math.PI) / 180);
                ctx2d.globalAlpha = Math.max(0, p.life);
                ctx2d.fillStyle = p.color;
                if (p.shape === 'rect') {
                    ctx2d.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.55);
                } else if (p.shape === 'circle') {
                    ctx2d.beginPath();
                    ctx2d.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx2d.fill();
                } else {
                    drawStar(ctx2d, 0, 0, p.size / 2);
                    ctx2d.fill();
                }
                ctx2d.restore();
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

// ─── Physics-based dome balls renderer ───
const DomeBalls: React.FC<{
    prizes: GachaPrize[];
    gameState: GameState;
    droppingIndex: number;
    droppingProgress: number;
}> = ({ prizes, gameState, droppingIndex, droppingProgress }) => {
    const { balls, renderTick } = useBallPhysics(prizes, gameState);

    // Suppress renderTick lint warning — we need it to re-render
    void renderTick;

    return (
        <>
            {balls.map((ball, i) => {
                const isDroppingThis = gameState === 'dropping' && i === droppingIndex;
                let displayX = ball.x;
                let displayY = ball.y;
                let scale = 1;
                let opacity = 1;
                if (isDroppingThis) {
                    // Animate toward chute: bottom-center of dome
                    const targetX = DOME_CX;
                    const targetY = DOME_H - 5;
                    displayX = ball.x + (targetX - ball.x) * droppingProgress;
                    displayY = ball.y + (targetY - ball.y) * droppingProgress;
                    scale = 1 - droppingProgress * 0.3;
                    opacity = 1 - droppingProgress * 0.5;
                }
                const color = ball.color;
                return (
                    <div
                        key={ball.prizeId}
                        style={{
                            position: 'absolute',
                            left: displayX - ball.radius,
                            top: displayY - ball.radius,
                            width: ball.radius * 2,
                            height: ball.radius * 2,
                            borderRadius: '50%',
                            background: `radial-gradient(circle at 35% 32%, white 0%, ${color}cc 22%, ${color} 55%, ${color}88 80%, #0005 100%)`,
                            boxShadow: `inset -3px -3px 6px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.4), 0 0 8px ${color}66`,
                            transform: `scale(${scale})`,
                            opacity,
                            willChange: 'transform',
                            transition: isDroppingThis ? 'none' : 'opacity 0.2s',
                        }}
                    >
                        {/* Equator seam line */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '5%',
                            width: '90%',
                            height: '2px',
                            background: `rgba(255,255,255,0.25)`,
                            transform: `rotate(${ball.equatorAngle % 45}deg)`,
                            borderRadius: '1px',
                        }} />
                        {/* Specular highlight */}
                        <div style={{
                            position: 'absolute',
                            top: '15%',
                            left: '20%',
                            width: '30%',
                            height: '20%',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.55)',
                            filter: 'blur(2px)',
                        }} />
                    </div>
                );
            })}
        </>
    );
};

// ─── Capsule crack-open animation ───
const CapsuleCrackReveal: React.FC<{
    rarity: string;
    prizeImageUrl: string;
    prizeName: string;
    onDone: () => void;
}> = ({ rarity, prizeImageUrl, prizeName, onDone }) => {
    const [phase, setPhase] = useState<'landing' | 'cracking' | 'open'>('landing');
    const color = RARITY_COLORS[rarity] || '#60a5fa';

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('cracking'), 500);
        const t2 = setTimeout(() => setPhase('open'), 1200);
        const t3 = setTimeout(() => onDone(), 1700);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onDone]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
        }}>
            {/* Spotlight tray */}
            <div style={{
                position: 'relative',
                width: 160,
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {/* Light burst */}
                <div style={{
                    position: 'absolute',
                    inset: -20,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`,
                    animation: phase === 'open' ? 'burstExpand 0.5s ease-out forwards' : 'none',
                    opacity: phase === 'landing' ? 0 : 1,
                    transition: 'opacity 0.3s',
                }} />

                {/* Capsule body (two halves) */}
                <div style={{
                    position: 'relative',
                    width: 100,
                    height: 100,
                    transform: phase === 'landing' ? 'scale(0.6) translateY(30px)' : 'scale(1) translateY(0)',
                    transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    {/* Top half */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '50%',
                        borderRadius: '50px 50px 0 0',
                        background: `radial-gradient(ellipse at 35% 30%, white 0%, ${color}cc 30%, ${color} 70%)`,
                        boxShadow: `inset -4px -4px 8px rgba(0,0,0,0.25), 0 0 20px ${color}66`,
                        overflow: 'hidden',
                        transformOrigin: 'bottom center',
                        transform: phase === 'cracking' || phase === 'open'
                            ? 'rotateX(-50deg) translateY(-18px)'
                            : 'rotateX(0deg) translateY(0)',
                        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                        willChange: 'transform',
                        perspective: '200px',
                    }}>
                        <div style={{
                            position: 'absolute', top: '20%', left: '25%',
                            width: '35%', height: '30%', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.5)', filter: 'blur(3px)',
                        }} />
                    </div>

                    {/* Bottom half */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '50%',
                        borderRadius: '0 0 50px 50px',
                        background: `radial-gradient(ellipse at 65% 70%, ${color}88 0%, ${color} 50%, ${color}cc 100%)`,
                        boxShadow: `inset 4px 4px 8px rgba(0,0,0,0.25), 0 4px 15px rgba(0,0,0,0.3)`,
                        overflow: 'hidden',
                        transformOrigin: 'top center',
                        transform: phase === 'cracking' || phase === 'open'
                            ? 'rotateX(50deg) translateY(18px)'
                            : 'rotateX(0deg) translateY(0)',
                        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                        willChange: 'transform',
                        perspective: '200px',
                    }}>
                        {/* Prize image revealed inside */}
                        {phase === 'open' && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'fadeIn 0.3s ease-out',
                            }}>
                                <img src={prizeImageUrl} alt={prizeName}
                                    style={{ width: '80%', height: '80%', objectFit: 'cover', borderRadius: '50%' }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Seam line */}
                    <div style={{
                        position: 'absolute',
                        top: '49%',
                        left: 0,
                        width: '100%',
                        height: '3px',
                        background: `rgba(255,255,255,0.4)`,
                        boxShadow: `0 0 4px ${color}`,
                    }} />
                </div>
            </div>
        </div>
    );
};

// ─── Ambient Sparkles ───
const AmbientSparkles: React.FC = () => {
    const sparkles = useRef(
        Array.from({ length: 18 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            top: Math.random() * 100,
            size: Math.random() * 4 + 2,
            color: ['#a78bfa', '#60a5fa', '#fbbf24', '#f472b6', '#34d399'][Math.floor(Math.random() * 5)],
            delay: Math.random() * 5,
            duration: 3 + Math.random() * 4,
        }))
    );
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {sparkles.current.map(s => (
                <div
                    key={s.id}
                    style={{
                        position: 'absolute',
                        left: `${s.left}%`,
                        top: `${s.top}%`,
                        width: s.size,
                        height: s.size,
                        borderRadius: '50%',
                        background: s.color,
                        opacity: 0,
                        animation: `sparkleFloat ${s.duration}s ease-in-out infinite ${s.delay}s`,
                        willChange: 'transform, opacity',
                    }}
                />
            ))}
        </div>
    );
};

// ─── Chrome shimmer band ───
const ChromeShimmer: React.FC<{ width: number; height: number }> = ({ width, height }) => (
    <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
        backgroundSize: '200% 100%',
        animation: 'shimmerSlide 3s linear infinite',
        pointerEvents: 'none',
    }} />
);

// ─── Main GachaponGame component ───
const GachaponGame: React.FC = () => {
    const [prizes, setPrizes] = useState<GachaPrize[]>([]);
    const [gameState, setGameState] = useState<GameState>('idle');
    const [wonPrize, setWonPrize] = useState<GachaPrize | null>(null);
    const [confetti, setConfetti] = useState<Particle[]>([]);
    const [loading, setLoading] = useState(true);
    const [droppingProgress, setDroppingProgress] = useState(0);
    const [droppingIndex] = useState(0);
    const [handleAngle, setHandleAngle] = useState(0);
    const [capsuleDone, setCapsuleDone] = useState(false);
    const [screenShake, setScreenShake] = useState(false);
    const [machineBreath, setMachineBreath] = useState(false);

    const soundRef = useRef(new SoundEngine());
    const droppingAnimRef = useRef<number>(0);
    const droppingStartRef = useRef(0);
    const crankIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Supabase (unchanged) ───
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

    // ─── Idle machine breathing ───
    useEffect(() => {
        if (gameState !== 'idle') return;
        const interval = setInterval(() => {
            setMachineBreath(true);
            setTimeout(() => setMachineBreath(false), 800);
        }, 4000);
        return () => clearInterval(interval);
    }, [gameState]);

    const pickPrize = useCallback((): GachaPrize | null => {
        if (prizes.length === 0) return null;
        const grouped: Record<string, GachaPrize[]> = { common: [], rare: [], legendary: [] };
        prizes.forEach(p => { if (grouped[p.rarity]) grouped[p.rarity].push(p); });
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

        // Coin insert
        soundRef.current.coinInsert();
        setGameState('coin_inserted');

        setTimeout(() => {
            // Cranking
            soundRef.current.crankTurn();
            setGameState('cranking');
            setHandleAngle(0);

            // Animate handle turn
            let angle = 0;
            const handleAnim = setInterval(() => {
                angle += 12;
                setHandleAngle(angle);
                if (angle >= 360) clearInterval(handleAnim);
            }, 22);

            // Ball rattle during cranking
            crankIntervalRef.current = setInterval(() => {
                soundRef.current.ballRattle();
            }, 280);

            setTimeout(() => {
                if (crankIntervalRef.current) clearInterval(crankIntervalRef.current);

                // Dropping
                soundRef.current.ballDrop();
                setGameState('dropping');
                setDroppingProgress(0);
                droppingStartRef.current = performance.now();

                const animateDrop = (now: number) => {
                    const elapsed = now - droppingStartRef.current;
                    const progress = Math.min(elapsed / 900, 1);
                    setDroppingProgress(progress);
                    if (progress < 1) {
                        droppingAnimRef.current = requestAnimationFrame(animateDrop);
                    }
                };
                droppingAnimRef.current = requestAnimationFrame(animateDrop);

                setTimeout(() => {
                    cancelAnimationFrame(droppingAnimRef.current);
                    const prize = pickPrize();
                    setWonPrize(prize);
                    setCapsuleDone(false);
                    setGameState('revealing');
                    if (prize) {
                        soundRef.current.capsuleCrack();
                        if (prize.rarity === 'legendary') {
                            setScreenShake(true);
                            setTimeout(() => setScreenShake(false), 600);
                        }
                        const count = prize.rarity === 'legendary' ? 140 : prize.rarity === 'rare' ? 90 : 55;
                        setConfetti(createConfetti(count, RARITY_COLORS[prize.rarity]));
                    }
                }, 1100);
            }, 900);
        }, 650);
    }, [gameState, prizes, pickPrize]);

    const handleReset = useCallback(() => {
        setGameState('idle');
        setWonPrize(null);
        setConfetti([]);
        setCapsuleDone(false);
        setDroppingProgress(0);
        setHandleAngle(0);
    }, []);

    const handleCapsuleDone = useCallback(() => {
        setCapsuleDone(true);
        if (wonPrize) soundRef.current.prizeReveal(wonPrize.rarity);
    }, [wonPrize]);

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
        <div
            className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
            style={{
                background: 'linear-gradient(160deg, #1a0533 0%, #0a1628 50%, #150a2e 100%)',
                animation: screenShake ? 'screenShake 0.5s ease-in-out' : 'none',
            }}
        >
            <style>{`
                @keyframes sparkleFloat {
                    0%   { opacity: 0; transform: translateY(0) scale(0.5); }
                    40%  { opacity: 0.7; transform: translateY(-20px) scale(1); }
                    100% { opacity: 0; transform: translateY(-50px) scale(0.3); }
                }
                @keyframes shimmerSlide {
                    0%   { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes coinDrop {
                    0%   { transform: translate(-50%, -50px) rotateY(0deg) scale(1); opacity: 0; }
                    20%  { opacity: 1; }
                    70%  { transform: translate(-50%, 10px) rotateY(540deg) scale(0.9); opacity: 1; }
                    100% { transform: translate(-50%, 28px) rotateY(720deg) scale(0.4); opacity: 0; }
                }
                @keyframes machineBreath {
                    0%,100% { transform: scale(1); }
                    50%     { transform: scale(1.005); }
                }
                @keyframes machineCrank {
                    0%,100% { transform: translateX(0) rotate(0deg); }
                    20%     { transform: translateX(-4px) rotate(-0.6deg); }
                    40%     { transform: translateX(5px) rotate(0.6deg); }
                    60%     { transform: translateX(-3px) rotate(-0.4deg); }
                    80%     { transform: translateX(3px) rotate(0.4deg); }
                }
                @keyframes domeGlow {
                    0%,100% { box-shadow: inset 0 0 40px rgba(168,85,247,0.08), 0 0 20px rgba(168,85,247,0.08); }
                    50%     { box-shadow: inset 0 0 60px rgba(168,85,247,0.18), 0 0 35px rgba(168,85,247,0.15); }
                }
                @keyframes ballExitChute {
                    0%   { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
                    60%  { transform: translateX(-50%) translateY(35px) scale(0.85); opacity: 0.8; }
                    100% { transform: translateX(-50%) translateY(80px) scale(0.55); opacity: 0; }
                }
                @keyframes prizeSlideUp {
                    0%   { transform: translateY(60px) scale(0.85); opacity: 0; }
                    60%  { transform: translateY(-8px) scale(1.04); opacity: 1; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes legendaryRing {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes glowPulse {
                    0%,100% { opacity: 0.6; transform: scale(1); }
                    50%     { opacity: 1;   transform: scale(1.08); }
                }
                @keyframes screenShake {
                    0%,100% { transform: translate(0,0); }
                    15%     { transform: translate(-6px,-3px); }
                    30%     { transform: translate(6px,3px); }
                    45%     { transform: translate(-4px,4px); }
                    60%     { transform: translate(4px,-4px); }
                    75%     { transform: translate(-2px,2px); }
                    90%     { transform: translate(2px,-2px); }
                }
                @keyframes burstExpand {
                    0%   { transform: scale(0.5); opacity: 0.8; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes starEmit {
                    0%   { transform: translate(0,0) scale(1); opacity: 1; }
                    100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
                }
                @keyframes lightRayRotate {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            <AmbientSparkles />

            {/* Title */}
            <h1
                className="text-4xl sm:text-5xl text-center mb-1 text-transparent bg-clip-text"
                style={{
                    fontFamily: "'Fredoka One', cursive",
                    backgroundImage: 'linear-gradient(135deg, #c084fc 0%, #f472b6 50%, #fbbf24 100%)',
                    WebkitBackgroundClip: 'text',
                    filter: 'drop-shadow(0 2px 12px rgba(192,132,252,0.4))',
                }}
            >
                GACHAPON
            </h1>
            <p
                className="text-purple-300/60 text-sm mb-8"
                style={{ fontFamily: "'Fredoka One', cursive" }}
            >
                Doorprize Spesial
            </p>

            {/* Machine wrapper — handles shake + breath */}
            <div
                style={{
                    animation: gameState === 'cranking'
                        ? 'machineCrank 0.18s ease-in-out infinite'
                        : machineBreath
                            ? 'machineBreath 0.8s ease-in-out'
                            : 'none',
                    willChange: 'transform',
                    perspective: '1000px',
                }}
            >
                {/* Machine outer container — slight 3D tilt */}
                <div
                    style={{
                        position: 'relative',
                        width: 280,
                        transform: 'rotateX(2deg)',
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {/* ── Elliptical floor shadow ── */}
                    <div style={{
                        position: 'absolute',
                        bottom: -20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 220,
                        height: 22,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)',
                        filter: 'blur(12px)',
                        zIndex: -1,
                    }} />

                    {/* ── Glass Dome ── */}
                    <div
                        style={{
                            position: 'relative',
                            width: DOME_W,
                            height: DOME_H,
                            margin: '0 auto',
                            borderRadius: `${DOME_W / 2}px ${DOME_W / 2}px 0 0`,
                            background: 'linear-gradient(180deg, rgba(200,210,255,0.10) 0%, rgba(150,160,255,0.06) 60%, rgba(100,110,220,0.04) 100%)',
                            border: '2.5px solid rgba(180,160,255,0.22)',
                            borderBottom: 'none',
                            overflow: 'hidden',
                            animation: 'domeGlow 3.5s ease-in-out infinite',
                        }}
                    >
                        {/* Glass specular reflections */}
                        {/* Main arc highlight top-left */}
                        <div style={{
                            position: 'absolute',
                            top: 10,
                            left: 20,
                            width: 70,
                            height: 110,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 70%)',
                            transform: 'rotate(-15deg)',
                            pointerEvents: 'none',
                        }} />
                        {/* Secondary smaller arc */}
                        <div style={{
                            position: 'absolute',
                            top: 18,
                            left: 32,
                            width: 30,
                            height: 50,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.15)',
                            transform: 'rotate(-10deg)',
                            filter: 'blur(2px)',
                            pointerEvents: 'none',
                        }} />
                        {/* Right-edge darkening for depth */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '30%',
                            height: '100%',
                            background: 'linear-gradient(to left, rgba(0,0,0,0.18), transparent)',
                            pointerEvents: 'none',
                        }} />
                        {/* Bottom-edge darkening */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: '100%',
                            height: '20%',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.20), transparent)',
                            pointerEvents: 'none',
                        }} />

                        {/* Physics balls */}
                        {prizes.length > 0
                            ? <DomeBalls
                                prizes={prizes}
                                gameState={gameState}
                                droppingIndex={droppingIndex}
                                droppingProgress={droppingProgress}
                            />
                            : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <p style={{ color: 'rgba(200,180,255,0.4)', fontSize: 12, textAlign: 'center', padding: '0 20px' }}>
                                        Belum ada hadiah.<br />Upload di CMS Admin.
                                    </p>
                                </div>
                            )
                        }
                    </div>

                    {/* ── Chrome ring between dome and body ── */}
                    <div style={{
                        position: 'relative',
                        width: DOME_W + 12,
                        marginLeft: -6,
                        height: 14,
                        background: 'linear-gradient(180deg, #e4e4e7 0%, #a1a1aa 40%, #71717a 70%, #d4d4d8 100%)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
                        overflow: 'hidden',
                    }}>
                        <ChromeShimmer width={DOME_W + 12} height={14} />
                    </div>

                    {/* ── Machine Body ── */}
                    <div
                        style={{
                            position: 'relative',
                            width: DOME_W + 20,
                            marginLeft: -10,
                            background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 20%, #b91c1c 55%, #991b1b 80%, #7f1d1d 100%)',
                            borderRadius: '0 0 18px 18px',
                            paddingBottom: 24,
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12), inset 2px 0 0 rgba(255,255,255,0.05), inset -2px 0 0 rgba(0,0,0,0.15)',
                        }}
                    >
                        {/* Side specular on body */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0,
                            width: '20%', height: '100%',
                            background: 'linear-gradient(to right, rgba(255,255,255,0.07), transparent)',
                            borderRadius: '0 0 0 18px',
                            pointerEvents: 'none',
                        }} />

                        {/* Decorative band upper */}
                        <div style={{
                            width: '100%',
                            height: 6,
                            background: 'linear-gradient(180deg, #fca5a5 0%, #ef4444 50%, #b91c1c 100%)',
                            marginBottom: 12,
                        }} />

                        {/* Branding / label area */}
                        <div style={{
                            margin: '0 20px 12px',
                            padding: '6px 10px',
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.15))',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.08)',
                            textAlign: 'center',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                        }}>
                            <span style={{
                                fontFamily: "'Fredoka One', cursive",
                                fontSize: 18,
                                letterSpacing: '0.12em',
                                color: '#fde68a',
                                textShadow: '0 0 12px rgba(251,191,36,0.5), 0 1px 0 rgba(0,0,0,0.5)',
                                display: 'block',
                            }}>GACHA</span>
                            <span style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: 8,
                                letterSpacing: '0.2em',
                                color: 'rgba(253,230,138,0.6)',
                                textTransform: 'uppercase',
                            }}>DOORPRIZE</span>
                        </div>

                        {/* ── Coin Slot + Handle Row ── */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 24,
                            padding: '4px 0 8px',
                        }}>
                            {/* Coin slot panel */}
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    width: 48,
                                    height: 62,
                                    borderRadius: 10,
                                    background: 'linear-gradient(180deg, #3f3f46 0%, #27272a 60%, #18181b 100%)',
                                    boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    {/* Slot opening */}
                                    <div style={{
                                        width: 28,
                                        height: 5,
                                        borderRadius: 3,
                                        background: '#09090b',
                                        boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.08)',
                                    }} />
                                </div>
                                {/* Coin animation */}
                                {gameState === 'coin_inserted' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: -8,
                                        left: '50%',
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 40%, #f59e0b 70%, #d97706 100%)',
                                        border: '2px solid #b45309',
                                        boxShadow: '0 0 12px rgba(251,191,36,0.7), inset 0 1px 0 rgba(255,255,255,0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        animation: 'coinDrop 0.65s ease-in forwards',
                                        willChange: 'transform',
                                    }}>
                                        <span style={{ fontSize: 9, fontWeight: 900, color: '#92400e', lineHeight: 1 }}>$</span>
                                    </div>
                                )}
                            </div>

                            {/* Handle assembly */}
                            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {/* Shaft base mount */}
                                <div style={{
                                    width: 16,
                                    height: 8,
                                    borderRadius: '4px 4px 0 0',
                                    background: 'linear-gradient(180deg, #a1a1aa, #71717a)',
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
                                }} />
                                {/* Shaft */}
                                <div
                                    style={{
                                        width: 10,
                                        height: 36,
                                        background: 'linear-gradient(90deg, #e4e4e7 0%, #a1a1aa 40%, #71717a 80%, #a1a1aa 100%)',
                                        boxShadow: '2px 0 4px rgba(0,0,0,0.3), inset -1px 0 0 rgba(0,0,0,0.2)',
                                        transformOrigin: 'top center',
                                        transform: `rotate(${handleAngle % 360 > 180 ? -(360 - handleAngle % 360) : handleAngle % 360}deg)`,
                                        transition: 'none',
                                        willChange: 'transform',
                                    }}
                                />
                                {/* Knob */}
                                <div style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle at 35% 30%, #f4f4f5 0%, #d4d4d8 30%, #a1a1aa 60%, #71717a 100%)',
                                    boxShadow: '0 3px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.5), inset 1px 1px 3px rgba(255,255,255,0.3)',
                                    border: '1.5px solid #a1a1aa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {/* Knob center dot */}
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: 'radial-gradient(circle at 40% 35%, #e4e4e7, #71717a)',
                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* ── Output chute ── */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                            {/* Chute surround (chrome) */}
                            <div style={{
                                position: 'relative',
                                width: 90,
                                padding: '3px 3px 0',
                                background: 'linear-gradient(180deg, #d4d4d8, #a1a1aa)',
                                borderRadius: '0 0 14px 14px',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                                overflow: 'hidden',
                            }}>
                                <ChromeShimmer width={90} height={60} />
                                {/* Chute inner */}
                                <div style={{
                                    width: '100%',
                                    height: 50,
                                    background: 'linear-gradient(180deg, #09090b 0%, #18181b 40%, #0a0a0a 100%)',
                                    borderRadius: '0 0 12px 12px',
                                    boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.6)',
                                    position: 'relative',
                                    overflow: 'visible',
                                }}>
                                    {/* Dropping capsule ball exits through chute */}
                                    {gameState === 'dropping' && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: '50%',
                                            width: 26,
                                            height: 26,
                                            borderRadius: '50%',
                                            background: `radial-gradient(circle at 35% 30%, white 0%, ${RARITY_COLORS[wonPrize?.rarity || 'common']}cc 25%, ${RARITY_COLORS[wonPrize?.rarity || 'common']} 60%)`,
                                            boxShadow: `0 0 14px ${RARITY_COLORS[wonPrize?.rarity || 'common']}88`,
                                            animation: 'ballExitChute 1.1s ease-in forwards',
                                            willChange: 'transform',
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: '14%', left: '18%',
                                                width: '28%', height: '22%',
                                                borderRadius: '50%',
                                                background: 'rgba(255,255,255,0.55)',
                                                filter: 'blur(1px)',
                                            }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Lower decorative band */}
                        <div style={{
                            margin: '10px 20px 0',
                            height: 4,
                            borderRadius: 2,
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                        }} />
                    </div>

                    {/* ── Machine base feet ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 30px', marginTop: -2 }}>
                        {[0, 1].map(i => (
                            <div key={i} style={{
                                width: 44,
                                height: 18,
                                borderRadius: '0 0 8px 8px',
                                background: 'linear-gradient(180deg, #52525b 0%, #3f3f46 60%, #27272a 100%)',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                            }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Play button ── */}
            {gameState === 'idle' && (
                <button
                    onClick={handlePlay}
                    disabled={prizes.length === 0}
                    style={{
                        marginTop: 32,
                        padding: '14px 40px',
                        borderRadius: 16,
                        border: 'none',
                        cursor: prizes.length > 0 ? 'pointer' : 'not-allowed',
                        fontFamily: "'Fredoka One', cursive",
                        fontSize: 18,
                        color: 'white',
                        background: prizes.length > 0
                            ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
                            : '#4b5563',
                        boxShadow: prizes.length > 0
                            ? '0 4px 24px rgba(168,85,247,0.45), 0 0 50px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.2)'
                            : 'none',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        opacity: prizes.length === 0 ? 0.4 : 1,
                    }}
                    onMouseEnter={e => {
                        if (prizes.length > 0) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    }}
                    onMouseDown={e => {
                        if (prizes.length > 0) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)';
                    }}
                    onMouseUp={e => {
                        if (prizes.length > 0) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)';
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
                    Bola keluar!
                </p>
            )}

            {/* ── Prize Reveal Overlay ── */}
            {gameState === 'revealing' && wonPrize && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(ellipse at center, rgba(30,10,60,0.92) 0%, rgba(5,5,20,0.97) 100%)',
                    backdropFilter: 'blur(6px)',
                }}>
                    <ConfettiCanvas particles={confetti} />

                    {/* Light rays (legendary) */}
                    {wonPrize.rarity === 'legendary' && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                        }}>
                            <div style={{
                                width: 600,
                                height: 600,
                                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(251,191,36,0.06) 10deg, transparent 20deg, rgba(251,191,36,0.04) 30deg, transparent 40deg)',
                                animation: 'lightRayRotate 8s linear infinite',
                                borderRadius: '50%',
                            }} />
                        </div>
                    )}

                    {/* Content */}
                    <div
                        style={{
                            position: 'relative',
                            zIndex: 50,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '32px 28px',
                            borderRadius: 24,
                            maxWidth: 360,
                            width: '90%',
                            background: 'linear-gradient(180deg, rgba(30,20,60,0.95), rgba(12,8,38,0.98))',
                            border: `2px solid ${RARITY_COLORS[wonPrize.rarity]}44`,
                            boxShadow: `${RARITY_GLOW[wonPrize.rarity]}, 0 20px 60px rgba(0,0,0,0.6)`,
                            animation: 'prizeSlideUp 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards',
                        }}
                    >
                        {/* Capsule crack phase */}
                        {!capsuleDone && (
                            <CapsuleCrackReveal
                                rarity={wonPrize.rarity}
                                prizeImageUrl={wonPrize.image_url}
                                prizeName={wonPrize.name}
                                onDone={handleCapsuleDone}
                            />
                        )}

                        {/* Prize card (after capsule opens) */}
                        {capsuleDone && (
                            <>
                                {/* Legendary rotating ring */}
                                {wonPrize.rarity === 'legendary' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -60%)',
                                        width: 220,
                                        height: 220,
                                        border: '2px dashed rgba(251,191,36,0.3)',
                                        borderRadius: '50%',
                                        animation: 'legendaryRing 6s linear infinite',
                                        pointerEvents: 'none',
                                    }} />
                                )}

                                {/* Rarity badge */}
                                <span
                                    style={{
                                        fontFamily: "'Fredoka One', cursive",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.15em',
                                        marginBottom: 16,
                                        padding: '4px 16px',
                                        borderRadius: 20,
                                        background: `${RARITY_COLORS[wonPrize.rarity]}22`,
                                        color: RARITY_COLORS[wonPrize.rarity],
                                        border: `1px solid ${RARITY_COLORS[wonPrize.rarity]}55`,
                                        animation: wonPrize.rarity === 'legendary' ? 'glowPulse 1.5s ease-in-out infinite' : 'none',
                                        display: 'block',
                                    }}
                                >
                                    {RARITY_LABELS[wonPrize.rarity]}
                                </span>

                                {/* Prize image with glow */}
                                <div style={{
                                    width: 160,
                                    height: 160,
                                    borderRadius: 18,
                                    overflow: 'hidden',
                                    marginBottom: 16,
                                    boxShadow: RARITY_GLOW[wonPrize.rarity],
                                    border: `3px solid ${RARITY_COLORS[wonPrize.rarity]}66`,
                                    animation: 'glowPulse 2s ease-in-out infinite',
                                    position: 'relative',
                                }}>
                                    <img
                                        src={wonPrize.image_url}
                                        alt={wonPrize.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    {/* Legendary: persistent golden particles overlay */}
                                    {wonPrize.rarity === 'legendary' && (
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, transparent 60%)',
                                            animation: 'glowPulse 1.2s ease-in-out infinite',
                                        }} />
                                    )}
                                </div>

                                {/* Prize name */}
                                <h2
                                    style={{
                                        fontFamily: "'Fredoka One', cursive",
                                        fontSize: 26,
                                        textAlign: 'center',
                                        marginBottom: 4,
                                        color: RARITY_COLORS[wonPrize.rarity],
                                        textShadow: `0 0 24px ${RARITY_COLORS[wonPrize.rarity]}55`,
                                        ...(wonPrize.rarity === 'legendary' ? {
                                            backgroundImage: 'linear-gradient(90deg, #fbbf24, #fde68a, #f59e0b, #fbbf24)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundSize: '200% auto',
                                            animation: 'shimmerSlide 2s linear infinite',
                                        } : {}),
                                    }}
                                >
                                    {wonPrize.name}
                                </h2>

                                <p style={{
                                    fontFamily: "'Poppins', sans-serif",
                                    color: 'rgba(200,180,255,0.55)',
                                    fontSize: 13,
                                    marginBottom: 24,
                                    textAlign: 'center',
                                }}>
                                    {wonPrize.rarity === 'legendary'
                                        ? 'SELAMAT! Kamu mendapat hadiah LEGENDARY!'
                                        : 'Selamat! Kamu mendapatkan hadiah!'}
                                </p>

                                {/* Play again */}
                                <button
                                    onClick={handleReset}
                                    style={{
                                        padding: '12px 36px',
                                        borderRadius: 14,
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontFamily: "'Fredoka One', cursive",
                                        fontSize: 16,
                                        color: 'white',
                                        background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                                        boxShadow: '0 4px 18px rgba(168,85,247,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                                        transition: 'transform 0.15s',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
                                >
                                    Putar Lagi!
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <p
                className="mt-10 text-purple-400/30 text-xs"
                style={{ fontFamily: "'Fredoka One', cursive" }}
            >
                Kediaman Corp &middot; Gachapon Doorprize
            </p>
        </div>
    );
};

export default GachaponGame;
