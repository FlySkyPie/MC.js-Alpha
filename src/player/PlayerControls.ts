import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

import * as CameraConstants from "../constants/CameraConstants";
import * as WorldConstants from "../constants/WorldConstants";
import World from "../world/World";

import { PlayerCamera } from './PlayerCamera';

export class PlayerControls extends PointerLockControls {
    wireframeOn = false;
    camera: PlayerCamera;
    world: World;
    keys: number[];
    voxelHighlight: THREE.LineSegments;
    hotbarButtons: NodeListOf<HTMLInputElement>;
    boundingBox: THREE.Mesh;

    constructor(camera: PlayerCamera, domElement: HTMLElement, world: World, scene: THREE.Scene) {
        super(camera, domElement);
        this.camera = camera;

        this.world = world;

        this.addEventListener("lock", function () { });
        this.addEventListener("unlock", function () { });

        document.body.addEventListener("click", () => {
            this.lock();
        });

        // keyboard controls
        this.keys = [];
        document.addEventListener("keydown", (e) => {
            this.keys.push(e.keyCode);
        });
        document.addEventListener("keyup", (e) => {
            var arr = [];
            for (var i = 0; i < this.keys.length; i++) {
                if (this.keys[i] != e.keyCode) {
                    arr.push(this.keys[i]);
                }
            }
            this.keys = arr;
        });

        // mouse controls
        window.addEventListener(
            "click",
            (event) => {
                event.preventDefault();

                // left click
                if (event.button === 0) {
                    this.placeVoxel(WorldConstants.BLOCK_TYPES.AIR)
                }

                // right click
                if (event.button === 2) {
                    this.placeVoxel(this.camera.currBlock)
                }
            },
            { passive: false }
        );

        // voxel highlight
        const geometry = new THREE.EdgesGeometry(
            new THREE.BoxGeometry(1.005, 1.005, 1.005)
        );
        const material = new THREE.LineBasicMaterial({
            color: "black",
            fog: false,
            linewidth: 2,
            opacity: 0.5,
            transparent: true,
            depthTest: true,
        });
        this.voxelHighlight = new THREE.LineSegments(geometry, material);
        this.voxelHighlight.visible = false;

        scene.add(this.voxelHighlight);

        // hotbar
        this.hotbarButtons = document.querySelectorAll("input.voxel");
        const hotbarButtons = this.hotbarButtons;

        for (const button of Array.from(hotbarButtons)) {
            button.addEventListener("click", (event) => {
                event.preventDefault();
            });

            if (parseInt(button.id) === camera.currBlock.id) {
                button.checked = true;
            }
        }

        window.addEventListener("wheel", (event) => {
            for (const button of Array.from(hotbarButtons)) {
                if (button.checked) {
                    var nextButton;
                    const id = parseInt(button.id);
                    if (event.deltaY > 0) {
                        nextButton =
                            id === hotbarButtons.length - 1
                                ? hotbarButtons[0]
                                : hotbarButtons.item(id + 1);
                    } else {
                        nextButton =
                            id === 0
                                ? hotbarButtons.item(hotbarButtons.length - 1)
                                : hotbarButtons.item(id - 1);
                    }
                    button.checked = false;
                    nextButton.checked = true;

                    const block = Object.entries(
                        WorldConstants.BLOCK_TYPES
                    )[parseInt(nextButton.id) + 1][1];

                    if (block !== 0) {
                        camera.currBlock = block;
                    }
                    break;
                }
            }
        });

        const box = new THREE.BoxGeometry(0.8, 1.75, 0.8);
        const boxMaterial = new THREE.MeshBasicMaterial({
            color: "black",
            side: THREE.FrontSide,
        });
        this.boundingBox = new THREE.Mesh(box, boxMaterial);

        this.updateBoundingBox();
        scene.add(this.boundingBox);
    }

