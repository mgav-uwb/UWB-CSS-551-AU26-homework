// scene.js: the spiral-pass scene in three.js. pass.js computes every matrix; this file builds the meshes,
// then, once per frame, copies those matrices onto them (matrixAutoUpdate = false: three.js does not
// rebuild them from position, quaternion and scale). Keys: 1 to 9 pick a shot camera, B the ball it
// watches, G the gravity, Space pauses, R restarts.
// The same scene, step for step, is PassScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
import {
  settings, GRAVITY, FIELD, CART, TargetPlan, thrownBall, restingBall, spinningTop,
  fieldPlacement, cameraPlacement, CAMERA_MODES,
} from './pass.js';

// #region Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2d33, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(-30, 60, 20);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 500);
camera.matrixAutoUpdate = false;

const LENS = { tripod: 50, pan: 4, sideline: 12, chase: 50, skycam: 12, ballCam: 60, spinCam: 60, receiver: 20, orbit: 40 };
// #endregion

// #region The field: a coordinate box whose near walls are culled
/** a texture with one grid cell: dark fill, a light border. Repeated once per 10 m. */
function gridTexture(fill, line) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** one wall: a plane facing INTO the box. Planes are drawn from the front only, so a wall between the
 *  camera and the box shows its back and is culled, and the far walls stay in view. */
function addWall(parent, width, height, placement, fill, line) {
  const texture = gridTexture(fill, line);
  texture.repeat.set(width / 10, height / 10);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
  wall.matrixAutoUpdate = false;
  wall.matrix.copy(placement);
  parent.add(wall);
}

const field = new THREE.Group();          // everything in field coordinates hangs here; its matrix is F
field.matrixAutoUpdate = false;
scene.add(field);

function at(x, y, z) { return new THREE.Matrix4().makeTranslation(x, y, z); }
function turnX(degrees) { return new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(degrees)); }
function turnY(degrees) { return new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(degrees)); }

function buildBox() {
  const W = FIELD.width, H = FIELD.height, L = FIELD.length;
  const grass = '#173a24', grassLine = '#4f7a5c', wall = '#141a26', wallLine = '#3d4c6b';
  addWall(field, W, L, at(W / 2, 0, L / 2).multiply(turnX(-90)), grass, grassLine);  // floor, facing +y
  addWall(field, W, L, at(W / 2, H, L / 2).multiply(turnX(90)), wall, wallLine);     // ceiling, facing -y
  addWall(field, L, H, at(0, H / 2, L / 2).multiply(turnY(90)), wall, wallLine);     // x = 0, facing +x
  addWall(field, L, H, at(W, H / 2, L / 2).multiply(turnY(-90)), wall, wallLine);    // x = W, facing -x
  addWall(field, W, H, at(W / 2, H / 2, 0), wall, wallLine);                         // z = 0, facing +z
  addWall(field, W, H, at(W / 2, H / 2, L).multiply(turnY(180)), wall, wallLine);    // z = L, facing -z
}
buildBox();
// #endregion

// #region The target cart: chassis, bowl, wheels
const cart = new THREE.Group();
cart.matrixAutoUpdate = false;
field.add(cart);
const wheels = [];

function buildCart() {
  const paint = new THREE.MeshStandardMaterial({ color: 0x3d7ae0, roughness: 0.5 });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(CART.width, 0.3, CART.length), paint);
  chassis.position.set(0, 0.45, 0);
  cart.add(chassis);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2), paint);
  post.position.set(0, 0.68, 0);
  cart.add(post);
  // the bowl: a half sphere, open on top, its rim at CART.rimHeight; drawn on both sides
  const profile = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI / 2;
    profile.push(new THREE.Vector2(CART.bowlRadius * Math.sin(a), CART.rimHeight - CART.bowlRadius * Math.cos(a)));
  }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 48),
    new THREE.MeshStandardMaterial({ color: 0xf2a65a, roughness: 0.6, side: THREE.DoubleSide }));
  cart.add(bowl);
  // wheels: a tire and a white spoke, so the rolling shows; each placed by its own matrix in the field
  const tire = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  const spoke = new THREE.MeshStandardMaterial({ color: 0xffffff });
  for (let i = 0; i < 4; i++) {
    const wheel = new THREE.Group();
    wheel.matrixAutoUpdate = false;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(CART.wheelRadius, CART.wheelRadius, 0.16, 32), tire);
    disc.rotation.z = Math.PI / 2;                       // the cylinder's axis, y, becomes the axle, x
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.5), spoke);
    wheel.add(disc, bar);
    field.add(wheel);
    wheels.push(wheel);
  }
}
buildCart();
// #endregion

