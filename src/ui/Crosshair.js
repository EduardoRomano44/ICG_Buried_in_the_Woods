import settings from '../config/settings.js';

let element = null;

function createCrosshair() {
  element = document.createElement('div');
  const s = element.style;
  s.position      = 'fixed';
  s.top           = '50%';
  s.left          = '50%';
  s.width         = `${settings.crosshairSize}px`;
  s.height        = `${settings.crosshairSize}px`;
  s.backgroundColor = settings.crosshairColor;
  s.borderRadius  = '50%';
  s.transform     = 'translate(-50%, -50%)';
  s.pointerEvents = 'none';
  s.display       = 'none';
  document.body.appendChild(element);
}

function showCrosshair() {
  if (element) element.style.display = 'block';
}

function hideCrosshair() {
  if (element) element.style.display = 'none';
}

export { createCrosshair, showCrosshair, hideCrosshair };
