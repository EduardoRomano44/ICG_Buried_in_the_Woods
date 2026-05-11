import { unregisterInteractable, registerInteractable, getPlayerVitals, healPlayer } from '../../../player/Player.js';
import { showInteractionNotice } from '../../../ui/Crosshair.js';

function registerWorldCookie(model) {
  model.userData.blockedUntil = 0;

  registerInteractable(model, {
    getActionText: () => {
      if (Date.now() < model.userData.blockedUntil) return '';
      return 'EAT';
    },
    isEnabled: () => Date.now() >= model.userData.blockedUntil,
    onInteract: () => eatCookie(model),
  });
}

function eatCookie(model) {
  const { health, maxHealth } = getPlayerVitals();

  if (health >= maxHealth) {
    // Already full health
    model.userData.blockedUntil = Date.now() + 3000;
    showInteractionNotice("I'm already at full health", 3000);
    return false;
  }

  healPlayer(1);

  // Hide and unregister the cookie
  unregisterInteractable(model);
  model.traverse((obj) => {
    if (obj.isMesh) obj.visible = false;
  });
  model.matrixAutoUpdate = false;

  return true;
}

export {
  registerWorldCookie,
  eatCookie,
};
