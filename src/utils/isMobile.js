export function isMobileDevice() {
  return /Mobi|Android/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches;
}
