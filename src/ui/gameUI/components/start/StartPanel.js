import settings from '../../../../config/settings.js';
import { createElementFromHTML } from '../../utils/dom.js';

function createStartPanel(onSettingsChanged, syncSettingsControls) {
  const element = createElementFromHTML(`
    <section class="start-screen" style="display:block;">
      <h1 class="start-title">Buried In The Woods</h1>
      <p class="start-prompt">Press ENTER to Start</p>
      <p class="start-loading">Loading...</p>
      <div class="start-toggles">
        <label class="start-toggle">High Quality <input type="checkbox" data-ui="quality" /></label>
        <label class="start-toggle">Shadows <input type="checkbox" data-ui="shadows" /></label>
      </div>
    </section>
  `);

  const prompt = element.querySelector('.start-prompt');
  const loading = element.querySelector('.start-loading');
  const qualityInput = element.querySelector('[data-ui="quality"]');
  const shadowInput = element.querySelector('[data-ui="shadows"]');

  qualityInput.checked = !settings.lowQuality;
  shadowInput.checked = settings.shadowsEnabled;

  qualityInput.addEventListener('change', () => {
    settings.lowQuality = !qualityInput.checked;
    syncSettingsControls();
    onSettingsChanged();
  });

  shadowInput.addEventListener('change', () => {
    settings.shadowsEnabled = shadowInput.checked;
    syncSettingsControls();
    onSettingsChanged();
  });

  function setVisible(visible) {
    element.style.display = visible ? 'block' : 'none';
  }

  function setLoading(visible, label = 'Loading...') {
    loading.style.display = visible ? 'block' : 'none';
    loading.textContent = label;
    prompt.style.display = visible ? 'none' : 'block';
  }

  function syncControls() {
    qualityInput.checked = !settings.lowQuality;
    shadowInput.checked = settings.shadowsEnabled;
  }

  return {
    element,
    setVisible,
    setLoading,
    syncControls,
  };
}

export { createStartPanel };
