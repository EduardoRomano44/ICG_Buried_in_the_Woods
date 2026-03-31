import { createElementFromHTML } from '../../utils/dom.js';

function createEyeCloseEffect() {
  const element = createElementFromHTML(`
    <div class="eye-close-effect">
      <div class="eye-lid eye-lid-top"></div>
      <div class="eye-lid eye-lid-bottom"></div>
    </div>
  `);

  let running = null;

  function reset() {
    element.classList.remove('active');
  }

  function play(durationMs = 900) {
    if (running) return running;

    element.style.setProperty('--eye-close-duration', `${durationMs}ms`);
    element.classList.remove('active');
    void element.offsetWidth;
    element.classList.add('active');

    running = new Promise((resolve) => {
      setTimeout(() => {
        resolve();
        running = null;
      }, durationMs);
    });

    return running;
  }

  return {
    element,
    play,
    reset,
  };
}

export { createEyeCloseEffect };
