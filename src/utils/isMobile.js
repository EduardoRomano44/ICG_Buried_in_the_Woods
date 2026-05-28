export function isMobileDevice() {
  // Checks if the user is on mobile
  return /Mobi|Android/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches;
}
