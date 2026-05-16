import { createElementFromHTML } from '../../utils/dom.js';
import { setVirtualAxes, setVirtualSprint, triggerInteract } from '../../../../player/modules/PlayerInput.js';
import { rotateCamera } from '../../../../player/Player.js';

export function createMobileControlsPanel() {
  const element = createElementFromHTML(`
    <div class="mobile-controls-panel" style="display: none; position: absolute; inset: 0; pointer-events: none; z-index: 50; touch-action: none;">
      <!-- Joystick base -->
      <div class="joystick-base" style="position: absolute; bottom: 40px; left: 40px; width: 120px; height: 120px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; pointer-events: auto;">
        <div class="joystick-stick" style="position: absolute; top: 50%; left: 50%; width: 50px; height: 50px; background: rgba(255,255,255,0.5); border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 4px 10px rgba(0,0,0,0.5);"></div>
      </div>
      <!-- Sprint Toggle Button -->
      <div class="sprint-button" style="position: absolute; bottom: 180px; left: 60px; width: 60px; height: 60px; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.5); border-radius: 50%; pointer-events: auto; display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-weight: bold; font-size: 12px; color: white; transition: background 0.2s;">
        RUN
      </div>
      <!-- Interact Button -->
      <div class="interact-button" style="position: absolute; bottom: 40px; right: 40px; width: 80px; height: 80px; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.5); border-radius: 50%; pointer-events: auto; display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-weight: bold; color: white; display: none;">
        ACT
      </div>
    </div>
  `);

  const joystickBase = element.querySelector('.joystick-base');
  const joystickStick = element.querySelector('.joystick-stick');
  const interactBtn = element.querySelector('.interact-button');
  const sprintBtn = element.querySelector('.sprint-button');

  let activeJoystickTouchId = null;
  const baseRadius = 60;
  
  let lookTouchId = null;
  let lastLookX = 0;
  let lastLookY = 0;
  
  let sprintActive = false;

  function handleJoystickMove(x, y) {
    const dist = Math.sqrt(x*x + y*y);
    const maxDist = baseRadius;
    let stickX = x;
    let stickY = y;
    
    if (dist > maxDist) {
      stickX = (x / dist) * maxDist;
      stickY = (y / dist) * maxDist;
    }
    
    joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
    
    const normX = stickX / maxDist;
    const normY = stickY / maxDist;
    setVirtualAxes(normX, normY);
  }

  function resetJoystick() {
    activeJoystickTouchId = null;
    joystickStick.style.transform = 'translate(-50%, -50%)';
    setVirtualAxes(0, 0);
  }

  joystickBase.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    if (activeJoystickTouchId !== null) return;
    const touch = e.changedTouches[0];
    activeJoystickTouchId = touch.identifier;
    const rect = joystickBase.getBoundingClientRect();
    const x = touch.clientX - (rect.left + rect.width / 2);
    const y = touch.clientY - (rect.top + rect.height / 2);
    handleJoystickMove(x, y);
  }, { passive: false });

  joystickBase.addEventListener('touchmove', (e) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeJoystickTouchId) {
        const rect = joystickBase.getBoundingClientRect();
        const x = touch.clientX - (rect.left + rect.width / 2);
        const y = touch.clientY - (rect.top + rect.height / 2);
        handleJoystickMove(x, y);
        break;
      }
    }
  }, { passive: false });

  joystickBase.addEventListener('touchend', (e) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeJoystickTouchId) {
        resetJoystick();
        break;
      }
    }
  }, { passive: false });

  joystickBase.addEventListener('touchcancel', (e) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeJoystickTouchId) {
        resetJoystick();
        break;
      }
    }
  });

  interactBtn.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    triggerInteract();
    interactBtn.style.background = 'rgba(255,255,255,0.5)';
  });

  interactBtn.addEventListener('touchend', (e) => {
    e.stopPropagation();
    interactBtn.style.background = 'rgba(255,255,255,0.2)';
  });

  sprintBtn.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    sprintActive = !sprintActive;
    setVirtualSprint(sprintActive);
    sprintBtn.style.background = sprintActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)';
    sprintBtn.style.color = sprintActive ? 'black' : 'white';
  });
  
  // Screen touch for looking around
  document.addEventListener('touchstart', (e) => {
    if (element.style.display === 'none') return;
    if (e.target.closest('.mobile-controls-panel') || e.target.closest('.hud')) return;

    if (lookTouchId !== null) return;
    const touch = e.changedTouches[0];
    lookTouchId = touch.identifier;
    lastLookX = touch.clientX;
    lastLookY = touch.clientY;
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (element.style.display === 'none') return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId) {
        const movementX = touch.clientX - lastLookX;
        const movementY = touch.clientY - lastLookY;
        rotateCamera(movementX, movementY);
        lastLookX = touch.clientX;
        lastLookY = touch.clientY;
        break;
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId) {
        lookTouchId = null;
        break;
      }
    }
  }, { passive: false });

  document.addEventListener('touchcancel', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId) {
        lookTouchId = null;
        break;
      }
    }
  });

  function setVisible(visible) {
    element.style.display = visible ? 'block' : 'none';
  }

  function showInteract(visible) {
    interactBtn.style.display = visible ? 'flex' : 'none';
  }

  return {
    element,
    setVisible,
    showInteract,
  };
}
