import * as THREE from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import World from "./world/World";

//import * as GameConstants from "./constants/GameConstants.js";
import * as SceneConstants from "./constants/SceneConstants";
import { PlayerCamera } from "./player/PlayerCamera";
import { PlayerControls } from "./player/PlayerControls";

import './style.css'


function main() {
  const canvas = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ canvas });
  var camera: PlayerCamera | undefined;
  var world: World | undefined;
  var controls: PlayerControls | undefined;

  const scene = new THREE.Scene();

  //texture loading
  // https://www.planetminecraft.com/texture-pack/16x132-dandelion-cute-and-swirly/
  const loader = new THREE.TextureLoader();

  const texture = loader.load("textures/textureatlas.png");
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;

  const skybox = loader.load("textures/skybox.jpg", () => {
    const rt = new THREE.WebGLCubeRenderTarget(skybox.image.height);
    rt.fromEquirectangularTexture(renderer, skybox);
    scene.background = rt;
  });


  // stats div
  const container = document.createElement("div");
  const stats = new (Stats as any)();
  container.appendChild(stats.domElement);

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
    if (!camera) {
      return;
    }
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    stats.begin();
    renderer.render(scene, camera);
    stats.end();
  }

  function gameLoop() {
    requestAnimationFrame(gameLoop);
    update();
    render();
  }

  function init() {
    world = new World();
    camera = new PlayerCamera(canvas, world);
    controls = new PlayerControls(camera, document.body, world, scene);

    world.setTexture(texture);


    if (world.debug) {
      scene.add(SceneConstants.PLAYER_CHUNK_BOX);
      scene.add(SceneConstants.PLAYER_CHUNK_OUTLINE);
    }

    scene.fog = SceneConstants.FOG;
    scene.add(SceneConstants.AMBIENT);
    scene.add(SceneConstants.LIGHT);

    if (world.debug) {
      document.body.appendChild(container);
    }
    gameLoop();

  }

  function update() {
    controls?.update();
    camera?.updateFog(scene, world);
    world?.updateChunksAroundPlayerChunk(camera, scene);
  }

  init();

  // world.debug toggle
  document.addEventListener("keypress", function (e) {
    // f
    if (e.keyCode == 102 || e.keyCode == 70) {
      if (!world) {
        return;
      }
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

main();
