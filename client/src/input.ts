export type Keys = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
};

export function createKeyboard(): { keys: Keys; attach(): void; detach(): void } {
  const keys: Keys = { left: false, right: false, up: false, down: false, fire: false };
  const onDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
    if (e.key === ' ') keys.fire = true;
  };
  const onUp = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
    if (e.key === ' ') keys.fire = false;
  };
  return {
    keys,
    attach() {
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);
    },
    detach() {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    },
  };
}

