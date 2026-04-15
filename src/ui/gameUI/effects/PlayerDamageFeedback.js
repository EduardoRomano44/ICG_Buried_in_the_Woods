let flashElement = null;

function ensureFlashElement() {
  if (flashElement) return flashElement;

  flashElement = document.createElement('div');
  flashElement.className = 'player-damage-flash';
  document.body.appendChild(flashElement);
  return flashElement;
}

function triggerPlayerDamageFlash() {
  const element = ensureFlashElement();

  element.classList.remove('active');
  // Force reflow so quick consecutive hits replay the animation.
  void element.offsetWidth;
  element.classList.add('active');
}

export { triggerPlayerDamageFlash };