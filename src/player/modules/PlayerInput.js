const KEY_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE'],
  flashlight: ['KeyT'],
};

const pressedKeys = new Set();
let inputEnabled = true;

function isAnyKeyPressed(keyCodes) {
  return keyCodes.some((keyCode) => pressedKeys.has(keyCode));
}

export function getMovementInput() {
  if (!inputEnabled) {
    return { forward: false, backward: false, left: false, right: false, sprint: false };
  }
  return {
    forward: isAnyKeyPressed(KEY_BINDINGS.forward),
    backward: isAnyKeyPressed(KEY_BINDINGS.backward),
    left: isAnyKeyPressed(KEY_BINDINGS.left),
    right: isAnyKeyPressed(KEY_BINDINGS.right),
    sprint: isAnyKeyPressed(KEY_BINDINGS.sprint),
  };
}

export function handleKeyDown(e, handlers = {}) {
  if (e.repeat) return;
  pressedKeys.add(e.code);

  if (!inputEnabled) return;

  if (KEY_BINDINGS.interact.includes(e.code)) {
    if (typeof handlers.onInteract === 'function') handlers.onInteract();
  }

  if (KEY_BINDINGS.flashlight.includes(e.code)) {
    if (typeof handlers.onFlashlight === 'function') handlers.onFlashlight();
  }
}

export function handleKeyUp(e) {
  pressedKeys.delete(e.code);
}

export function setInputEnabled(enabled) {
  inputEnabled = enabled;
  if (!enabled) clearInput();
}

export function clearInput() {
  pressedKeys.clear();
}

export function isInputEnabled() {
  return inputEnabled;
}
