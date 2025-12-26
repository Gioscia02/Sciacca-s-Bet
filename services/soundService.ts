
// Audio Context Singleton
let audioCtx: AudioContext | null = null;
let isMuted = false;

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// Helper per generare un tono
const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 0.2) => {
  if (isMuted) return;
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

  // Volume increased logic
  gainNode.gain.setValueAtTime(vol, ctx.currentTime + startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);
};

export const SoundService = {
  // Toggle Mute
  toggleMute: () => { isMuted = !isMuted; return isMuted; },

  // UI Interaction (Tab switch, generic click)
  playClick: () => {
    playTone(800, 'sine', 0.05, 0, 0.15); // Aumentato da 0.05 a 0.15
  },

  // Selezione Quota (Pop sound)
  playPop: () => {
    playTone(600, 'triangle', 0.05, 0, 0.15); // Aumentato da 0.05 a 0.15
  },

  // Rimozione elemento
  playDelete: () => {
    playTone(300, 'sawtooth', 0.1, 0, 0.15); // Aumentato da 0.05 a 0.15
  },

  // Scommessa piazzata (Suono tech di conferma)
  playConfirm: () => {
    playTone(400, 'sine', 0.1, 0, 0.25); // Aumentato da 0.1 a 0.25
    playTone(800, 'sine', 0.2, 0.1, 0.25);
  },

  // Soldi / Bonus (Suono moneta)
  playCoin: () => {
    playTone(1200, 'sine', 0.1, 0, 0.25); // Aumentato
    playTone(1800, 'sine', 0.4, 0.05, 0.35); // Aumentato per "brillare" di più
  },

  // Vittoria (Fanfara Arcade)
  playWin: () => {
    const now = 0;
    // Arpeggio veloce C Major - Volumi aumentati
    playTone(523.25, 'square', 0.1, now, 0.2); 
    playTone(659.25, 'square', 0.1, now + 0.1, 0.2); 
    playTone(783.99, 'square', 0.1, now + 0.2, 0.2); 
    playTone(1046.50, 'square', 0.4, now + 0.3, 0.4); // Nota finale forte
  },

  // Sconfitta (Suono discendente)
  playLoss: () => {
    if (isMuted) return;
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5); // Slide down

    gainNode.gain.setValueAtTime(0.25, ctx.currentTime); // Aumentato da 0.1 a 0.25
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }
};
