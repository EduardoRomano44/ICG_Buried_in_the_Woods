import settings from '../config/settings.js';
import {
  INTERACT_PROMPT_OFFSET_Y,
  INTERACT_PROMPT_FONT_SIZE,
  INTERACT_PROMPT_COLOR,
} from '../config/constants.js';

let element = null;
let interactionElement = null;
let currentPromptText = '';

function createCrosshair() {
  element = document.createElement('div');
  const s = element.style;
  s.position = 'fixed';
  s.top = '50%';
  s.left = '50%';
  s.borderRadius = '50%';
  s.opacity = '80%';
  s.transform = 'translate(-50%, -50%)';
  s.pointerEvents = 'none';
  s.display = 'none';
  s.zIndex = '40';
  refreshCrosshair();
  document.body.appendChild(element);

  interactionElement = document.createElement('div');
  const promptStyle = interactionElement.style;
  promptStyle.position = 'fixed';
  promptStyle.top = '50%';
  promptStyle.left = '50%';
  promptStyle.transform = `translate(-50%, calc(-50% + ${INTERACT_PROMPT_OFFSET_Y}px))`;
  promptStyle.pointerEvents = 'none';
  promptStyle.display = 'none';
  promptStyle.zIndex = '40';
  promptStyle.fontFamily = 'Finger Paint, system-ui, -apple-system, Segoe UI, sans-serif';
  promptStyle.fontSize = `${INTERACT_PROMPT_FONT_SIZE}px`;
  promptStyle.fontWeight = '600';
  promptStyle.letterSpacing = '0.04em';
  promptStyle.color = INTERACT_PROMPT_COLOR;
  promptStyle.textShadow = '0 2px 8px rgba(0, 0, 0, 0.85)';
  document.body.appendChild(interactionElement);
}

function refreshCrosshair() {
  if (!element) return;
  element.style.width = `${settings.crosshairSize}px`;
  element.style.height = `${settings.crosshairSize}px`;
  element.style.backgroundColor = settings.crosshairColor;
}

function showCrosshair() {
  if (element) element.style.display = 'block';
}

function hideCrosshair() {
  if (element) element.style.display = 'none';
  setInteractionPrompt(null);
}

function setInteractionPrompt(actionLabel) {
  if (!interactionElement) return;

  const nextPromptText = actionLabel ? `Press E to ${actionLabel}` : '';
  if (nextPromptText === currentPromptText) return;

  currentPromptText = nextPromptText;

  if (!actionLabel) {
    interactionElement.style.display = 'none';
    interactionElement.textContent = '';
    return;
  }

  interactionElement.textContent = nextPromptText;
  interactionElement.style.display = 'block';
}

export { createCrosshair, showCrosshair, hideCrosshair, refreshCrosshair, setInteractionPrompt };