    update() {
        // movement controls
        const { keys, camera } = this;

        const currPosition = camera.position.clone();

        // w
        if (keys.includes(87)) {
            this.moveForward(CameraConstants.MOVEMENT_SPEED);
        }
        // a
        if (keys.includes(65)) {
            this.moveRight(-1 * CameraConstants.MOVEMENT_SPEED);
        }
        // s
        if (keys.includes(83)) {
            this.moveForward(-1 * CameraConstants.MOVEMENT_SPEED);
        }
        // d
        if (keys.includes(68)) {
            this.moveRight(CameraConstants.MOVEMENT_SPEED);
        }

        // space
        if (keys.includes(32)) {
            this.getObject().position.y += CameraConstants.MOVEMENT_SPEED;
        }

        // shift
        if (keys.includes(16)) {
            this.getObject().position.y -= CameraConstants.MOVEMENT_SPEED;
        }

        const newPosition = camera.position;
        this.detectCollision(currPosition, newPosition);
        this.updateBoundingBox();

        // block highlighting

        const intersection = camera.calculateIntersection();

        if (intersection) {
            const pos = intersection.position.map((v: number, ndx: number) => {
                return Math.ceil(v + intersection.normal[ndx] * -0.5) - 0.5;
            });

            this.voxelHighlight.visible = true;
            this.voxelHighlight.position.set(pos[0], pos[1], pos[2]);
        } else {
            this.voxelHighlight.visible = false;
        }
    }

    updateBoundingBox() {
        const { boundingBox, camera } = this;

        boundingBox.position.set(
            camera.position.x,
            camera.position.y - 0.75,
            camera.position.z
        );
    }

    detectCollision(currPosition: THREE.Vector3, newPosition: THREE.Vector3) {
        const { world, boundingBox } = this;

        const dx = newPosition.x - currPosition.x;
        const dy = newPosition.y - currPosition.y;
        const dz = newPosition.z - currPosition.z;

        var canMoveX = true;
        var canMoveY = true;
        var canMoveZ = true;

        // check each vertex of player's bounding box and see if  player's new position in each direction
        // is blocked by voxel

        for (const vertice of (boundingBox.geometry as any).vertices) {
            const verticeCopy = vertice.clone();
            boundingBox.localToWorld(verticeCopy);

            const nx = verticeCopy.x + dx;
            const ny = verticeCopy.y + dy;
            const nz = verticeCopy.z + dz;

            const px = verticeCopy.x;
            const py = verticeCopy.y;
            const pz = verticeCopy.z;

            if (canMoveX) {
                const voxel = world.getVoxel(nx, py, pz);
                if (voxel && voxel !== WorldConstants.BLOCK_TYPES.WATER)
                    canMoveX = false;
            }
            if (canMoveY) {
                const voxel = world.getVoxel(px, ny, pz);
                if (voxel && voxel !== WorldConstants.BLOCK_TYPES.WATER)
                    canMoveY = false;
            }
            if (canMoveZ) {
                const voxel = world.getVoxel(px, py, nz);
                if (voxel && voxel !== WorldConstants.BLOCK_TYPES.WATER)
                    canMoveZ = false;
            }
        }

        if (!canMoveX) this.getObject().position.x -= dx;
        if (!canMoveY) this.getObject().position.y -= dy;
        if (!canMoveZ) this.getObject().position.z -= dz;
    }

    placeVoxel(voxel: WorldConstants.VoxelType) {
        const { camera, world, boundingBox } = this;

        const intersection = camera.calculateIntersection();
        if (intersection) {
            const pos = intersection.position.map((v: number, ndx: number) => {
                return v + intersection.normal[ndx] * (voxel ? 0.5 : -0.5);
            });

            // position of voxel being placed
            const fPos = pos.map((x: number) => {
                return Math.floor(x);
            });

            var canPlace = true;

            // check each vertex of bounding box to check for voxel being placed
            for (const vertice of (boundingBox.geometry as any).vertices) {
                const verticeCopy = vertice.clone();
                boundingBox.localToWorld(verticeCopy);

                const vertPos = Object.values(verticeCopy).map((x: any) => {
                    return Math.floor(x);
                });

                // don't place voxel if where you're trying to place the voxel is
                // inside the player's body
                if (JSON.stringify(fPos) === JSON.stringify(vertPos))
                    canPlace = false;
            }

            if (canPlace) world.setVoxel(pos[0], pos[1], pos[2], voxel);
        }
    }
}
