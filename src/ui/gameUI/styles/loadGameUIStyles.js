function loadGameUIStyles() {
  if (document.getElementById('game-ui-style')) return;

  const link = document.createElement('link');
  link.id = 'game-ui-style';
  link.rel = 'stylesheet';
  link.href = new URL('./game-ui.css', import.meta.url).href;
  document.head.appendChild(link);
}

export { loadGameUIStyles };
