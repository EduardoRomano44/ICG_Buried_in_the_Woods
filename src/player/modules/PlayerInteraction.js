import * as THREE from 'three';
import { INTERACT_MAX_DISTANCE } from '../../config/constants.js';
import { setInteractionPrompt } from '../../ui/Crosshair.js';

const interactables = [];
let currentInteractable = null;
const interactionRaycaster = new THREE.Raycaster();
const interactionCenter = new THREE.Vector2(0, 0);

// Some models can be interacted with when the player looks at them

export function registerInteractable(obj, options = {}) {
  if (!obj) return;

  const actionText = typeof options.actionText === 'string'
    ? options.actionText.trim()
    : '';

  interactables.push({
    obj,
    actionText: actionText || 'Use',
    getActionText: typeof options.getActionText === 'function' ? options.getActionText : null,
    isEnabled: typeof options.isEnabled === 'function' ? options.isEnabled : null,
    onInteract: typeof options.onInteract === 'function' ? options.onInteract : null,
  });
}

export function unregisterInteractable(obj) {
  const index = interactables.findIndex((interactable) => interactable.obj === obj);
  if (index >= 0) {
    interactables.splice(index, 1);
  }
  if (currentInteractable && currentInteractable.obj === obj) {
    currentInteractable = null;
    setInteractionPrompt(null);
  }
}

export function clearAllInteractables() {
  interactables.length = 0;
  currentInteractable = null;
  setInteractionPrompt(null);
}

function findInteractableEntryForObject(object) {
  let current = object;
  while (current) {
    const found = interactables.find((entry) => entry.obj === current);
    if (found) return found;
    current = current.parent;
  }
  return null;
}

function getInteractableActionText(entry) {
  if (!entry) return '';

  if (typeof entry.getActionText === 'function') {
    const dynamicText = entry.getActionText();
    return typeof dynamicText === 'string' ? dynamicText.trim() : '';
  }

  return typeof entry.actionText === 'string' ? entry.actionText.trim() : '';
}

export function updateInteractionTarget(camera) {
  // Cleanup stale interactables
  for (let i = interactables.length - 1; i >= 0; i--) {
    if (!interactables[i].obj || !interactables[i].obj.parent) {
      interactables.splice(i, 1);
    }
  }

  if (!interactables.length) {
    currentInteractable = null;
    setInteractionPrompt(null);
    return;
  }

  interactionRaycaster.setFromCamera(interactionCenter, camera);
  const hits = interactionRaycaster.intersectObjects(interactables.map((entry) => entry.obj), true);

  let candidate = null;
  for (const hit of hits) {
    if (hit.distance > INTERACT_MAX_DISTANCE) continue;
    const found = findInteractableEntryForObject(hit.object);
    if (!found) continue;
    if (typeof found.isEnabled === 'function' && !found.isEnabled()) continue;

    const actionText = getInteractableActionText(found);
    if (!actionText) continue;

    candidate = found;
    break;
  }

  currentInteractable = candidate;
  setInteractionPrompt(candidate ? getInteractableActionText(candidate) : null);
}

export function tryInteractCurrentTarget() {
  if (!currentInteractable || typeof currentInteractable.onInteract !== 'function') return false;
  if (typeof currentInteractable.isEnabled === 'function' && !currentInteractable.isEnabled()) return false;
  currentInteractable.onInteract();
  return true;
}
