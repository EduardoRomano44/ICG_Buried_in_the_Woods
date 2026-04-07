function loadGameUIStyles() {
  if (!document.getElementById('game-ui-font-finger-paint')) {
    const fontLink = document.createElement('link');
    fontLink.id = 'game-ui-font-finger-paint';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Finger+Paint&display=swap';
    document.head.appendChild(fontLink);
  }

  if (document.getElementById('game-ui-style')) return;

  const link = document.createElement('link');
  link.id = 'game-ui-style';
  link.rel = 'stylesheet';
  link.href = new URL('./game-ui.css', import.meta.url).href;
  document.head.appendChild(link);
}

export { loadGameUIStyles };
