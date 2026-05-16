import {
  PLAYER_MAX_HEALTH,
  PLAYER_MAX_STAMINA,
  PLAYER_STAMINA_DRAIN_PER_SEC,
  PLAYER_STAMINA_RECOVERY_PER_SEC,
  PLAYER_STAMINA_RECOVERY_DELAY,
} from '../../config/constants.js';
import { triggerPlayerDamageFlash } from '../../ui/gameUI/effects/PlayerDamageFeedback.js';

let health = PLAYER_MAX_HEALTH;
let stamina = PLAYER_MAX_STAMINA;
let staminaRecoveryTimer = PLAYER_STAMINA_RECOVERY_DELAY;

export function damagePlayer(amount = 1, onDamage) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (safeAmount <= 0 || health <= 0) return;

  const nextHealth = Math.max(0, health - safeAmount);
  if (nextHealth < health) {
    triggerPlayerDamageFlash();
    if (typeof onDamage === 'function') onDamage();
  }

  health = nextHealth;
}

export function healPlayer(amount = 1) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (safeAmount <= 0 || health <= 0) return;

  health = Math.min(PLAYER_MAX_HEALTH, health + safeAmount);
}

export function updateStamina(isSprinting, delta) {
  if (isSprinting) {
    stamina = Math.max(0, stamina - PLAYER_STAMINA_DRAIN_PER_SEC * delta);
    staminaRecoveryTimer = 0;
  } else {
    staminaRecoveryTimer += delta;
    if (staminaRecoveryTimer >= PLAYER_STAMINA_RECOVERY_DELAY) {
      stamina = Math.min(PLAYER_MAX_STAMINA, stamina + PLAYER_STAMINA_RECOVERY_PER_SEC * delta);
      staminaRecoveryTimer = PLAYER_STAMINA_RECOVERY_DELAY;
    }
  }
}

export function getPlayerVitals(isSprintActive) {
  return {
    health,
    maxHealth: PLAYER_MAX_HEALTH,
    stamina,
    maxStamina: PLAYER_MAX_STAMINA,
    isSprinting: isSprintActive,
  };
}

export function resetStats() {
  health = PLAYER_MAX_HEALTH;
  stamina = PLAYER_MAX_STAMINA;
  staminaRecoveryTimer = PLAYER_STAMINA_RECOVERY_DELAY;
}

export function canSprint() {
  return stamina > 0;
}

export function getHealth() {
  return health;
}
