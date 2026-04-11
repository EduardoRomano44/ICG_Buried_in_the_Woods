// Valores FIXOS do jogo. Não são alteráveis pelo jogador.

// Player
export const PLAYER_HEIGHT = 5;
export const PLAYER_BASE_SPEED = 6;
export const PLAYER_SPRINT_MULTIPLIER = 1.8;
export const PLAYER_COLLISION_RADIUS = 0.5;
export const PLAYER_MAX_HEALTH = 3;
export const PLAYER_MAX_STAMINA = 100;
export const PLAYER_STAMINA_DRAIN_PER_SEC = 30;
export const PLAYER_STAMINA_RECOVERY_PER_SEC = 24;
export const PLAYER_STAMINA_RECOVERY_DELAY = 1.2;
export const PLAYER_DAMAGE_SHAKE_DURATION = 0.6;
export const PLAYER_DAMAGE_SHAKE_INTENSITY = 0.4;

// Physics
export const GRAVITY = 20;

// Head Bob
export const HEAD_BOB_SPEED_WALK = 7;
export const HEAD_BOB_SPEED_SPRINT = 12;
export const HEAD_BOB_AMOUNT_WALK = 0.3;
export const HEAD_BOB_AMOUNT_SPRINT = 0.6;

// World
export const GROUND_SIZE = 350;
export const GROUND_COLOR = 0x008018;

export const SKY_RADIUS = 1000;
export const SKY_TOP_COLOR = '#1a1e41';
export const SKY_BOTTOM_COLOR = '#212754';

export const MOON_RADIUS = 10;
export const MOON_COLOR = 0xffffdd;
export const MOON_OFFSET = { x: 100, y: 50, z: -300 };
export const MOONLIGHT_COLOR = 0x7aa8ff;
export const MOONLIGHT_INTENSITY = 0.2;
export const MOONLIGHT_WORLD_DISTANCE = 520;
export const MOONLIGHT_SHADOW_MAP_SIZE = 2048;
export const MOONLIGHT_SHADOW_CAMERA_MARGIN = 48;
export const MOONLIGHT_SHADOW_BIAS = -0.00045;

export const FOG_COLOR = 0x050510;
export const FOG_NEAR = 100;
export const FOG_FAR = 800;
export const WORLD_BARRIER_INSET = 32;
export const WORLD_BARRIER_HEIGHT = 20;
export const WORLD_BARRIER_THICKNESS = 3;
export const WORLD_EXTENDED_GROUND_SCALE = 1.35;
export const WORLD_EXTENDED_GROUND_Y_OFFSET = -0.03;

// Slime enemy
export const SLIME_SCALE = 1.4;
export const SLIME_IDLE_SPEED = 2;
export const SLIME_IDLE_XZ_AMPLITUDE = 0.2;
export const SLIME_IDLE_Y_AMPLITUDE  = 0.2;
export const SLIME_IDLE_TRIGGER_DISTANCE = 4.5;
export const SLIME_ATTACK_DURATION = 1.5;
export const SLIME_ATTACK_BLINK_SPEED = 5;
export const SLIME_ATTACK_HITBOX_RADIUS = 8;
export const SLIME_ATTACK_HITBOX_COLOR = 0xff3030;
export const SLIME_ATTACK_HITBOX_OPACITY = 0.1;
export const SLIME_ATTACK_DAMAGE = 1;
export const SLIME_ATTACK_EYE_SQUINT_SCALE = 0.7;
export const SLIME_ATTACK_SCALE_MIN = 0.925;
export const SLIME_ATTACK_SCALE_MAX = 1.075;

// Debug
export const DEBUG_SLIME_RESPAWN_ENABLED = true;
export const DEBUG_SLIME_RESPAWN_DELAY = 5;

// Lighting
export const AMBIENT_LIGHT_COLOR = 0x505050;
export const AMBIENT_LIGHT_INTENSITY = 0.12;

// Interaction
export const INTERACT_MAX_DISTANCE = 5.5;
export const INTERACT_PROMPT_OFFSET_Y = 100;
export const INTERACT_PROMPT_FONT_SIZE = 20;
export const INTERACT_PROMPT_COLOR = '#ffffff';

// Lamp
export const LAMP_SCALE = 0.6;
export const LAMP_LIGHT_COLOR = '#f7da63';
export const LAMP_LIGHT_INTENSITY = 600;
export const LAMP_LIGHT_DISTANCE = 80;
export const LAMP_LIGHT_POSITION = { x: -0.008793, y: 14.0006, z: 0.00729 };
export const LAMP_SHADOW_RADIUS = 8;
export const LAMP_SHADOW_MAP_SIZE = 900;
export const LAMP_SHADOW_BIAS = -0.012;
export const LAMP_SHADOW_CAMERA_NEAR = 1.6;
export const LAMP_SHADOW_CAMERA_FAR = LAMP_LIGHT_DISTANCE;

