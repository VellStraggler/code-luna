import {XY, xy} from "../../main/xy"
import { BLOCK_DEPTH, BLOCK_RES, DEFAULT_DRAG, DIRECTION_OFFSETS, Dirs, generateId, MAX_SPEED, PART_CPU_NAME } from "../../main/constants";
import { ModularPart } from "./ModularPart";
import { BlockType } from "./BlockType";
import MainScene from "../../CodeLuna";
import HPImage from "../../main/HPImage";
import ModularRobot from "../ModularRobot";
import { PartType } from "./PartType";
import ModularRobots from "../ModularRobots";
import CpuPart from "./CpuPart";
import BaseGameItem from "../contracts/BaseGameItem";

export default class ModularBlock extends BaseGameItem {

    // parent block is referenced to know where to start a new robot if a robot is broken up.
    parentBlock: ModularBlock | null = null;
    childBlocks: ModularBlock[] = []; // up to 4 if we stick to grid builds
    modularParts: ModularPart[] = [];

    readonly blockType: BlockType;
    private energyStored = 0
    hp = 0

    // DO NOT USE DIRECTLY
    constructor(
        scene: MainScene,
        position:XY, 
        blockType: BlockType, 
        robot: ModularRobot | null = null,
        parentBlock: ModularBlock | null = null
    ) {
        let globalPos = position
        let localPos = xy()
        if (parentBlock != null) {
            globalPos = parentBlock.globalPos
            localPos = position
        }
        let x = globalPos.x + localPos.x
        let y = globalPos.y + localPos.y

        super(
            scene,
            parentBlock?.globalPos ?? position,
            new HPImage(scene, x, y, blockType.assetName),
            blockType.assetName,
            blockType.availableFrames -1
        )
        this.localPos = localPos
        this.parentBlock = parentBlock
        this.blockType = blockType

        if(robot != null) {
            this.addCollision(scene, robot)
        }

        // derive starting health from the blockType
        this.hp = blockType.strength

        this.image.setBodySize(BLOCK_RES-2, BLOCK_RES-2, true)
            .setDrag(DEFAULT_DRAG)
            .setDepth(BLOCK_DEPTH)
        scene.baseLayer.push(this.image)
    }

    public addCollision(scene: MainScene, robot: ModularRobot) {
        scene.physics.add.collider(scene.player, this.image, () => {
            robot.proxyGlobalBlock = this
        })
    }

    /** adds block to this block's list of children. Assigns global position and this as the parent block.
     * Applies an offset of up to one BLOCK_RESOLUTION_AMOUNT away. If dir is not set, the local position will be
     * assumed as already assigned
     */
    public connectBlock(block: this, dir: string = "") {
        block.globalPos = this.globalPos // from source block
        block.parentBlock = this
        this.childBlocks.push(block)
        
        if (dir!="") {
            let offset = DIRECTION_OFFSETS[0]
            switch(dir){
                case("down"):
                    offset = DIRECTION_OFFSETS[0]
                    break
                case("up"):
                    offset = DIRECTION_OFFSETS[1]
                    break
                case("right"):
                    offset = DIRECTION_OFFSETS[2]
                    break
                default://left
                    offset = DIRECTION_OFFSETS[3]
                    break
            }
            block.localPos = this.localPos.add(offset.multiply(BLOCK_RES))
        }

        for (const childBlock of block.childBlocks) {
            childBlock.localPos = childBlock.localPos.add(block.localPos)
            childBlock.globalPos = this.globalPos
        }
        block.update(this.scene.animateScene)
    }

    rotateChassis(dir: Dirs) {}

    addPart(scene: MainScene, partType: PartType, robot: ModularRobot | undefined = undefined):this {
        let part!: ModularPart
        if (partType.assetName == PART_CPU_NAME && robot instanceof ModularRobot) {
            part = new CpuPart(scene, this, robot)
            robot.latestCpuPart = part as CpuPart
        } else {
            part = new ModularPart(scene, this, partType.assetName)
        }
        this.modularParts.push(part)
        if (robot){
            robot.reload()
        }
        return this
    }
    
