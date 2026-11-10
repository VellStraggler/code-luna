import { BATTERY_SIZE, BLOCK_RES, BLOCK_WHEEL_NAME, ENERGY_MS_PER_WHEEL, GAS_MINE_RATE, generateId, LASER_ENERGY_USE, MINING_RATE_MS, PART_CPU_NAME, PART_DRILL_NAME, PART_GUN_NAME, STONE_MINE_RATE } from "../main/constants";
import ModularBlock from "./parts/ModularBlock";
import { ModularPart } from "./parts/ModularPart";
import { xy, XY } from "../main/xy";
import { BlockType } from "./parts/BlockType";
import { PartType } from "./parts/PartType";
import HPImage from "../main/HPImage";
import MainScene from "../CodeLuna";
import IGameFighter from "./contracts/IGameFighter";
import * as Phaser from 'phaser'
import CpuPart from "./parts/CpuPart";
import BlockBuilder, { PartBuilder } from "./parts/builderClasses";
import Logic from "../main/logic";
import WheelBlock from "./parts/WheelBlock";

/**
 * Holds larger robot data, such as the supposed source block,
 * sum vars like total weight, and available modular parts
 */
export default class ModularRobot implements IGameFighter{
    scene!: MainScene
    readonly id: number;
    public sourceBlock: ModularBlock;
    public proxyGlobalBlock: ModularBlock | null = null
    public allBlocks: ModularBlock[] = []
    private allHitboxes: Phaser.Physics.Arcade.Image[] = []
    public allModularParts: ModularPart[] = []
    public movingDirectionRadians = 0

    public latestCpuPart: CpuPart | null = null
    public latestDrillPart: ModularPart | null = null
    public latestGunPart: ModularPart | null = null
    public latestWheelBlock: WheelBlock | null = null

    private timeIdle = 0
    private lastPos = xy()

    goal: XY | null = null
    
    private hp = 100

    /** assetName: count, for quick evaluation of abilities */
    private objectCounts: {[key:string]: number} = {}
    private weight = 0;
    private gasCost = 0;
    private stoneCost = 0;

    // Energy
    public baseEnergyUsePerMs = 0
    public energyUsePerMs = 0;
    public maxCharge = 0
    public baseEnergyNeed = 1
    public maxSpeed = 0;
    private wheelCount = 0;
    
    storageSpace = 0;
    storedCosmorite = this.baseEnergyNeed;
    storedLunestone = 0;
    public isMiningThis: HPImage | null = null
    cores = 0;
    canMove = false; canCreate = false;
    guns = 0; canSend = false; canReceive = false;

    /* use create(...) or createFromBlock(...) instead **/
    private constructor(scene: MainScene, sourceBlock: ModularBlock) {
        this.scene = scene
        this.id = generateId();
        this.sourceBlock = sourceBlock;

        // use childIds to track all visited nodes (blocks)
        this.reload()
    }

    static create(scene: MainScene, sourceBlockType: BlockType, x: number, y: number) {
        return new this(scene, new ModularBlock(scene, xy(x,y), sourceBlockType))
    }

    static createFromBlock(scene: MainScene, sourceBlock: ModularBlock) {
        return new this(scene, sourceBlock)
    }
    
    /** Position is based on the source block */
    getPosition() {
        return this.sourceBlock.globalPos;
    }

    equals(other:ModularRobot) {
        return other.id == this.id
    }

    /** drop resources and remove self from robot list */
    die() {
        this.hp = 0
        this.scene.robots.robots = this.scene.robots.robots.filter(robot => robot !== this)
        this.proxyGlobalBlock = null
        this.sourceBlock.modularParts.forEach(part => part.image.destroy())
        this.sourceBlock.destroy()
    }

    /** Hitting a robot block immediately converts the block into a separate robot */
    takeDamage(amt: number, target: any) {
        try {
            const block: ModularBlock = target as ModularBlock
            block.hp-= amt
            if(block.hp <= 0) {
                if (this.allBlocks.length == 1) {
                    this.die()
                } else {
                    block.disconnect(this.scene, this.scene.robots, this)
                    block.resetHP()
                }
                this.reload()
            }
        } catch { 
        }
    }
    getHP(): number {
        return this.hp
    }
    getHitboxes(): Phaser.Physics.Arcade.Image[] {
        return this.allHitboxes
    }

    private resetAbilities() {
        this.weight = 0
        this.storageSpace = 0
        this.gasCost = 0
        this.stoneCost = 0
        this.energyUsePerMs = 0
        this.wheelCount = 0
        this.maxSpeed = 0
        this.maxCharge = 0
        this.cores = 0
        // this.latestDrillPart = null
        // this.latestCpuPart = null 
        this.canMove = false; this.canCreate = false
        this.guns = 0; this.canSend = false; this.canReceive = false
    }

