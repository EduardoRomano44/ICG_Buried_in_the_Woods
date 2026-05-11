// Constant Values, Only changed when testing

// Player
export const PLAYER_HEIGHT = 5;
export const PLAYER_BASE_SPEED = 6;
export const PLAYER_SPRINT_MULTIPLIER = 1.8;
export const PLAYER_COLLISION_RADIUS = 0.5;
export const PLAYER_MAX_HEALTH = 3;
export const PLAYER_MAX_STAMINA = 150;
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

// Ground
export const GROUND_SIZE = 250;
export const GROUND_COLOR = 0x008018;

// Basement door
export const BASEMENT_DOOR_MODEL_PATH = './models/Basement_door.glb';
export const BASEMENT_DOOR_POSITION = { x: -28, y: 0, z: 24 };
export const BASEMENT_DOOR_ROTATION_Y = Math.PI * 0.5;

export const DOOR_METAL_MODEL_PATH = './models/Door-metal.glb';
export const KEY_MODEL_PATH = './models/Key.glb';
export const COOKIE_MODEL_PATH = './models/Cookie.glb';
export const SLIME_MODEL_PATH = './models/Slime.glb';
export const TABLE_MODEL_PATH = './models/Table.glb';

// Cookie
export const COOKIE_SCALE = 0.9;

// Basement mapping
export const BASEMENT_MAPPING_MODEL_PATH = './models/Basement_Mapping2.glb';
export const BASEMENT_MAPPING_SCALE = 1;
export const BASEMENT_WALL1_LOCAL_OFFSET = { x: 0, y: 0, z: 0 };
export const BASEMENT_WALL2_LOCAL_OFFSET = { x: 0, y: 0, z: 0 };
export const BASEMENT_PREVIEW_CAMERA_POSITION = { x: 24, y: 18, z: 24 };
export const BASEMENT_PREVIEW_CAMERA_TARGET = { x: 0, y: 2, z: 0 };
export const BASEMENT_PREVIEW_BACKGROUND_COLOR = 0x05070b;
export const BASEMENT_PREVIEW_FOG_NEAR = 80;
export const BASEMENT_PREVIEW_FOG_FAR = 190;
export const BASEMENT_PREVIEW_SUN_COLOR = 0xfff0d6;
export const BASEMENT_PREVIEW_SUN_INTENSITY = 1.2;
export const BASEMENT_PREVIEW_SUN_POSITION = { x: 32, y: 44, z: 22 };
export const BASEMENT_PREVIEW_FILL_COLOR = 0x88b6ff;
export const BASEMENT_PREVIEW_FILL_INTENSITY = 0.52;
export const BASEMENT_PREVIEW_FILL_POSITION = { x: -26, y: 16, z: -30 };
export const BASEMENT_PREVIEW_SUN_SHADOW_BIAS = -0.00035;
export const BASEMENT_PREVIEW_SUN_SHADOW_NORMAL_BIAS = 0.03;
export const BASEMENT_PREVIEW_SUN_SHADOW_RADIUS = 2;

// Basement environment (in-game)
export const BASEMENT_AMBIENT_COLOR = 0x1a1a2e;
export const BASEMENT_AMBIENT_INTENSITY = 0.08;
export const BASEMENT_FOG_COLOR = 0x020208;
export const BASEMENT_FOG_NEAR = 5;
export const BASEMENT_FOG_FAR = 45;
export const BASEMENT_PLAYER_SPAWN_FALLBACK = { x: 0, y: 5, z: 0 };

// Sky
export const SKY_RADIUS = 1000;
export const SKY_TOP_COLOR = '#1a1e41';
export const SKY_BOTTOM_COLOR = '#212754';

// Moon
export const MOON_RADIUS = 10;
export const MOON_COLOR = 0xffffdd;
export const MOON_OFFSET = { x: 100, y: 50, z: -300 };
export const MOONLIGHT_COLOR = 0x7aa8ff;
export const MOONLIGHT_INTENSITY = 0.2;
export const MOONLIGHT_WORLD_DISTANCE = 800;
export const MOONLIGHT_SHADOW_MAP_SIZE = 1024;
export const MOONLIGHT_SHADOW_CAMERA_MARGIN = 48;
export const MOONLIGHT_SHADOW_BIAS = -0.00045;

// Fog
export const FOG_COLOR = 0x050510;
export const FOG_NEAR = 100;
export const FOG_FAR = 800;

// Barrier
export const WORLD_BARRIER_INSET = 32;
export const WORLD_BARRIER_HEIGHT = 20;
export const WORLD_BARRIER_THICKNESS = 3;
export const WORLD_EXTENDED_GROUND_SCALE = 1.35;
export const WORLD_EXTENDED_GROUND_Y_OFFSET = -0.03;

// Placement persistence (trees + grass)
export const WORLD_POSITIONS_FILE_URL = './src/world/loaders/generated/generated-positions.json';
export const WORLD_POSITIONS_AUTO_IMPORT = true;
export const WORLD_POSITIONS_AUTO_DOWNLOAD_ON_GENERATE = true;
export const WORLD_POSITIONS_DOWNLOAD_FILENAME = 'generated-positions.json';