    public disconnect(scene: MainScene, robots: ModularRobots, robot: ModularRobot | null = null) {
        const wasRoot = this.parentBlock === null;

        if (wasRoot) {
            // Split each child subtree into its own robot.
            // Each disconnect removes itself from childBlocks.
            while (this.childBlocks.length > 0) {
                this.childBlocks[0].disconnect(scene, robots, robot);
            }
        } else {
            const oldParent = this.parentBlock;
            if (oldParent != null) {
                oldParent.childBlocks = oldParent.childBlocks.filter(
                    child => !child.equals(this)
                );
                
                this.parentBlock = null;
                oldParent.update(scene.animateScene);
            }
        }

        // Convert this block's root-relative position into its new
        // robot's world position.
        const oldLocalPos = this.localPos;

        this.globalPos = xy(
            this.globalPos.x + oldLocalPos.x,
            this.globalPos.y + oldLocalPos.y
        );

        this.image.setPosition(this.globalPos.x, this.globalPos.y);

        for (const part of this.modularParts) {
            part.globalPos = this.globalPos;
            part.image.setPosition(this.globalPos.x, this.globalPos.y);
            part.update(scene.animateScene);
        }

        // Convert child positions from the old root's coordinate system
        // to this block's new coordinate system.
        for (const child of this.childBlocks) {
            child.localPos = child.localPos.subtract(oldLocalPos);
            child.globalPos = this.globalPos;

            child.image.setPosition(
                this.globalPos.x + child.localPos.x,
                this.globalPos.y + child.localPos.y
            );
        }

        this.localPos = xy();

        // Only a detached non-root block needs a new robot.
        if (!wasRoot) {
            const newBot = ModularRobot.createFromBlock(scene, this);
            robots.push(newBot);
        }

        robot?.reload();
    }

    resetHP() {
        this.hp = this.blockType.strength
    }

    getEnergyStored() {
        return this.energyStored
    }

    // returns amount that didn't fit in storage
    storeEnergy(amount:number): number {
        let total = this.getEnergyStored() + amount
        if (total > this.getEnergyLimit() ) {
            let leftovers = total - this.getEnergyLimit()
            this.energyStored = this.getEnergyLimit()
            return leftovers
        } else {
            this.energyStored += amount
            return 0
        }
    }

    getEnergyLimit() {
        return this.blockType.storage
    }

    addEnemyCollider(scene: MainScene, offender: HPImage | Phaser.Physics.Arcade.Image, newCollideGroup: ModularBlock[]) {
        scene.physics.add.collider(offender, this.image)
        for (const childBlock of this.childBlocks) {
            newCollideGroup.push(childBlock)
            childBlock.addEnemyCollider(scene, offender, newCollideGroup)
        }
    }

    /** 
     * Recognizes when it becomes a parent block and sets its own global position. Otherwise 
     * update based on the global position.
     * Handles velocity clamping as well
    */
    override update(animateScene: boolean = false) {
        if (this.image.body == undefined) return
        if (this.parentBlock != null) {
            let x = this.globalPos.x + this.localPos.x
            let y = this.globalPos.y + this.localPos.y
            this.image.setPosition(x,y)
            if (this.parentBlock.image.body != null) {
                let newV = xy(this.parentBlock.image.body.velocity.x, this.parentBlock.image.body.velocity.y)
                this.image.setVelocity(newV.x, newV.y)
            }
        } else { // This is the eldest parent block
            // Derive position from physics
             
            let newPos = this.image.getCenter()
            this.globalPos.x = newPos.x
            this.globalPos.y = newPos.y 
            this.image.updateShadow()
        }
        // velocity clamping
        if (this.image.body!.velocity.length() > MAX_SPEED) {
            this.image.body?.velocity.normalize().scale(MAX_SPEED)
        }

        this.updateAnimation(animateScene)

        for(const part of this.modularParts) {
            part.update(animateScene)
        }
        for(const block of this.childBlocks) {
            block.update(animateScene)
        }
    }
}