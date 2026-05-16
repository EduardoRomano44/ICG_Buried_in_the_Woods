import settings from '../../../../config/settings.js';
import { createElementFromHTML } from '../../utils/dom.js';
import { isMobileDevice } from '../../../../utils/isMobile.js';

function createTitleCardPanel(onSettingsChanged, syncSettingsControls) {
  const isMobile = isMobileDevice();
  const element = createElementFromHTML(`
    <section class="title-card" style="display:block;">
      <p class="title-card-prompt">${isMobile ? 'Tap to Start' : 'Press ENTER to Start'}</p>
      <p class="title-card-loading">Loading...</p>
      <div class="title-card-toggles">
        <label class="title-card-toggle">High Quality <input type="checkbox" data-ui="quality" /></label>
        <label class="title-card-toggle">Shadows <input type="checkbox" data-ui="shadows" /></label>
      </div>
    </section>
  `);

  const prompt = element.querySelector('.title-card-prompt');
  const loading = element.querySelector('.title-card-loading');
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

  function setPlainMode(enabled) {
    if (enabled) {
      element.classList.add('is-plain');
    } else {
      element.classList.remove('is-plain');
    }
  }

  function syncControls() {
    qualityInput.checked = !settings.lowQuality;
    shadowInput.checked = settings.shadowsEnabled;
  }

  return {
    element,
    setVisible,
    setLoading,
    setPlainMode,
    syncControls,
  };
}

export { createTitleCardPanel };