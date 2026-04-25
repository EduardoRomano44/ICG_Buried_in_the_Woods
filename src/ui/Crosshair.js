import settings from '../config/settings.js';
import {
  INTERACT_PROMPT_OFFSET_Y,
  INTERACT_PROMPT_FONT_SIZE,
  INTERACT_PROMPT_COLOR,
} from '../config/constants.js';

let element = null;
let interactionElement = null;
let noticeElement = null;
let currentPromptText = '';
let noticeTimer = null;

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

  noticeElement = document.createElement('div');
  const noticeStyle = noticeElement.style;
  noticeStyle.position = 'fixed';
  noticeStyle.left = '50%';
  noticeStyle.top = 'calc(50% + 132px)';
  noticeStyle.transform = 'translateX(-50%)';
  noticeStyle.pointerEvents = 'none';
  noticeStyle.display = 'none';
  noticeStyle.zIndex = '41';
  noticeStyle.fontFamily = 'Finger Paint, system-ui, -apple-system, Segoe UI, sans-serif';
  noticeStyle.fontSize = '18px';
  noticeStyle.fontWeight = '600';
  noticeStyle.letterSpacing = '0.04em';
  noticeStyle.color = '#f3f4ff';
  noticeStyle.textAlign = 'center';
  noticeStyle.textShadow = '0 2px 10px rgba(0, 0, 0, 0.9)';
  noticeStyle.maxWidth = 'min(84vw, 520px)';
  document.body.appendChild(noticeElement);
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
  hideInteractionNotice();
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

function hideInteractionNotice() {
  if (noticeTimer) {
    window.clearTimeout(noticeTimer);
    noticeTimer = null;
  }

  if (!noticeElement) return;
  noticeElement.textContent = '';
  noticeElement.style.display = 'none';
}

function showInteractionNotice(message, durationMs = 3000) {
  if (!noticeElement) return;

  hideInteractionNotice();

  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return;

  noticeElement.textContent = text;
  noticeElement.style.display = 'block';

  const holdTime = Math.max(0, Number(durationMs) || 0);
  noticeTimer = window.setTimeout(() => {
    hideInteractionNotice();
  }, holdTime);
}

export { createCrosshair, showCrosshair, hideCrosshair, refreshCrosshair, setInteractionPrompt, showInteractionNotice };