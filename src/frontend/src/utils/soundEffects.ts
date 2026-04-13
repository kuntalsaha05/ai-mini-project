export const SoundEffects = {
  stepComplete: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YCIAAAAAAA==",
  solved: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YCIAAAAAAA==",
  error: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YCIAAAAAAA==",
};

export function playSound(soundKey: keyof typeof SoundEffects): void {
  try {
    const audio = new Audio(SoundEffects[soundKey]);
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Silently fail if audio policy doesn't allow
    });
  } catch {
    // Silently fail
  }
}

export function enableSoundEffects(): void {
  // Used to initialize audio context
  const audio = new Audio();
  audio.volume = 0;
  audio.play().catch(() => {
    // Silently fail
  });
}
