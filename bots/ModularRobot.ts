import { BATTERY_SIZE, BLOCK_RES, BLOCK_WHEEL_NAME, ENERGY_MS_PER_WHEEL, FACTORY_BLOCK, GAS_MINE_RATE, generateId, LASER_ENERGY_USE, MINING_RATE_MS, PART_CPU_NAME, PART_DRILL_NAME, PART_GUN_NAME, STONE_MINE_RATE } from "../main/constants";
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
import BlockBuilder from "./parts/builderClasses";
import WheelBlock from "./parts/WheelBlock";
import Logic from "../main/logic";

/**
 * Holds larger robot data, such as the supposed source block,
 * sum vars like total weight, and available modular parts
 */
export default class ModularRobot implements IGameFighter{
    scene: MainScene
    readonly id: number;
    public position: XY
    private lastPos = xy()
    public proxyGlobalBlock: ModularBlock | null = null
    public blocks: ModularBlock[] = []
    public parts: ModularPart[] = []
    public movingDirectionRadians = 0

    public latestCpuPart: CpuPart | null = null
    public latestDrillPart: ModularPart | null = null
    public guns: ModularPart[] = []
    public wheels: WheelBlock[] = []

    private timeIdle = 0

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
    canCreate = false;
    canSend = false; canReceive = false;

    /* use create(...) or createFromBlock(...) instead **/
    private constructor(scene: MainScene, position: XY, startingBlockType: BlockType = BlockType.sleek) {
        this.scene = scene
        this.id = generateId();
        this.position = position
        this.lastPos = position
        this.addBlock(BlockBuilder.new(scene, xy(), startingBlockType, this))
            .addEnemyCollider(scene.player)
    }

    static create(scene: MainScene, x: number, y: number, blocktype: BlockType = BlockType.sleek) {
        let newRobot = new this(scene, xy(x,y), blocktype)
        return newRobot
    }

    static createFromBlock(scene: MainScene, sourceBlock: ModularBlock) {
        let newRobot = new this(scene, sourceBlock.globalPos, sourceBlock.blockType)
        return newRobot
    }
    
    /** Position is based on the source block */
    getPosition() {
        return this.position;
    }

    getHitboxes(): HPImage[] {
        return this.blocks.map(block => block.image)
    }

    equals(other:ModularRobot) {
        return other.id == this.id
    }

    /** drop resources and remove self from robot list */
    destroy() {
        for(const block of this.blocks) {
            block.destroy()
        }
        this.scene.robots.robots = this.scene.robots.robots.filter(robot => robot !== this)
    }

    /** Hitting a robot block immediately converts the block into a separate robot */
    takeDamage(amt: number, target: any) {
        try {
            console.log("took damage")
            const block: ModularBlock = target as ModularBlock
            block.hp-= amt
            if(block.hp <= 0) {
                if (this.blocks.length == 1) {
                    this.destroy()
                } else {
                    this.remove(block)
                    block.disconnect(this.scene, this.scene.robots, this)
                    // block.resetHP()
                }
                this.reload()
            }
        } catch { 
        }
    }
    getHP(): number {
        return this.hp
    }

    remove(block: ModularBlock) {
        console.log("length: " + this.blocks.length)
        if(this.proxyGlobalBlock == block) {
            this.proxyGlobalBlock = null
        }
        this.blocks = this.blocks.filter(b => !b.equals(block))
        console.log("length after: " + this.blocks.length)
        return block
    }

    private resetAbilities() {
        this.objectCounts = {}
        this.weight = 0
        this.storageSpace = 0
        this.gasCost = 0
        this.stoneCost = 0
        this.energyUsePerMs = 0
        this.wheelCount = 0
        this.maxSpeed = 0
        this.maxCharge = 0
        this.cores = 0
        this.canCreate = false
        this.canSend = false; this.canReceive = false
    }

    canShoot() {
        return (this.guns.length > 0 && this.hasCpu() && this.storedCosmorite - LASER_ENERGY_USE >= 0)
    }

    canMove() {
        return (this.wheels.length > 0)
    }

    shootLaser() {
        if (this.canShoot()) {
            this.guns.forEach(gun => gun.activate())
        }
        this.guns.forEach(gun => gun.deactivate())
        return 1
    }

    useEnergy(amt: number) {
        this.storedCosmorite -= amt
        if (this.storedCosmorite < 0) {
            this.storedCosmorite = 0
        }
    }

