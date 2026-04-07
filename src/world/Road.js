/**
 * Road.js — Rua curva com CatmullRom spline
 */
import * as THREE from 'three';
import { scene } from '../core/SceneManager.js';
import {
  ROAD_WIDTH, ROAD_SEGMENTS, ROAD_Y_OFFSET, ROAD_CURVE_POINTS,
  DASH_LENGTH, DASH_GAP, DASH_WIDTH, DASH_COLOR, DASH_Y_OFFSET,
} from '../config/constants.js';

const _up = new THREE.Vector3(0, 1, 0);

// Gera uma geometria plana (ribbon) ao longo de uma curva
function buildRibbonGeometry(curve, width, yOffset) {
  const positions = [], normals = [], uvs = [], indices = [];

  for (let i = 0; i <= ROAD_SEGMENTS; i++) {
    const t       = i / ROAD_SEGMENTS;
    const point   = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const right   = new THREE.Vector3().crossVectors(tangent, _up).normalize();

    positions.push(
      point.x - right.x * width * 0.5, yOffset, point.z - right.z * width * 0.5,
      point.x + right.x * width * 0.5, yOffset, point.z + right.z * width * 0.5,
    );
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, t,  1, t); // UVs normalizados 0–1; repeat controla a repetição

    if (i < ROAD_SEGMENTS) {
      const b = i * 2;
      indices.push(b, b + 2, b + 1,  b + 1, b + 2, b + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2));
  geo.setIndex(indices);
  return geo;
}

// Cria os traços da linha central como UMA ÚNICA geometria fundida.
// — MeshBasicMaterial: cor fixa, sem dependência de normais/iluminação.
// — DoubleSide: visível de qualquer ângulo.
// — Geometria fundida: uma só bounding sphere abrange toda a estrada,
//   por isso o frustum culling nunca descarta traços individuais.
function buildCenterDashes(curve) {
    const mat = new THREE.MeshStandardMaterial({
        color: DASH_COLOR,
        roughness: 0.8,
        metalness: 0.0,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
    });

  const total = curve.getLength();
  const step  = DASH_LENGTH + DASH_GAP;
  const hw    = DASH_WIDTH  * 0.5;
  const hl    = DASH_LENGTH * 0.5;
  const y     = DASH_Y_OFFSET + 0.01; // ligeiramente acima do asfalto

  const positions = [];
  const indices   = [];
  let   vertBase  = 0;

  let dist = DASH_GAP * 0.5;
  while (dist + DASH_LENGTH <= total) {
    const u     = (dist + DASH_LENGTH * 0.5) / total;
    const tMid  = curve.getUtoTmapping(u);
    const point = curve.getPoint(tMid);
    const tang  = curve.getTangent(tMid);
    const cos   = Math.cos(Math.atan2(tang.x, tang.z));
    const sin   = Math.sin(Math.atan2(tang.x, tang.z));

    // 4 vértices do quad plano (largo=DASH_WIDTH, comprido=DASH_LENGTH)
    // Cantos locais: (±hw, 0, ±hl)
    for (const [lx, lz] of [[-hw,-hl],[hw,-hl],[hw,hl],[-hw,hl]]) {
      positions.push(
        point.x + lx * cos + lz * sin,
        y,
        point.z - lx * sin + lz * cos,
      );
    }

    indices.push(
      vertBase,   vertBase+1, vertBase+2,
      vertBase,   vertBase+2, vertBase+3,
    );
    vertBase += 4;
    dist += step;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1; // desenhado depois do asfalto para evitar z-fighting
  scene.add(mesh);
}

function createRoad() {
  const curve = new THREE.CatmullRomCurve3(
    ROAD_CURVE_POINTS.map(p => new THREE.Vector3(p.x, 0.01, p.z))
  );

  // Textura de asfalto — tentar alguns caminhos e atualizar material quando carregar
  const initialMat = new THREE.MeshPhongMaterial({
    color: 0x222222,
    emissive: 0x050505,
    emissiveIntensity: 0.18,
    shininess: 6,
  });
  initialMat.side = THREE.DoubleSide;
  initialMat.polygonOffset = true;
  initialMat.polygonOffsetFactor = -1;

  const road = new THREE.Mesh(
    buildRibbonGeometry(curve, ROAD_WIDTH, ROAD_Y_OFFSET),
    initialMat
  );
  road.receiveShadow = true;
  scene.add(road);

  const texLoader = new THREE.TextureLoader();
  const tryUrls = [
    new URL('../../imgs/asphalt.jpg', import.meta.url).href,
    '/imgs/asphalt.jpg',
    './imgs/asphalt.jpg',
    'imgs/asphalt.jpg',
  ];

  function tryLoad(i = 0) {
    if (i >= tryUrls.length) {
      console.warn('Road: all texture load attempts failed, using solid fallback');
      return;
    }
    const url = tryUrls[i];
    texLoader.load(url,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        tex.repeat.set(1, Math.max(1, Math.round(curve.getLength() / ROAD_WIDTH)));
        console.log('Road texture loaded:', url);
        // apply texture safely: create new material to avoid share issues
        const mat = new THREE.MeshPhongMaterial({
          map: tex,
          color: 0xffffff,
          emissive: 0x050505,
          emissiveIntensity: 0.15,
          shininess: 6,
        });
        mat.side = THREE.DoubleSide;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1;
        road.material.dispose();
        road.material = mat;
      },
      undefined,
      (err) => {
        console.warn('Road texture failed:', url, err);
        tryLoad(i + 1);
      }
    );
  }
  tryLoad(0);
  road.receiveShadow = true;
  scene.add(road);

  buildCenterDashes(curve);
}

export { createRoad };