    canShoot() {
        return (this.guns > 0 && this.hasCpu() && this.storedCosmorite  - LASER_ENERGY_USE >= 0)
    }

    shootLaser() {
        if (this.canShoot()) {
            this.latestGunPart?.activate()
        }
        this.latestGunPart?.deactivate()
    }

    useEnergy(amt: number) {
        this.storedCosmorite -= amt
        if (this.storedCosmorite < 0) {
            this.storedCosmorite = 0
        }
    }

    getCalculatedEnergyUse() {
        let use = this.latestDrillPart?.getEnergyUse() ?? 0
        use += this.latestGunPart?.getEnergyUse() ?? 0 * this.guns
        use += (this.latestWheelBlock?.getEnergyUse() ?? 0) * this.wheelCount
        return use
    }

    /** Based on objectCounts, which goes off of object names */
    private evaluateAbilities() {
        for(const [name, count] of Object.entries(this.objectCounts)) {
            if(name.includes('block')) {
                let blockType = BlockType.get(name)
                this.weight += blockType.weight * count
                this.storageSpace += blockType.storage * count
                this.gasCost += blockType.gasCost * count
                this.stoneCost += blockType.stoneCost * count
            } else { //part
                let partType = PartType.get(name)
                this.weight += partType.weight * count
                this.gasCost += partType.gasCost * count
                this.stoneCost += partType.stoneCost * count
            }
            switch(name) {
                case('block-factory'):
                    this.canCreate = true
                    break
                case('block-tread'):
                    this.wheelCount = 2 * count
                    break
                case('block-wheel'):
                    this.wheelCount = 1 * count
                    break
                case('part-battery'):
                    this.maxCharge = BATTERY_SIZE * count
                    break
                case('part-cpu'):
                    this.cores = count
                    break
                case(PART_DRILL_NAME):
                    break
                case(PART_GUN_NAME):
                    this.guns = count
                    break
                case('part-radio-transmitter'):
                    this.canSend = true
                    break
                case('part-receiving-dish'):
                    this.canReceive = true
                    break
                default:
                    break
            }
        }
        this.calculateSpeed()
        this.propagateResistance()
    }
    public countAllBlocks(parentBlock: ModularBlock | null = null) {
        if (parentBlock == null) {
            this.allBlocks = [this.sourceBlock]
        } else {
            this.sourceBlock.childBlocks.forEach(child => {
                this.allBlocks.push(child)
                // this.countAllBlocks(child)
            })
        }
    }

    private calculateSpeed() {
        this.maxSpeed = Math.max(0, (this.wheelCount * 120)/this.weight)
        if (this.wheelCount < 3) {
            this.maxSpeed = this.maxSpeed / (5-this.wheelCount)
        } else if (this.wheelCount == 3) {
            this.maxSpeed = this.maxSpeed / 2
        }
    }
    private propagateResistance() {
        if (this.maxSpeed == 0 && this.allBlocks.length != 1){
            this.allBlocks.forEach(block => {
                block.image.setImmovable(true)
            });
        } 
        else {
            let massMult = 10
            const finalMass = Math.max(1, 
                (this.weight - this.maxSpeed))
            if(this.maxSpeed == 0 && this.allBlocks.length == 1 ) {
                massMult *= 3 
            }
            for(const block of this.allBlocks) {
                block.image.setImmovable(false)
                block.image.setMass(finalMass * massMult)
                block.image.setFriction(1,0)
            }
        }
    }

    closest(
        source: HPImage,
        targets: ModularBlock[]
    ) {
        let best = null;
        let bestDist = Infinity;

        for (const t of targets) {
            const dx = t.image.x - source.x;
            const dy = t.image.y - source.y;
            const d2 = dx * dx + dy * dy;

            if (d2 < bestDist) {
                bestDist = d2;
                best = t;
            }
        }
        return best;
    }

    addChildBlock(offset: XY, block:ModularBlock) {
        block.localPos = offset
        block.parentBlock = this.sourceBlock
        this.sourceBlock.childBlocks.push(block)
        this.reload()
    }

    public getCpuPart(): CpuPart | null {
        if (this.latestCpuPart == null) {
            for (const part of this.allModularParts) {
                if (part.partType.assetName == PART_CPU_NAME) {
                    this.latestCpuPart = part as CpuPart
                }
            }
        }
        return this.latestCpuPart
    }

