import settings from '../config/settings.js';
import {
  TITLE_CARD_AUDIO_VOLUME,
  SLIME_EXPLODE_AUDIO_VOLUME,
  SLIME_IDLE_AUDIO_VOLUME,
  SLIME_IDLE_AUDIO_REF_DISTANCE,
  SLIME_IDLE_AUDIO_MAX_DISTANCE,
  SLIME_EXPLODE_AUDIO_REF_DISTANCE,
  SLIME_EXPLODE_AUDIO_MAX_DISTANCE,
  FOREST_AUDIO_VOLUME,
} from '../config/constants.js';

const tracks = {
  titleCard: createTrack('titleCard.mp3', TITLE_CARD_AUDIO_VOLUME, true),
  slimeExplode: createTrack('slimeExplode.mp3', SLIME_EXPLODE_AUDIO_VOLUME, false),
  slimeIdle: createTrack('slimeIdle.mp3', SLIME_IDLE_AUDIO_VOLUME, true),
  forest: createTrack('forest.mp3', FOREST_AUDIO_VOLUME, true),
};

const state = {
  unlocked: false,
  titleCardActive: true,
  slimeIdleActive: false,
  slimeIdleDistance: Infinity,
  forestActive: false,
  initialVolumeApplied: false,
};

let unlockListenerInstalled = false;

function createTrack(fileName, baseVolume, loop) {
  const audio = new Audio(new URL(`../../audio/${fileName}`, import.meta.url).href);
  audio.preload = 'auto';
  audio.loop = loop;
  audio.volume = 0;

  return {
    audio,
    baseVolume,
    loop,
  };
}

function clampVolume(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function distanceGain(distance, refDistance, maxDistance) {
  if (!Number.isFinite(distance)) return 0;
  if (distance <= refDistance) return 1;
  if (distance >= maxDistance) return 0;

  const t = (distance - refDistance) / Math.max(0.0001, maxDistance - refDistance);
  return 1 - Math.sqrt(t);
}

function getGlobalVolume() {
  return clampVolume(settings.audioVolume ?? 1);
}

function getSlimeIdleVolume() {
  return clampVolume(
    getGlobalVolume()
      * SLIME_IDLE_AUDIO_VOLUME
      * distanceGain(state.slimeIdleDistance, SLIME_IDLE_AUDIO_REF_DISTANCE, SLIME_IDLE_AUDIO_MAX_DISTANCE)
  );
}

function applyVolumes() {
  const globalVolume = getGlobalVolume();
  for (const track of Object.values(tracks)) {
    track.audio.volume = clampVolume(globalVolume * track.baseVolume);
  }

  tracks.slimeIdle.audio.volume = getSlimeIdleVolume();
}

function tryPlay(track) {
  const playResult = track.audio.play();
  if (playResult && typeof playResult.catch === 'function') {
    playResult.catch(() => {});
  }
}

function setTrackActive(trackName, active) {
  const track = tracks[trackName];
  if (!track) return;

  const stateKey = `${trackName}Active`;
  state[stateKey] = active;

  if (!state.unlocked) {
    if (!active) {
      track.audio.pause();
      track.audio.currentTime = 0;
    }
    return;
  }

  if (active) {
    if (track.audio.paused) {
      track.audio.currentTime = 0;
      tryPlay(track);
    }
  } else {
    track.audio.pause();
    track.audio.currentTime = 0;
  }
}

function refreshPlayback() {
  setTrackActive('titleCard', state.titleCardActive);
  setTrackActive('slimeIdle', state.slimeIdleActive);
  setTrackActive('forest', state.forestActive);
}

function unlockGameAudioPlayback() {
  if (state.unlocked) return;
  state.unlocked = true;
  refreshPlayback();
}

function installUnlockListeners() {
  if (unlockListenerInstalled) return;
  unlockListenerInstalled = true;

  const unlock = () => {
    unlockGameAudioPlayback();
  };

  document.addEventListener('pointerdown', unlock, { once: true, passive: true });
  document.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
}

function ensureAudioInitialized() {
  if (!state.initialVolumeApplied) {
    applyVolumes();
    state.initialVolumeApplied = true;
  }

  installUnlockListeners();
  refreshPlayback();
}

function setGlobalAudioVolume(volume) {
  settings.audioVolume = clampVolume(volume);
  applyVolumes();
}

function setTitleCardAudioActive(active) {
  ensureAudioInitialized();
  setTrackActive('titleCard', active);
}

function setForestAudioActive(active) {
  ensureAudioInitialized();
  setTrackActive('forest', active);
}

function setSlimeIdleAudioActive(active) {
  ensureAudioInitialized();
  setTrackActive('slimeIdle', active);
  tracks.slimeIdle.audio.volume = getSlimeIdleVolume();
}

function setSlimeIdleAudioDistance(distance) {
  state.slimeIdleDistance = Number.isFinite(distance) ? Math.max(0, distance) : Infinity;
  tracks.slimeIdle.audio.volume = getSlimeIdleVolume();
}

function playSlimeExplodeAudio(distance = 0) {
  ensureAudioInitialized();
  const track = tracks.slimeExplode;
  const gain = distanceGain(distance, SLIME_EXPLODE_AUDIO_REF_DISTANCE, SLIME_EXPLODE_AUDIO_MAX_DISTANCE);
  track.audio.volume = clampVolume(getGlobalVolume() * SLIME_EXPLODE_AUDIO_VOLUME * gain);
  track.audio.currentTime = 0;
  tryPlay(track);
}

function startGameAudio() {
  ensureAudioInitialized();
  setTitleCardAudioActive(false);
  setForestAudioActive(true);
}

function stopGameAudio() {
  ensureAudioInitialized();
  setForestAudioActive(false);
  setSlimeIdleAudioActive(false);
  setSlimeIdleAudioDistance(Infinity);
}

ensureAudioInitialized();

export {
  setGlobalAudioVolume,
  setTitleCardAudioActive,
  setForestAudioActive,
  setSlimeIdleAudioActive,
  setSlimeIdleAudioDistance,
  playSlimeExplodeAudio,
  unlockGameAudioPlayback,
  startGameAudio,
  stopGameAudio,
};