// Shadow optimization
export const SHADOW_UPDATE_INTERVAL_FRAMES = 3;

export const SHADOW_LIGHT_NEAR_DISTANCE = 60;
export const SHADOW_LIGHT_FAR_DISTANCE = 170;
export const SHADOW_LIGHT_MAP_SCALE_NEAR = 1;
export const SHADOW_LIGHT_MAP_SCALE_MEDIUM = 0.65;
export const SHADOW_LIGHT_MAP_SCALE_FAR = 0.38;
export const SHADOW_LIGHT_RADIUS_SCALE_NEAR = 1;
export const SHADOW_LIGHT_RADIUS_SCALE_MEDIUM = 1.35;
export const SHADOW_LIGHT_RADIUS_SCALE_FAR = 1.85;

export const SHADOW_OBJECT_NEAR_DISTANCE = 70;
export const SHADOW_OBJECT_FAR_DISTANCE = 180;
export const SHADOW_OBJECT_SIMPLIFIED_MESH_THRESHOLD = 0.42;
export const SHADOW_DYNAMIC_POSITION_EPSILON = 0.025;

// Flashlight
export const FLASHLIGHT_SCALE = 0.2;
export const FLASHLIGHT_COLOR = 0xffffff;
export const FLASHLIGHT_INTENSITY = 110;
export const FLASHLIGHT_SPOT_DISTANCE = 140;
export const FLASHLIGHT_SPOT_POSITION = { x: 0, y: 1, z: -2.5 };
export const FLASHLIGHT_SPOT_ROTATION = { x: 0, y: 0, z: 0 };
export const FLASHLIGHT_SPOT_SCALE_Z = 0.583;
export const FLASHLIGHT_SPOT_RADIUS = 0.2;
export const FLASHLIGHT_SPOT_ROTATION_X = 90;
export const FLASHLIGHT_SPOT_BEAM_RADIUS = 33;
export const FLASHLIGHT_SPOT_BEAM_BLEND = 0.7;
export const FLASHLIGHT_INTERNAL_COLOR = 0xffffff;
export const FLASHLIGHT_INTERNAL_INTENSITY = 5;
export const FLASHLIGHT_INTERNAL_DISTANCE = 0.24;
export const FLASHLIGHT_INTERNAL_POSITION = { x: 0, y: 1, z: 0 };

// Fireflies
export const FIREFLY_COUNT = 4;
export const FIREFLY_COLOUR = 0xffff66;
export const FIREFLY_OPACITY = 0.8;

// Road
export const ROAD_MODEL_PATH = './models/Road.glb';
export const ROAD_POSITION = { x: 105, y: 0.005, z: 5 };
export const ROAD_SCALE = { x: 4, y: 1, z: 4 };
export const ROAD_ROTATION = { x: 0, y: -1.1, z: 0 };
export const ROAD_ALIGN_TO_GROUND = true;

// Grass
export const GRASS_SEGMENTS = 3;
export const GRASS_COUNT = 1500;        // number of grass patches
export const GRASS_PATCH_SIZE = 3;     // blades per patch
export const GRASS_BLADE_WIDTH = 0.18; // base width of each blade
export const GRASS_BLADE_HEIGHT = 0.7; // height of each blade
export const GRASS_SPREAD = 0.4;       // random XZ spread within a patch
export const GRASS_COLOR_BASE = 0x2d6a1f;
export const GRASS_COLOR_TIP  = 0x7ec850;
export const GRASS_EXCLUSION_RADIUS = 2.5; // min distance from other objects
export const GRASS_BLOCKER_RAY_HEIGHT = 150;

// Wind
export const WIND_STRENGH = 7.0;
export const WIND_SPEED = 2;

// Camera
export const INITIAL_CAMERA_POSITION = { x: 120, y: 5, z: 25 };
export const INITIAL_CAMERA_ROTATION_Y = Math.PI / 2;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 1000;
export const CAMERA_NORMAL_FOV = 75;
export const CAMERA_SPRINT_FOV = 90;
export const CAMERA_FOV_LERP_SPEED = 8;

// Bench
export const BENCH_SCALE = 1.2;

// Trees
export const TREE_COUNT = 150;
export const TREE_PLACEMENT_ATTEMPTS = 30;
export const TREE_WORLD_MARGIN = 2;
export const TREE_EXCLUSION_RADIUS = 10;

// Audio
export const TITLE_CARD_AUDIO_VOLUME = 0.65;
export const SLIME_EXPLODE_AUDIO_VOLUME = 0.7;
export const SLIME_IDLE_AUDIO_VOLUME = 0.4;
export const SLIME_IDLE_AUDIO_REF_DISTANCE = 6;
export const SLIME_IDLE_AUDIO_MAX_DISTANCE = 45;
export const SLIME_EXPLODE_AUDIO_REF_DISTANCE = 6;
export const SLIME_EXPLODE_AUDIO_MAX_DISTANCE = 45;
export const FOREST_AUDIO_VOLUME = 1;
