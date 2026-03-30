import settings from '../config/settings.js';

let element = null;

function createCrosshair() {
  element = document.createElement('div');
  const s = element.style;
  s.position = 'fixed';
  s.top = '50%';
  s.left = '50%';
  s.borderRadius = '50%';
  s.transform = 'translate(-50%, -50%)';
  s.pointerEvents = 'none';
  s.display = 'none';
  s.zIndex = '40';
  refreshCrosshair();
  document.body.appendChild(element);
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
}

export { createCrosshair, showCrosshair, hideCrosshair, refreshCrosshair };
