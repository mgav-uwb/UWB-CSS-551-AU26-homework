// scene.js: the spiral-pass scene in three.js. pass.js computes every matrix; this file builds the meshes,
// then, once per frame, copies those matrices onto them (matrixAutoUpdate = false: three.js does not
// rebuild them from position, quaternion and scale). Keys: 1 to 9 pick a shot camera, B the ball it
// watches, G the gravity, Space pauses, R restarts.
// Models: the ball, "Football" by rnepb13 (BlendSwap, CC BY 3.0, lib/assets/models/football/); the field, a
// drawing of the Husky Stadium field (lib/assets/models/field/).
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
renderer.shadowMap.enabled = true;                 // shadows: the sun renders a depth map first
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2d33, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(-45, 100, 30);                    // the world origin is midfield; the sun aims there
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -70;                      // an orthographic box around the field drawing
sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;
sun.shadow.camera.bottom = -70;
sun.shadow.camera.far = 300;
sun.shadow.bias = -0.0004;
scene.add(sun);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 500);
camera.matrixAutoUpdate = false;

const LENS = { tripod: 50, pan: 6, sideline: 12, chase: 50, skycam: 12, ballCam: 60, spinCam: 60, receiver: 20, orbit: 40 };
// #endregion

// #region The field: a coordinate box whose near walls are culled, over the field drawing
/** a texture with one grid cell: a fill (clear for the floor), a border. Repeated once per 10 m. */
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
 *  camera and the box shows its back and is culled, and the far walls stay in view. The floor's texture is
 *  clear but for its lines, so the field drawing shows through it. */
function addWall(parent, width, height, placement, fill, line) {
  const texture = gridTexture(fill, line);
  texture.repeat.set(width / 10, height / 10);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
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
  const floor = 'rgba(0, 0, 0, 0)', floorLine = 'rgba(169, 189, 224, 0.45)';
  const wall = 'rgb(20, 26, 38)', wallLine = 'rgb(61, 76, 107)';
  addWall(field, W, L, at(W / 2, 0.03, L / 2).multiply(turnX(-90)), floor, floorLine);  // floor, 3 cm up, facing +y
  addWall(field, W, L, at(W / 2, H, L / 2).multiply(turnX(90)), wall, wallLine);      // ceiling, facing -y
  addWall(field, L, H, at(0, H / 2, L / 2).multiply(turnY(90)), wall, wallLine);     // x = 0, facing +x
  addWall(field, L, H, at(W, H / 2, L / 2).multiply(turnY(-90)), wall, wallLine);    // x = W, facing -x
  addWall(field, W, H, at(W / 2, H / 2, 0), wall, wallLine);                         // z = 0, facing +z
  addWall(field, W, H, at(W / 2, H / 2, L).multiply(turnY(180)), wall, wallLine);    // z = L, facing -z
}
buildBox();

/** the Husky Stadium field drawing on the ground, sized and placed so its end lines and sidelines fall on the
 *  real ones, 109.73 m by 48.77 m around (25, 0, 55): 123.14 m along z by 73.22 m along x, its long side on z
 *  and its top edge toward +x (tools/make-field-texture.py measured these numbers). */
function buildFieldDrawing() {
  const texture = new THREE.TextureLoader().load('../../../assets/models/field/huskies_field.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(123.138, 73.223),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }));
  // the matrix's columns: the plane's x (the image's width) along z, its y (the image's height) along x, its
  // normal up; then the translation to the image's center
  ground.matrixAutoUpdate = false;
  ground.matrix.makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
  ground.matrix.setPosition(25.137, 0, 54.384);
  ground.receiveShadow = true;
  field.add(ground);
}
buildFieldDrawing();

/** a goalpost on each end line (z = 55 -/+ 54.865): one post up the middle to the crossbar, 3.05 m up, and two
 *  uprights 5.64 m apart rising 9.14 m above it. (A real one stands on a curved arm whose base is behind the end
 *  line; a straight post keeps it inside the box.) */
function buildGoalposts() {
  const paint = new THREE.MeshStandardMaterial({ color: 0xffd400, roughness: 0.45 });
  for (const z of [55 - 54.865, 55 + 54.865]) {
    const goal = new THREE.Group();
    goal.position.set(FIELD.width / 2, 0, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.05, 16), paint);
    post.position.y = 3.05 / 2;
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.64, 16), paint);
    crossbar.rotation.z = Math.PI / 2;                   // the cylinder's axis, y, becomes x
    crossbar.position.y = 3.05;
    goal.add(post, crossbar);
    for (const x of [-5.64 / 2, 5.64 / 2]) {
      const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 9.14, 12), paint);
      upright.position.set(x, 3.05 + 9.14 / 2, 0);
      goal.add(upright);
    }
    field.add(castShadows(goal));
  }
}
// #endregion

// #region Shadows
/** every mesh under obj casts and receives shadows. */
function castShadows(obj) {
  obj.traverse(markShadow);
  return obj;
}
function markShadow(o) {
  if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
}
buildGoalposts();
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
    castShadows(wheel);
    field.add(wheel);
    wheels.push(wheel);
  }
  castShadows(cart);
}
buildCart();
// #endregion

// #region The balls: one model, loaded once, used three times
const balls = [];
const loader = new GLTFLoader();

function onBallLoaded(gltf) {
  castShadows(gltf.scene);
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