// Slime enemy
export const SLIME_SCALE = 1.4;
// Slime idle
export const SLIME_IDLE_SPEED = 3;
export const SLIME_IDLE_XZ_AMPLITUDE = 0.3;
export const SLIME_IDLE_Y_AMPLITUDE = 0.3;
export const SLIME_IDLE_TRIGGER_DISTANCE = 4.5;
export const SLIME_MOVE_SPEED = 3.0;
export const SLIME_COLLISION_RADIUS = 0.8;
export const SLIME_COLLISION_HEIGHT = 1.0;
// Slime attack
export const SLIME_ATTACK_DURATION = 1.5;
export const SLIME_ATTACK_BLINK_SPEED = 10;
export const SLIME_ATTACK_HITBOX_RADIUS = 8;
export const SLIME_ATTACK_HITBOX_COLOR = 0xff3030;
export const SLIME_ATTACK_HITBOX_OPACITY = 0.1;
export const SLIME_ATTACK_DAMAGE = 1;
export const SLIME_ATTACK_EYE_SQUINT_SCALE = 0.7;
export const SLIME_ATTACK_SCALE_MIN = 0.7;
export const SLIME_ATTACK_SCALE_MAX = 1.3;
// Slime particles
export const SLIME_EXPLODE_PARTICLE_COUNT = 28;
export const SLIME_EXPLODE_PARTICLE_COLOR = '#fa05fa';
export const SLIME_EXPLODE_PARTICLE_SIZE = 0.25;
export const SLIME_EXPLODE_PARTICLE_OPACITY = 0.95;
export const SLIME_EXPLODE_PARTICLE_SPEED_MIN = 4;
export const SLIME_EXPLODE_PARTICLE_SPEED_MAX = 15;
export const SLIME_EXPLODE_PARTICLE_LIFETIME = 1.65;
export const SLIME_EXPLODE_PARTICLE_GRAVITY = 10;
export const SLIME_EXPLODE_PARTICLE_DRAG = 0.05;
// Slime respawn
export const SLIME_RESPAWN_ENABLED = true;
export const SLIME_RESPAWN_DELAY = 15;

// Ambient Light
export const AMBIENT_LIGHT_COLOR = 0x505050;
export const AMBIENT_LIGHT_INTENSITY = 0.12;

// Object Interaction
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

// Shadows Settings
export const SHADOW_RADIUS = 2;
export const SHADOW_MAP_SIZE = 2048;
export const SHADOW_BIAS = -0.0005;
export const SHADOW_NORMAL_BIAS = 0.03;
export const SHADOW_CAMERA_NEAR = 1.7;
export const SHADOW_CAMERA_FAR = LAMP_LIGHT_DISTANCE;

// Shadow optimization
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

// Flashlight
export const FLASHLIGHT_SCALE = 0.2;
export const FLASHLIGHT_COLOR = 0xffffff;
export const FLASHLIGHT_INTENSITY = 110;
// Flashlight Spotlight
export const FLASHLIGHT_SPOT_DISTANCE = 80;
export const FLASHLIGHT_SPOT_POSITION = { x: 0, y: 1, z: -2.4 };
export const FLASHLIGHT_SPOT_ROTATION = { x: -0.18, y: 0, z: 0 };
export const FLASHLIGHT_SPOT_SCALE_Z = 0.583;
export const FLASHLIGHT_SPOT_RADIUS = 0.2;
export const FLASHLIGHT_SPOT_BEAM_RADIUS = 33;
export const FLASHLIGHT_SPOT_BEAM_BLEND = 0.7;
// Flashlight Point Light
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
export const ROAD_POSITION = { x: 70, y: 0.005, z: -15 };
export const ROAD_SCALE = { x: 4, y: 1, z: 4 };
export const ROAD_ROTATION = { x: 0, y: -1.1, z: 0 };
export const ROAD_ALIGN_TO_GROUND = true;

// Grass
export const GRASS_SEGMENTS = 3;
export const GRASS_COUNT = 2000;
export const GRASS_PATCH_SIZE = 3;
export const GRASS_BLADE_WIDTH = 0.18;
export const GRASS_BLADE_HEIGHT = 0.7;
export const GRASS_SPREAD = 0.4;
export const GRASS_COLOR_BASE = 0x2d6a1f;
export const GRASS_COLOR_TIP = 0x7ec850;
export const GRASS_EXCLUSION_RADIUS = 2.5;
export const GRASS_BLOCKER_RAY_HEIGHT = 150;

// Wind: For Grass animation
export const WIND_STRENGH = 7.0;
export const WIND_SPEED = 2;

// Camera
export const INITIAL_CAMERA_POSITION = { x: 80, y: 5, z: 7 };
export const INITIAL_CAMERA_ROTATION_Y = Math.PI / 2;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 1000;
export const CAMERA_NORMAL_FOV = 75;
export const CAMERA_SPRINT_FOV = 90;
export const CAMERA_FOV_LERP_SPEED = 8;

// Bench
export const BENCH_SCALE = 1.2;

// Table
export const TABLE_SCALE = 0.75;

// Trees
export const TREE_COUNT = 80;
export const TREE_PLACEMENT_ATTEMPTS = 30;
export const TREE_WORLD_MARGIN = 2;
export const TREE_EXCLUSION_RADIUS = 10;

// Audio
export const TITLE_CARD_AUDIO_VOLUME = 0.65;
export const SLIME_EXPLODE_AUDIO_VOLUME = 0.45;
export const SLIME_IDLE_AUDIO_VOLUME = 0.4;
export const SLIME_IDLE_AUDIO_REF_DISTANCE = 6;
export const SLIME_IDLE_AUDIO_MAX_DISTANCE = 45;
export const SLIME_EXPLODE_AUDIO_REF_DISTANCE = 6;
export const SLIME_EXPLODE_AUDIO_MAX_DISTANCE = 45;
export const FOREST_AUDIO_VOLUME = 1;
export const FLASHLIGHT_TOGGLE_AUDIO_VOLUME = 0.55;
export const WALK_WOODS_AUDIO_VOLUME = 0.4;
export const WALK_BASEMENT_AUDIO_VOLUME = 0.3;
export const WALK_AUDIO_SPRINT_PLAYBACK_RATE = 2;