// #region The balls: one model, loaded once, used three times
const balls = [];
const loader = new GLTFLoader();

function onBallLoaded(gltf) {
  for (let i = 0; i < 3; i++) {
    const ball = gltf.scene.clone();
    ball.matrixAutoUpdate = false;
    field.add(ball);
    balls.push(ball);
  }
}
loader.load('../../../assets/models/football/football.glb', onBallLoaded);
// #endregion

// #region The frame loop: copy every matrix from the model
/** with matrixAutoUpdate off, three.js uses .matrix as given; matrixWorldNeedsUpdate tells it to recompute
 *  .matrixWorld (parent's world matrix times this one) before the next render. The camera is not in the
 *  scene graph, so nothing else would ever refresh it. */
function setMatrix(object, matrix) {
  object.matrix.copy(matrix);
  object.matrixWorldNeedsUpdate = true;
}

let plan = new TargetPlan();
let t = 0;
let playing = true;
let slowMotion = 0.25;
let cameraMode = 'chase';
let look = 1;
let last = performance.now();

function update(dt) {
  if (playing) t += dt * slowMotion;
  if (t > plan.tEnd) t = 0;

  setMatrix(field, fieldPlacement());                            // F
  setMatrix(cart, plan.placement(t));                            // K(t)
  for (let i = 0; i < 4; i++) setMatrix(wheels[i], plan.wheel(i, t));
  if (balls.length === 3) {
    setMatrix(balls[0], thrownBall(plan, t));                    // H T A W S, or carried by the cart
    setMatrix(balls[1], restingBall());
    setMatrix(balls[2], spinningTop(t));
  }

  // the camera: placed by F · C; three.js inverts that into the view matrix V (camera.matrixWorldInverse)
  const C = cameraPlacement(cameraMode, t, look, plan);
  setMatrix(camera, fieldPlacement().multiply(C));
  camera.fov = LENS[cameraMode];
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();                               // P
}

function frame(now) {
  update(Math.min(0.1, (now - last) / 1000));
  last = now;
  renderer.render(scene, camera);
  showStatus();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// #endregion

// #region Keys and status line
const status = document.getElementById('status');
const gravityNames = Object.keys(GRAVITY);

function showStatus() {
  const g = gravityNames.find((k) => GRAVITY[k] === settings.gravity);
  status.textContent = `t = ${t.toFixed(2)} s   camera ${cameraMode} (1-9)   watching ball ${look} (B)   `
    + `gravity ${g} (G)   ${plan.outcome}${playing ? '' : '   paused'}`;
}

function onKeyDown(event) {
  const n = parseInt(event.key, 10);
  if (n >= 1 && n <= 9) cameraMode = CAMERA_MODES[n - 1];
  if (event.key === 'b' || event.key === 'B') look = look % 3 + 1;
  if (event.key === 'g' || event.key === 'G') {
    const next = (gravityNames.indexOf(gravityNames.find((k) => GRAVITY[k] === settings.gravity)) + 1) % gravityNames.length;
    settings.gravity = GRAVITY[gravityNames[next]];
    plan = new TargetPlan();                                     // the plan depends on the flight
    t = 0;
  }
  if (event.key === ' ') playing = !playing;
  if (event.key === 'r' || event.key === 'R') t = 0;
}
window.addEventListener('keydown', onKeyDown);

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
// #endregion
