
class SoundService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initAttempted = false;

  constructor() {
    // Lazy initialization
  }

  private init() {
    if (this.initAttempted && this.audioContext) return;
    
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
            console.warn("AudioContext not supported");
            this.initAttempted = true;
            return;
        }

        if (!this.audioContext) {
            this.audioContext = new AudioContextClass();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3; // Global volume
            this.masterGain.connect(this.audioContext.destination);
        }
        
        if (this.audioContext.state === 'suspended') {
            // We catch this specifically because resuming without gesture can throw
            // This is non-blocking
            this.audioContext.resume().catch(() => {});
        }
        this.initAttempted = true;
    } catch (e) {
        console.warn("Audio initialization failed. Playing silent mode.", e);
        this.initAttempted = true;
    }
  }

  public playTone(frequency: number, type: OscillatorType = 'sine', duration: number = 0.1) {
    this.init();
    if (!this.audioContext || !this.masterGain) return;

    // Check state again, if suspended, try one last resume attempt but don't block
    if (this.audioContext.state === 'suspended') {
         this.audioContext.resume().catch(() => {});
         // If still suspended, we can't play, but we shouldn't throw error
         return;
    }

    try {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    } catch(e) {
        // Ignore playback errors
    }
  }

  public playMove() {
    this.playTone(300, 'triangle', 0.05);
  }

  public playRotate() {
    this.playTone(400, 'sine', 0.1);
  }

  public playDrop() {
    this.playTone(150, 'sawtooth', 0.15);
  }

  public playExplosion() {
    this.init();
    if (!this.audioContext || !this.masterGain) return;
    
    try {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        // Low frequency saw wave dropping in pitch simulating an explosion/collapse
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.audioContext.currentTime + 0.5);

        gain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.5);
    } catch(e) {}
  }

  public playLineClear() {
    this.init();
    if (!this.audioContext) return;
    // Arpeggio
    const now = this.audioContext.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'square', 0.2), i * 100);
    });
  }

  public playSimonTone(index: number) {
    // 5 distinct tones for the 5 buttons
    const freqs = [300, 400, 500, 600, 700]; 
    this.playTone(freqs[index % freqs.length], 'sine', 0.3);
  }

  public playSimonFail() {
    this.playTone(150, 'sawtooth', 0.5);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.5), 150);
  }

  public playSimonSuccess() {
    this.init();
    if (!this.audioContext) return;
    [800, 1000, 1200].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.15), i * 100);
    });
  }

  public playGameStart() {
    this.init();
    if (!this.audioContext) return;
    [440, 550, 660, 880].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'square', 0.2), i * 150);
    });
  }
}

export const soundService = new SoundService();