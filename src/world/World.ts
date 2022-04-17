import * as THREE from "three";

import Chunk from "./Chunk.js";
import * as WorldConstants from "../constants/WorldConstants";
import * as SceneConstants from "../constants/SceneConstants";

export default class World {
    chunks: any[];
    renderedChunks: any[];

    texture?: THREE.Texture;
    debug: boolean;

    material: THREE.MeshPhongMaterial;
    t_material: THREE.MeshPhongMaterial;
    seed: number;




    constructor() {
        this.chunks = [];

        // this.renderedChunks = new Array(CameraConstants.RENDER_DISTANCE*CameraConstants.RENDER_DISTANCE*4);
        this.renderedChunks = [];
        this.texture;
        this.debug = false;

        this.seed = Math.random();
        //noise.seed(this.seed);

        this.material = new THREE.MeshPhongMaterial({
            transparent: false,
            opacity: 0.3,
        });

        this.t_material = new THREE.MeshPhongMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            opacity: 1,
        });
    }

    setTexture(texture: THREE.Texture) {
        this.texture = texture;
        this.material.map = texture;
        this.t_material.map = texture;
    }

    createChunkIfDNE(x: number, z: number) {
        const { chunks } = this;

        if (!chunks[x]) chunks[x] = [];

        // return if chunk already exists
        if (chunks[x][z]) return;
        chunks[x][z] = new Chunk(x, 0, z, this.material, this.t_material);
        const chunk = chunks[x][z];

        chunk.generateTerrain(this.seed);
    }

    getVoxel(x: number, y: number, z: number) {
        const cx = Math.floor(x / WorldConstants.CHUNK_SIZE);
        const cz = Math.floor(z / WorldConstants.CHUNK_SIZE);

        const chunk = this.getChunk(cx, cz);

        const fx = Math.floor(x);
        const fy = Math.floor(y);
        const fz = Math.floor(z);

        if (!chunk) return;

        return chunk.getVoxel(fx, fy, fz);
    }

    setVoxel(x: number, y: number, z: number, type: any) {
        const cx = Math.floor(x / WorldConstants.CHUNK_SIZE);
        const cz = Math.floor(z / WorldConstants.CHUNK_SIZE);

        const chunk = this.getChunk(cx, cz);

        const fx = Math.floor(x);
        const fy = Math.floor(y);
        const fz = Math.floor(z);

        if (!chunk) return;


        chunk.setVoxel(fx, fy, fz, type);
        chunk.updateMesh();

        for (const neighbor of chunk.getChunkNeighborsOfVoxel(fx, fy, fz)) neighbor.updateMesh();
    }

    updateChunk(x: number, z: number) {
        const { chunks } = this;

        const chunk = chunks[x][z];

        this.updateNeighborsOfChunk(chunk);
        if (!chunk.addedTrees) chunk.generateTrees(this);
        chunk.updateMesh();
    }

    getChunk(x: number, z: number) {
        if (!this.chunks[x] || !this.chunks[x][z]) return;
        return this.chunks[x][z];
    }

    updateNeighborsOfChunk(chunk: any) {
        const { cx, cz } = chunk;
        for (let i = 0; i < WorldConstants.CHUNK_NEIGHBORS.length; i++) {
            const cnx = cx + WorldConstants.CHUNK_NEIGHBORS[i].dir[0];
            const cnz = cz + WorldConstants.CHUNK_NEIGHBORS[i].dir[1];

            // generate neighbor
            this.createChunkIfDNE(cnx, cnz);

            chunk.neighbors[i] = this.chunks[cnx][cnz];
        }
    }

    updateChunksAroundPlayerChunk(camera: any, scene: THREE.Scene) {
        // check if chunk coordinates changed
        const [cx, cy, cz] = camera.getCameraChunkCoords();
        const [pbx, pfx, pby, pfy, pbz, pfz] = camera.getCameraRenderingAreaCoords();

        // check all chunks within render distance
        for (let x = pbx; x <= pfx; ++x) {
            for (let z = pbz; z <= pfz; ++z) {
                // create chunk if it doesn't exist yet
                this.createChunkIfDNE(x, z);

                const chunk = this.chunks[x][z];
                if (!chunk.mesh) {
                    this.updateChunk(x, z);
                }

                scene.add(chunk.mesh);
                scene.add(chunk.t_mesh);

                if (this.debug) {
                    chunk.mesh.material.wireframe = true;
                    chunk.mesh.material.transparent = true;

                    chunk.t_mesh.material.wireframe = true;
                    chunk.t_mesh.material.opacity = 0.5;

                    scene.fog = null;
                } else {
                    chunk.mesh.material.wireframe = false;
                    chunk.mesh.material.transparent = false;

                    chunk.t_mesh.material.wireframe = false;
                    chunk.t_mesh.material.opacity = 1;
                }
            }
        }

        // check each mesh if its within bounds of player render distance
        for (const { name } of scene.children) {
            const x = parseInt(name[0]);
            const z = parseInt(name[1]);
            var chunk;
            if (this.chunks[x] && this.chunks[x][z]) {
                chunk = this.chunks[x][z];
            }

            if (x < pbx || x > pfx || z < pbz || z > pfz) {
                if (chunk) {
                    if (scene.children.includes(chunk.mesh)) scene.remove(chunk.mesh);
                    if (scene.children.includes(chunk.t_mesh)) scene.remove(chunk.t_mesh);
                }
            }
        }

        if (this.debug) {
            SceneConstants.PLAYER_CHUNK_OUTLINE.position.set(
                cx * WorldConstants.CHUNK_SIZE + WorldConstants.CHUNK_SIZE / 2,
                0,
                cz * WorldConstants.CHUNK_SIZE + WorldConstants.CHUNK_SIZE / 2
            );
        }

        // console.log(this.getChunk(cx,cz));
        // console.log(scene.children);
    }
}