    getCalculatedEnergyUse() {
        let use = this.latestDrillPart?.getEnergyUse() ?? 0
        use += this.guns[0]?.getEnergyUse() ?? 0 * this.guns.length
        for (const wheel of this.wheels) {
            use += wheel.getEnergyUse()
        }
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
                case(FACTORY_BLOCK):
                    this.canCreate = true
                    break
                case('block-tread'):
                    this.wheelCount = 2 * count
                    break
                case(BLOCK_WHEEL_NAME):
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

    private calculateSpeed() {
        this.maxSpeed = Math.max(0, (this.wheelCount * 120)/this.weight)
        if (this.wheelCount < 3) {
            this.maxSpeed = this.maxSpeed / (5-this.wheelCount)
        } else if (this.wheelCount == 3) {
            this.maxSpeed = this.maxSpeed / 2
        }
    }
    private propagateResistance() {
        if (this.maxSpeed == 0 && this.blocks.length != 1){
            this.blocks.forEach(block => {
                block.image.setImmovable(true)
            });
        } 
        else {
            let massMult = 10
            const finalMass = Math.max(1, 
                (this.weight - this.maxSpeed))
            if(this.maxSpeed == 0 && this.blocks.length == 1 ) {
                massMult *= 3 
            }
            for(const block of this.blocks) {
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

    public getCpuPart(): CpuPart | null {
        if (this.latestCpuPart == null) {
            for (const part of this.parts) {
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
    private recordBlockData() {
        for (const block of this.blocks) {
            this.addToObjectCounts(block.itemName)
            this.registerBlock(block)

            //add to totals
            for (const part of block.modularParts) {
                this.registerPart(part)
                this.addToObjectCounts(part.itemName)
            }
            
            // getting chassis rotation:
            for (const wheel of this.wheels) {
                for(const block of this.blocks) {
                    if (block.itemName == BLOCK_WHEEL_NAME) continue
                    let diff = wheel.localPos.subtract(block.localPos)
                    if(Math.abs(diff.x) + Math.abs(diff.y) == BLOCK_RES) {
                        const dir = Logic.getDir(block.localPos, wheel.localPos)
                        wheel.rotateChassis(dir)
                    }
                }
            }
        }
    }

    registerPart(part: ModularPart) {
        switch (part.itemName) {
            case PART_DRILL_NAME:
                this.allowMining(this.scene.cosmoriteOre, part)
                break
            case PART_CPU_NAME:
                this.latestCpuPart = part as CpuPart
                break
            case PART_GUN_NAME:
                this.guns.push(part)
            default:
                break
        }
    }

    notifyOfCosmorite() {
        if (this.latestDrillPart != null) {
            this.allowMining(this.scene.cosmoriteOre, this.latestDrillPart)
        }
    }

    registerBlock(block: ModularBlock) {
        switch (block.itemName) {
            case BLOCK_WHEEL_NAME:
                this.wheels.push(block as WheelBlock)
                break
            default:
                break
        }
    }

    /** Clears out: blocks, objectCounts.
     *  Re-traverses for them and evaluates the robot's abilities */
    public reload(): ModularRobot {
        this.resetAbilities()
        this.recordBlockData()
        this.evaluateAbilities()
        return this
    }

    public update(delta: number) {
        this.lastPos = xy(this.getPosition().x, this.getPosition().y)


        if(this.proxyGlobalBlock != null) {
            if(this.proxyGlobalBlock.image.body == undefined) return // this guy is in fact dead
            if (this.hp <= 0) return
        }
        let proxy = this.proxyGlobalBlock

        if (proxy?.image.body) {
            proxy.globalPos = xy(proxy.image.x, proxy.image.y)
            this.position = proxy.globalPos.subtract(proxy.localPos)

            for (const block of this.blocks) {
                block.globalPos = this.position.add(block.localPos)

                if (block !== proxy) {
                    block.image.setPosition(block.globalPos.x, block.globalPos.y)
                    block.image.setVelocity(
                        proxy.image.body.velocity.x,
                        proxy.image.body.velocity.y
                    )
                }
            }
        }
        let animateBlock = this.scene.animateScene
        if (!this.hasCpu()) {
            animateBlock = false
        }

        this.mine(delta)

        for (const block of this.blocks) {
            block.update(animateBlock)
        }
        if (this.lastPos.x != this.position.x || this.lastPos.y != this.position.y) {
            this.movingDirectionRadians = Phaser.Math.Angle.Between(this.lastPos.x, this.lastPos.y, this.position.x, this.position.y)
        }

        this.moveToGoal(delta)

        let use = this.getCalculatedEnergyUse()
        this.useEnergy((use * delta) / 1000)
    }

    moveToGoal(delta: number) {
        if (this.goal != null) {

            this.stepToPosition(this.goal)
            let reachedGoal = XY.distance(this.goal, this.position) < BLOCK_RES*2
            if(!this.lastPos.equals(this.position)) {
                this.timeIdle = 0
            } else {
                console.log("BEFORE: " + this.lastPos + ", AFTER: " + this.position )
                this.timeIdle += delta
            }

            if (reachedGoal || this.timeIdle > 1000) {
                this.goal = null
                this.wheels.forEach((wheel) => {wheel.deactivate()})
            }
        }
    }

    hasCpu(): boolean { 
        return (this.cores > 0)
    }

    hasDrill(): boolean {
        return this.latestDrillPart != null
    }

    public getLastBlock(): ModularBlock | null {
        console.log(this.blocks.length)
        if (this.blocks.length == 0) return null
        return this.blocks[this.blocks.length-1]
    }

    public addPart(partType: PartType) {
        this.getLastBlock()?.addPart(this.scene, partType, this)
        return this
    }
    public addBlockType(blockType: BlockType, x: number = 0, y: number = 0) {
        const offset = xy(x*BLOCK_RES,y*BLOCK_RES)
        this.addBlock(BlockBuilder.new(this.scene, offset, blockType, this))
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

        const newRobot = ModularRobot.create(
            this.scene,
            newX ?? pos.x,
            newY ?? pos.y
        )

        for (const block of this.blocks) {
            let newBlock = new ModularBlock(this.scene, pos.add(block.localPos), block.blockType, newRobot)
            for (const part of block.modularParts) {
                newBlock.addPart(this.scene, part.partType, newRobot)
            }
            newRobot.addBlock(newBlock)
        }
        for (const other of this.scene.robots) {
            this.scene.physics.add.collider(other.blocks[0].image, newRobot.blocks[0].image)
        }
        return newRobot
    }

    /** Takes the block's position and rounds it to our robot's block grid */
    public addBlock(block:ModularBlock) {
        let gridOffset = xy(this.position.x % BLOCK_RES, this.position.y % BLOCK_RES)
        block.globalPos = block.globalPos.subtract(gridOffset)

        if(this.blocks.length == 0) {
            this.proxyGlobalBlock = block
        }
        this.blocks.push(block)
        this.scene.uiCamera.ignore(block.image)
        return this
    }

    private allowMining(cosmoriteOre: HPImage, drillPart: ModularPart) {
        this.latestDrillPart = drillPart
        this.scene.physics.add.overlap(this.latestDrillPart.image, cosmoriteOre, () => {
            this.isMiningThis = cosmoriteOre
        })
    }

    public addCollider(scene: MainScene, offender: HPImage | Phaser.Physics.Arcade.Image) {
        scene.physics.add.collider(offender, this.blocks[0].image)
    }

    public addEnemyCollider(offender: HPImage | Phaser.Physics.Arcade.Image) {
        if (this.blocks.length == 0) return this
        for (const block of this.blocks) {
            block.addEnemyCollider(this.scene, offender)
        }
        return this
    }
    
    public setGoal(pos: XY) {
        this.goal = pos
        this.timeIdle = 0
    }
    
    private stepToPosition(pos: XY) {
        if (this.storedCosmorite != 0) {

            this.wheels.forEach((wheel) => wheel.activate())

            let angle = Phaser.Math.Angle.Between(
                this.position.x,
                this.position.y,
                pos.x,
                pos.y
            )

            this.blocks.forEach(block => {
                block.image.setVelocity(
                    Math.cos(angle) * this.maxSpeed,
                    Math.sin(angle) * this.maxSpeed)
            })
        } 
    }

    calcTimeLeft() {
        return this.storedCosmorite / (this.energyUsePerMs * 1000);
    }

    public getMeterRange() {
        return this.storedCosmorite / (this.wheelCount * ENERGY_MS_PER_WHEEL)
    }

    public aim(target: XY) {
        if (!this.hasCpu()) return
        for (const gun of this.guns) {
            gun.rotate(
                Phaser.Math.Angle.Between(
                    gun.image.x, gun.image.y,
                    target.x, target.y
                ) + (Phaser.Math.PI_OVER_2) // so things are drawn pointing up
            )
        }
    }

}