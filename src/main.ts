import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";

import World from "./world/World";

import * as SceneConstants from "./constants/SceneConstants";
import { PlayerCamera } from "./player/PlayerCamera";
import { PlayerControls } from "./player/PlayerControls";

import './style.css'

type UseDebugToggleProps = {
  world: World, scene: THREE.Scene, container: Element, camera: PlayerCamera, render: () => void
};

const useDebugToggle = ({ camera, container, render, scene, world }: UseDebugToggleProps) => {
  // world.debug toggle
  document.addEventListener("keypress", function (e) {
    // f
    if (e.keyCode == 102 || e.keyCode == 70) {
      if (!world.debug) {
        world.debug = true;
        scene.add(SceneConstants.PLAYER_CHUNK_OUTLINE);
        scene.fog = null;
        document.body.appendChild(container);
        world.updateChunksAroundPlayerChunk(camera, scene);
      } else {
        world.debug = false;
        scene.remove(SceneConstants.PLAYER_CHUNK_OUTLINE);
        scene.fog = SceneConstants.FOG;
        document.body.removeChild(container);
        world.updateChunksAroundPlayerChunk(camera, scene);
      }
      render();
    }
  });
}

const preload = async () => {
  const loader = new THREE.TextureLoader();
  const load = (file: string) => new Promise<THREE.Texture>((resovle) => {
    loader.load(file, (texture) => resovle(texture));
  })

  const texture = await load("textures/textureatlas.png");
  const skybox = await load("textures/skybox.jpg");

  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;

  return { texture, skybox }
}

const init = () => {
  // Three basic setup.
  const canvas = document.querySelector("#c")!;
  const renderer = new THREE.WebGLRenderer({ canvas });
  const scene = new THREE.Scene();

  // Game related setup.
  const world = new World();
  const camera = new PlayerCamera(canvas, world);
  const controls = new PlayerControls(camera, document.body, world, scene);

  // Debug tool setup.
  const statsContainer = document.createElement("div");
  const stats = new (Stats as any)();
  statsContainer.appendChild(stats.domElement);

  return {
    scene, renderer,
    world, camera, controls,
    statsContainer, stats,
  };
}

const app = async () => {
  const {
    scene, renderer,
    camera, controls, world,
    statsContainer, stats
  } = init();
  const { skybox, texture } = await preload();

  const rt = new THREE.WebGLCubeRenderTarget(skybox.image.height);
  rt.fromEquirectangularTexture(renderer, skybox);
  scene.background = rt;

  world.setTexture(texture);

  if (world.debug) {
    scene.add(SceneConstants.PLAYER_CHUNK_BOX);
    scene.add(SceneConstants.PLAYER_CHUNK_OUTLINE);
  }

  scene.fog = SceneConstants.FOG;
  scene.add(SceneConstants.AMBIENT);
  scene.add(SceneConstants.LIGHT);

  if (world.debug) {
    document.body.appendChild(statsContainer);
  }

  //responsive renderer resize
  function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    stats.begin();
    renderer.render(scene, camera);
    stats.end();
  }

  function update() {
    controls.update();
    camera.updateFog(scene, world);
    world.updateChunksAroundPlayerChunk(camera, scene);
  }

  function gameLoop() {
    requestAnimationFrame(gameLoop);
    update();
    render();
  }

  useDebugToggle({ camera, container: statsContainer, render, scene, world });

  gameLoop();
}

app();
