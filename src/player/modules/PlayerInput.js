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

// Virtual input for mobile
let virtualAxes = { x: 0, y: 0 };
let virtualSprint = false;

// Event handlers
let interactHandler = null;
let flashlightHandler = null;

function isAnyKeyPressed(keyCodes) {
  return keyCodes.some((keyCode) => pressedKeys.has(keyCode));
}

export function getMovementInput() {
  if (!inputEnabled) {
    return { forward: false, backward: false, left: false, right: false, sprint: false };
  }
  return {
    forward: isAnyKeyPressed(KEY_BINDINGS.forward) || virtualAxes.y < -0.3,
    backward: isAnyKeyPressed(KEY_BINDINGS.backward) || virtualAxes.y > 0.3,
    left: isAnyKeyPressed(KEY_BINDINGS.left) || virtualAxes.x < -0.3,
    right: isAnyKeyPressed(KEY_BINDINGS.right) || virtualAxes.x > 0.3,
    sprint: isAnyKeyPressed(KEY_BINDINGS.sprint) || virtualSprint,
  };
}

export function setHandlers(handlers = {}) {
  if (handlers.onInteract) interactHandler = handlers.onInteract;
  if (handlers.onFlashlight) flashlightHandler = handlers.onFlashlight;
}

export function handleKeyDown(e) {
  if (e.repeat) return;
  pressedKeys.add(e.code);

  if (!inputEnabled) return;

  if (KEY_BINDINGS.interact.includes(e.code) && typeof interactHandler === 'function') {
    interactHandler();
  }

  if (KEY_BINDINGS.flashlight.includes(e.code) && typeof flashlightHandler === 'function') {
    flashlightHandler();
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
  virtualAxes = { x: 0, y: 0 };
  virtualSprint = false;
}

export function isInputEnabled() {
  return inputEnabled;
}

export function setVirtualAxes(x, y) {
  virtualAxes.x = x;
  virtualAxes.y = y;
}

export function setVirtualSprint(active) {
  virtualSprint = active;
}

export function triggerInteract() {
  if (inputEnabled && typeof interactHandler === 'function') interactHandler();
}

export function triggerFlashlight() {
  if (inputEnabled && typeof flashlightHandler === 'function') flashlightHandler();
}