    private addToObjectCounts(name:string){
        if (this.objectCounts[name] === undefined) {
            this.objectCounts[name] = 0
        }
        this.objectCounts[name]+=1
    }

    /** Recurses through blocks, gathering data as we go.
     * Collects all childIds and all blocks for allBlocks and objectCounts*/
    private visitNodes(block: ModularBlock) {
        this.allBlocks.push(block)
        this.allHitboxes.push(block.image)
        this.addToObjectCounts(block.itemName)
        this.registerBlock(block)
        this.scene.uiCamera.ignore(block.image)

        //add to totals
        for (const part of block.modularParts) {
            this.allModularParts.push(part)
            this.registerPart(part)
            this.addToObjectCounts(part.itemName)
        }
        
        for (const childBlock of block.childBlocks) { 
            const dir = Logic.getDir(block.localPos, childBlock.localPos)
            childBlock.rotateChassis(dir)
            this.visitNodes(childBlock)
        }
        // if it has no childblocks, we have reached one of many
        // potential endpoints
    }

    registerPart(part: ModularPart) {
        switch (part.itemName) {
            case PART_DRILL_NAME:
                this.latestDrillPart = part
                break
            case PART_CPU_NAME:
                this.latestCpuPart = part as CpuPart
                break
            default:
                break
        }
    }

    registerBlock(block: ModularBlock) {
        switch (block.itemName) {
            case BLOCK_WHEEL_NAME:
                this.latestWheelBlock = block as WheelBlock
                break
            default:
                break
        }
    }

    emptyAllLists() {
        this.allBlocks = []
        this.allModularParts = []
        this.allHitboxes = []
        this.objectCounts = {}
    }

    /** Clears out: blocks, hitboxes, objectCounts.
     *  Re-traverses for them and evaluates the robot's abilities */
    public reload(): ModularRobot {
        this.emptyAllLists()
        this.resetAbilities()
        this.visitNodes(this.sourceBlock)
        this.evaluateAbilities()
        return this
    }

    public update(delta: number) {
        if(this.proxyGlobalBlock != null) {
            if(this.proxyGlobalBlock.image.body == undefined) return //this guy is in fact dead
            if (this.hp <= 0) return
        }

        if (this.proxyGlobalBlock !== null) {
            if (this.proxyGlobalBlock.image.body !== null && this.proxyGlobalBlock.image.body !== undefined) {
                this.sourceBlock.image.setVelocity(this.proxyGlobalBlock.image.body.velocity.x,
                    this.proxyGlobalBlock.image.body.velocity.y)
            }
        }
        let animateBlock = this.scene.animateScene
        if (!this.hasCpu()) {
            animateBlock = false
        }

        this.mine(delta)

        this.updateMovingDirection(animateBlock)

        this.moveToGoal(delta)

        let use = this.getCalculatedEnergyUse()
        this.useEnergy((use * delta) / 1000)
    }

    moveToGoal(delta: number) {
        if (this.goal != null) {

            this.stepToPosition(this.goal)
            let reachedGoal = XY.distance(this.goal, this.getPosition()) < BLOCK_RES*2
            if(!this.lastPos.equals(this.sourceBlock.image.getPosition())) {
                this.timeIdle = 0
            } else {
                this.timeIdle += delta
            }

            if (reachedGoal || this.timeIdle > 1000) {
                this.goal = null
                this.latestWheelBlock?.deactivate()
            }
        }
        this.lastPos = xy(this.sourceBlock.image.x, this.sourceBlock.image.y)
    }

    updateMovingDirection(animateBlock: boolean) {
        let oldPosition = xy(this.getPosition().x, this.getPosition().y)
        this.sourceBlock.update(animateBlock)
        let newPosition = xy(this.getPosition().x, this.getPosition().y)
        if (oldPosition.x != newPosition.x || oldPosition.y != newPosition.y) {
            this.movingDirectionRadians = Phaser.Math.Angle.Between(oldPosition.x, oldPosition.y, newPosition.x, newPosition.y)
        }
    }

    hasCpu(): boolean { 
        return (this.cores > 0)
    }

    hasDrill(): boolean {
        return this.latestDrillPart != null
    }

    public getLastBlock(): ModularBlock {
        return this.allBlocks[this.allBlocks.length-1]
    }

    public addPart(partType: PartType) {
        this.getLastBlock().addPart(this.scene, partType, this)
        return this
    }
    public addBlockType(blockType: BlockType, dir: string = 'down', index: number = -1) {
        if (index == -1) index = this.allBlocks.length-1
        this.addBlock(BlockBuilder.new(this.scene, xy(), blockType, this.allBlocks[index], this), dir, index)
        return this
    }

