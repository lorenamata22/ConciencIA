// Alerta sonoro de sino ao fim de cada ciclo Pomodoro. Sintetizado via Web Audio
// (sem asset externo → componente self-contained). Guardado para SSR/jsdom, onde
// AudioContext não existe: nesses ambientes a chamada é um no-op silencioso.

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext ??
    null
  );
}

// Reaproveita um único contexto entre toques (criá-lo por toque estoura o limite
// de contextos do browser).
let sharedContext: AudioContext | null = null;

// Toca um "sino": duas parciais senoidais com decaimento exponencial.
export function playBell(): void {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return;

  try {
    sharedContext ??= new Ctor();
    const context = sharedContext;
    // Autoplay policy: o contexto pode nascer suspenso até um gesto do usuário.
    void context.resume?.();

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    master.connect(context.destination);

    // Fundamental + parcial superior dão o timbre metálico do sino.
    for (const [frequency, gain] of [
      [880, 1],
      [1320, 0.4],
    ] as const) {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      const partialGain = context.createGain();
      partialGain.gain.setValueAtTime(gain, now);
      oscillator.connect(partialGain);
      partialGain.connect(master);
      oscillator.start(now);
      oscillator.stop(now + 1.7);
    }
  } catch {
    // Falha ao sintetizar áudio nunca deve quebrar a UI do timer.
  }
}