    public canMine(): Boolean {
        return (this.hasDrill() && this.hasCpu() && this.isMiningThis != null)
    }

    public mine(delta:number) {
        if (this.canMine()) {
            let amt = (MINING_RATE_MS * delta)/1000
            if(this.storageSpace >= this.storedLunestone + this.storedCosmorite + amt) {
                this.latestDrillPart?.activate()
                this.storedCosmorite += amt * GAS_MINE_RATE
                this.storedLunestone += amt * STONE_MINE_RATE
                this.isMiningThis?.takeDamage(amt)
                if (!this.scene.sound.isPlaying("drilling")) {
                    this.scene.sound.play("drilling")
                }
            } else {
                this.stopDrilling()
            }
        } else {
            this.stopDrilling()
        }
        this.isMiningThis = null
    }

    private stopDrilling() {
        this.scene.sound.stopByKey("drilling")
        this.latestDrillPart?.deactivate()
    }

    /** Deep copy a robot. */
    public deepCopy(newX: number | null = null, newY: number | null = null) {
        const pos = this.getPosition()

        const robot = ModularRobot.create(
            this.scene,
            this.sourceBlock.blockType,
            newX ?? pos.x,
            newY ?? pos.y
        )

        this.copyParts(this.sourceBlock, robot.sourceBlock, robot)

        for (const other of this.scene.robots) {
            this.scene.physics.add.collider(other.sourceBlock.image, robot.sourceBlock.image)
        }

        this.copyStep(this.sourceBlock, robot.sourceBlock, robot)

        return robot.reload()
    }

    private copyParts(oldBlock: ModularBlock, newBlock: ModularBlock, robot: ModularRobot) {
        for (const part of oldBlock.modularParts) {
            newBlock.modularParts.push(
                PartBuilder.new(this.scene, part.itemName, newBlock, robot)
            )
        }
    }

    private copyStep(oldParent: ModularBlock, newParent: ModularBlock, robot: ModularRobot) {
        for (const child of oldParent.childBlocks) {
            const newChild = BlockBuilder.new(
                this.scene,
                child.localPos,
                child.blockType,
                newParent,
                robot
            )

            this.copyParts(child, newChild, robot)
            newParent.connectBlock(newChild)
            this.copyStep(child, newChild, robot)
        }
    }

    public addBlock(block:ModularBlock, dir:string, index: number = -1) {
        if (index == -1) {
            this.sourceBlock.connectBlock(block, dir)
        } else {
            this.allBlocks[index].connectBlock(block, dir)
        }
        this.reload()
    }

    public allowMining(cosmoriteOre: HPImage) {
        this.scene.physics.add.overlap(this.getSourceImage(), cosmoriteOre, () => {
            this.isMiningThis = cosmoriteOre
        })
    }

    public addCollider(scene: MainScene, offender: HPImage | Phaser.Physics.Arcade.Image) {
        scene.physics.add.collider(offender, this.sourceBlock.image)
    }

    public addEnemyCollider(offender: HPImage | Phaser.Physics.Arcade.Image) {
        let newColliderGroup: ModularBlock[] = [this.sourceBlock]
        this.sourceBlock.addEnemyCollider(this.scene, offender, newColliderGroup)
        for(const obj of newColliderGroup) {
            for(const obj2 of newColliderGroup) {
                if(obj.id !== obj2.id) {
                    this.scene.physics.add.collider(obj.image, obj2.image)
                }
            }
        }
        return this
    }
    
    public setGoal(pos: XY) {
        this.goal = pos
        this.timeIdle = 0
    }
    
    private stepToPosition(pos: XY) {
        if (this.storedCosmorite != 0 &&
            this.sourceBlock?.image?.body) {

            this.latestWheelBlock?.activate()
            this.scene.physics.moveTo(this.sourceBlock.image, pos.x, pos.y, this.maxSpeed)
        } 
    }

    calcTimeLeft() {
        return this.storedCosmorite / (this.energyUsePerMs * 1000);
    }

    public getSourceImage() {
        return this.sourceBlock.image
    }

    public getMeterRange() {
        return this.storedCosmorite / (this.wheelCount * ENERGY_MS_PER_WHEEL)
    }

    public aim(target: XY) {
        if (!this.hasCpu()) return
        for (const part of this.allModularParts) {
            if(part.partType.assetName == PART_GUN_NAME) {
                part.rotate(
                    Phaser.Math.Angle.Between(
                        part.image.x, part.image.y,
                        target.x, target.y
                    ) + (Phaser.Math.PI_OVER_2) // so things are drawn pointing up
                )
            }
        }
    }

}