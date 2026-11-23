import { BATTERY_SIZE, BLOCK_RES, BLOCK_WHEEL_NAME, DIRECTION_OFFSETS, ENERGY_MS_PER_WHEEL, FACTORY_BLOCK, GAS_MINE_RATE, generateId, LASER_ENERGY_USE, MINING_RATE_MS, PART_CPU_NAME, PART_DRILL_NAME, PART_GUN_NAME, STONE_MINE_RATE, WELDER_PART } from "../main/constants";
import ModularBlock from "./parts-and-blocks/ModularBlock";
import { ModularPart } from "./parts-and-blocks/ModularPart";
import { xy, XY } from "../main/XY";
import { BlockDefinition } from "./parts-and-blocks/BlockDefinition";
import { PartDefinition } from "./parts-and-blocks/PartDefinition";
import HPImage from "../main/HPImage";
import MainScene from "../CodeLuna";
import IGameFighter from "./contracts/IGameFighter";
import * as Phaser from 'phaser'
import CpuPart from "./parts-and-blocks/CpuPart";
import BlockBuilder from "./parts-and-blocks/builderClasses";
import WheelBlock from "./parts-and-blocks/WheelBlock";
import GameGeometry from "../main/GameGeometry";
import FactoryBlock, { PrintStrings } from "./parts-and-blocks/FactoryBlock";
import PythonFunctions, { type RobotFunction } from "../main/PythonFunctions";

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
    public hasMoved = false

    public latestCpuPart: CpuPart | null = null
    public latestDrillPart: ModularPart | null = null
    public isDrilling = false
    public guns: ModularPart[] = []
    public wheels: WheelBlock[] = []
    public factoryBlocks: FactoryBlock[] = []
    public program: PythonFunctions | null = null
    public functions: RobotFunction[] | null = null

    private timeIdle = 0

    goal: XY | null = null
    
    /** assetKey: count, for quick evaluation of abilities */
    private objectCounts: {[key:string]: number} = {}
    private weight = 0;
    private gasCost = 0;
    private stoneCost = 0;

    // Energy
    public baseEnergyUsePerMs = 0
    public maxCharge = 0
    public baseEnergyNeed = 1
    public maxSpeed = 0;
    private wheelCount = 0;
    
    storageSpace = 0;
    get storedCosmorite() {
        return this.blocks.reduce((total, block) => total + block.storedCosmorite, 0)
    }
    set storedCosmorite(amount: number) {
        this.setStoredResource("storedCosmorite", amount)
    }
    get storedLunestone() {
        return this.blocks.reduce((total, block) => total + block.storedLunestone, 0)
    }
    set storedLunestone(amount: number) {
        this.setStoredResource("storedLunestone", amount)
    }
    getFreeStorage() {
        return this.blocks.reduce((total, block) => total + Math.max(
            0, block.blockType.storage - block.storedCosmorite - block.storedLunestone
        ), 0)
    }
    cores = 0;
    canCreate = false;
    canSend = false; canReceive = false;

    /* use create(...) or createFromBlock(...) instead **/
    private constructor(scene: MainScene, position: XY) {
        this.scene = scene
        this.id = generateId();
        this.position = position
        this.lastPos = position
    }

    static create(scene: MainScene, x: number, y: number, blocktype: BlockDefinition = BlockDefinition.sleek) {
        let newRobot = new this(scene, xy(x,y))
        newRobot.addBlock(BlockBuilder.new(scene, xy(), blocktype, newRobot))
        newRobot.addEnemyCollider(scene.player)
        return newRobot
    }

    static createFromBlock(scene: MainScene, sourceBlock: ModularBlock) {
        return this.createFromBlocks(scene, [sourceBlock])
    }

    private static createFromBlocks(scene: MainScene, blocks: ModularBlock[]) {
        const anchor = blocks[0]
        const offset = anchor.localPos
        let newRobot = new this(scene, xy(anchor.image.x, anchor.image.y))
        newRobot.movingDirectionRadians = anchor.robot.movingDirectionRadians
        newRobot.hasMoved = anchor.robot.hasMoved
        for (const block of blocks) {
            block.localPos = block.localPos.subtract(offset)
            newRobot.addBlock(block)
        }
        newRobot.reload()
        newRobot.addEnemyCollider(scene.player)
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
        this.program?.cancel()
        for(const block of this.blocks) {
            block.destroy()
        }
        this.blocks = []
        this.proxyGlobalBlock = null
        this.goal = null
        this.resetAbilities()
        this.scene.robots.robots = this.scene.robots.robots.filter(robot => robot !== this)
    }

    public absorb(robot: ModularRobot, offset: XY) {
        if (robot === this) return this

        const blocks = robot.blocks
        robot.blocks = []
        robot.destroy()

        for (const block of blocks) {
            block.localPos = block.localPos.add(offset)
            this.addBlock(block)
        }
        return this.reload()
    }

    /** A broken block detaches, and any disconnected groups become separate robots. */
    takeDamage(damageAmount: number, target: any) {
        const block = target as ModularBlock
        if (!this.blocks.includes(block)) return
        block.hp = Math.max(0, block.hp - damageAmount)
        block.updateDamageTint()
        if (block.hp > 0) return

        if (this.blocks.length == 1) {
            this.destroy()
        } else {
            block.disconnect(this.scene, this.scene.robots, this)
        }
    }
    getHP(): number {
        return this.blocks.reduce((total, block) => total + block.hp, 0)
    }

    remove(block: ModularBlock) {
        this.blocks = this.blocks.filter(b => !b.equals(block))
        if (block instanceof WheelBlock) block.resetChassis()
        if(this.proxyGlobalBlock == block) {
            this.proxyGlobalBlock = this.blocks[0] ?? null
        }
        this.updateChassis()
        console.log("length after: " + this.blocks.length)
        return block
    }

    public splitDisconnected() {
        const unvisited = new Set(this.blocks)
        const components: ModularBlock[][] = []
        for (const start of this.blocks) {
            if (!unvisited.delete(start)) continue
            const connected = new Set([start])
            const queue = [start]
            for (let i = 0; i < queue.length; i++) {
                const current = queue[i]
                for (const block of unvisited) {
                    const dx = Math.abs(block.localPos.x - current.localPos.x)
                    const dy = Math.abs(block.localPos.y - current.localPos.y)
                    if ((dx == BLOCK_RES && dy == 0) || (dy == BLOCK_RES && dx == 0)) {
                        unvisited.delete(block)
                        connected.add(block)
                        queue.push(block)
                    }
                }
            }
            // Preserve storage fill/drain order rather than the traversal order.
            components.push(this.blocks.filter(block => connected.has(block)))
        }

        if (components.length == 0) {
            this.destroy()
            return
        }
        const retained = components.find(component =>
            this.proxyGlobalBlock != null && component.includes(this.proxyGlobalBlock)
        ) ?? components[0]
        this.blocks = retained
        this.proxyGlobalBlock = this.proxyGlobalBlock && retained.includes(this.proxyGlobalBlock)
            ? this.proxyGlobalBlock : retained[0]
        this.position = xy(this.proxyGlobalBlock.image.x, this.proxyGlobalBlock.image.y)
            .subtract(this.proxyGlobalBlock.localPos)

        for (const component of components) {
            if (component !== retained) {
                this.scene.robots.push(ModularRobot.createFromBlocks(this.scene, component))
            }
        }
        this.reload()
    }

    private setStoredResource(resource: "storedCosmorite" | "storedLunestone", total: number) {
        let change = Math.max(0, total) - this.blocks.reduce((sum, block) => sum + block[resource], 0)
        if (change > 0) {
            for (const block of this.blocks) {
                const free = Math.max(0, block.blockType.storage - block.storedCosmorite - block.storedLunestone)
                const stored = Math.min(change, free)
                block[resource] += stored
                change -= stored
                if (change <= 0) break
            }
        } else {
            for (let i = this.blocks.length - 1; i >= 0 && change < 0; i--) {
                const block = this.blocks[i]
                const drained = Math.min(-change, block[resource])
                block[resource] -= drained
                change += drained
            }
        }
    }

    private resetAbilities() {
        this.stopDrilling()
        this.parts = []
        this.guns = []
        this.wheels = []
        this.factoryBlocks = []
        this.latestCpuPart = null
        this.latestDrillPart = null
        this.objectCounts = {}
        this.weight = 0
        this.storageSpace = 0
        this.gasCost = 0
        this.stoneCost = 0
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
        if (!this.canShoot()) return 0

        this.useEnergy(LASER_ENERGY_USE)
        this.guns.forEach(gun => gun.activate())
        this.guns.forEach(gun => gun.deactivate())
        return LASER_ENERGY_USE
    }

    useEnergy(energyAmount: number) {
        this.storedCosmorite -= energyAmount
        if (this.storedCosmorite < 0) {
            this.storedCosmorite = 0
        }
    }

    getCalculatedEnergyUse(assumeMoving: boolean = false) {
        let energyUsePerMs = this.latestDrillPart?.getEnergyUse() ?? 0
        energyUsePerMs += this.guns[0]?.getEnergyUse() ?? 0 * this.guns.length
        for (const wheel of this.wheels) {
            energyUsePerMs += assumeMoving ? ENERGY_MS_PER_WHEEL : wheel.getEnergyUse()
        }
        return energyUsePerMs
    }

    /** Based on objectCounts, which goes off of object names */
    private evaluateAbilities() {
        for(const [name, count] of Object.entries(this.objectCounts)) {
            const blockType = BlockDefinition.fromAssetKey(name)
            if(blockType !== BlockDefinition.unknown) {
                this.weight += blockType.weight * count
                this.storageSpace += blockType.storage * count
                this.gasCost += blockType.gasCost * count
                this.stoneCost += blockType.stoneCost * count
            } else { //part
                let partType = PartDefinition.fromAssetKey(name)
                this.weight += partType.weight * count
                this.gasCost += partType.gasCost * count
                this.stoneCost += partType.stoneCost * count
            }
            switch(name) {
                case(FACTORY_BLOCK):
                    this.canCreate = true
                    break
                case(BlockDefinition.tread.assetKey):
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
        if (this.wheels.length == 0 && this.blocks.length != 1){
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
                if (part.partType.assetKey == PART_CPU_NAME) {
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
            this.addToObjectCounts(block.assetKey)
            this.registerBlock(block)

            //add to totals
            for (const part of block.modularParts) {
                this.registerPart(part)
                this.addToObjectCounts(part.assetKey)
            }
            
        }
    }

    private updateChassis() {
        for (const wheel of this.blocks) {
            if (!(wheel instanceof WheelBlock)) continue
            wheel.resetChassis()
            for (const block of this.blocks) {
                if (block instanceof WheelBlock) continue
                const diff = block.localPos.subtract(wheel.localPos)
                if ((Math.abs(diff.x) == BLOCK_RES && diff.y == 0) ||
                    (Math.abs(diff.y) == BLOCK_RES && diff.x == 0)) {
                    wheel.createChassis(GameGeometry.directionBetween(wheel.localPos, block.localPos))
                }
            }
        }
    }

    registerPart(part: ModularPart) {
        this.parts.push(part)
        switch (part.assetKey) {
            case PART_DRILL_NAME:
                this.latestDrillPart = part
                break
            case PART_CPU_NAME:
                this.latestCpuPart = part as CpuPart
                this.latestCpuPart.sourceRobot = this
                break
            case PART_GUN_NAME:
                this.guns.push(part)
            default:
                break
        }
    }

    registerBlock(block: ModularBlock) {
        switch (block.assetKey) {
            case BLOCK_WHEEL_NAME:
                this.wheels.push(block as WheelBlock)
                break
            case FACTORY_BLOCK:
                this.factoryBlocks.push(block as FactoryBlock)
                break
            default:
                break
        }
    }

    private recycleEnclosedWelders(): boolean {
        let removed = false
        for (const block of this.blocks) {
            const welders = block.modularParts.filter(part => part.assetKey === WELDER_PART)
            if (welders.length === 0 || !DIRECTION_OFFSETS.every(direction =>
                this.blocks.some(neighbor =>
                    neighbor.localPos.equals(block.localPos.add(direction.multiply(BLOCK_RES)))
                )
            )) continue
            for (const welder of welders) {
                if (!block.removePart(welder)) continue
                this.storedCosmorite += welder.partType.gasCost
                this.storedLunestone += welder.partType.stoneCost
                removed = true
            }
        }
        return removed
    }

    /** Clears out: blocks, objectCounts.
     *  Re-traverses for them and evaluates the robot's abilities */
    public reload(): ModularRobot {
        this.recycleEnclosedWelders()
        this.resetAbilities()
        this.recordBlockData()
        this.updateChassis()
        this.evaluateAbilities()
        return this
    }

    public update(delta: number) {
        if (this.recycleEnclosedWelders()) this.reload()
        this.lastPos = xy(this.getPosition().x, this.getPosition().y)


        if(this.proxyGlobalBlock != null) {
            if(this.proxyGlobalBlock.image.body == undefined) {
                this.stopDrilling()
                return // this guy is in fact dead
            }
            if (this.getHP() <= 0) {
                this.stopDrilling()
                return
            }
        }
        this.program?.update(delta)
        if (this.blocks.length === 0) return
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
        if (this.lastPos.x != this.position.x || this.lastPos.y != this.position.y) {
            this.movingDirectionRadians = Phaser.Math.Angle.Between(this.lastPos.x, this.lastPos.y, this.position.x, this.position.y)
            this.hasMoved = true
        }
        for (const block of this.blocks) {
            block.update(this.scene.animateScene)
        }
        this.mine(delta)

        this.moveToGoal(delta)

        const energyUsePerMs = this.getCalculatedEnergyUse()
        this.useEnergy((energyUsePerMs * delta) / 1000)
    }

    move(x:number, y: number) {
        this.setGoal(xy(this.getPosition().x + x, this.getPosition().y + y))
    }

    place(xOffset:number, yOffset: number, factoryBlockIndex = 0): boolean {
        if(this.factoryBlocks.length -1 >= factoryBlockIndex) {
            let block = this.factoryBlocks[factoryBlockIndex]
            block.setDirection(xOffset, yOffset)
            let response = block.print()
            return (response == PrintStrings.success)
        }
        return false
    }

    selectBlock(blockName: string = "aluminum") {
        for (const block of this.factoryBlocks) {
            block.selectBlock(blockName)
        }
    }

    wait(seconds: number) {

    }

    moveToGoal(delta: number) {
        if (this.goal != null) {

            this.stepToPosition(this.goal)
            let reachedGoal = XY.distance(this.goal, this.position) < BLOCK_RES*2
            if(!this.lastPos.equals(this.position)) {
                this.timeIdle = 0
            } else {
                this.timeIdle += delta
            }

            if (reachedGoal || this.timeIdle > 1000) {
                this.goal = null
                this.wheels.forEach((wheel) => {wheel.deactivate()})
            }
        }
        const driving = this.goal !== null && this.storedCosmorite > 0 && this.maxSpeed > 0
        for (const block of this.blocks) {
            const body = block.image.body
            if (body instanceof Phaser.Physics.Arcade.Body) body.allowDrag = !driving
        }
    }

    hasCpu(): boolean { 
        return (this.cores > 0)
    }

    hasDrill(): boolean {
        return this.latestDrillPart != null
    }

    public getLastBlock(): ModularBlock | null {
        if (this.blocks.length == 0) return null
        return this.blocks[this.blocks.length-1]
    }

    public addPart(partType: PartDefinition) {
        this.getLastBlock()?.addPart(this.scene, partType, this)
        return this
    }
    public addBlockType(blockType: BlockDefinition, x: number = 0, y: number = 0) {
        const offset = xy(x*BLOCK_RES,y*BLOCK_RES)
        this.addBlock(BlockBuilder.new(this.scene, offset, blockType, this))
        return this
    }

    public canMine(): boolean {
        return this.getTouchingDrill() != null
    }

    private getTouchingDrill(): { drill: ModularPart, site: HPImage } | null {
        for (const drill of this.parts) {
            if (drill.assetKey !== PART_DRILL_NAME || drill.parentBlock.robot !== this ||
                !this.blocks.includes(drill.parentBlock) ||
                !drill.image.active || !drill.image.visible || !drill.image.body?.enable) continue
            const bounds = drill.image.getBounds()
            for (const site of this.scene.mineSites) {
                if (site.active && site.visible && site.body?.enable && !site.isDead() &&
                    Phaser.Geom.Intersects.RectangleToRectangle(bounds, site.getBounds())) {
                    return { drill, site }
                }
            }
        }
        return null
    }

    public mine(delta:number) {
        const contact = this.getTouchingDrill()
        if (contact) {
            const { drill, site } = contact
            const minedAmount = (MINING_RATE_MS * delta)/1000
            if(this.storageSpace >= this.storedLunestone + this.storedCosmorite + minedAmount) {
                this.latestDrillPart?.deactivate()
                this.latestDrillPart = drill
                drill.activate()
                this.storedCosmorite += minedAmount * GAS_MINE_RATE
                this.storedLunestone += minedAmount * STONE_MINE_RATE
                site.takeDamage(minedAmount)
                this.isDrilling = true
            } else {
                this.stopDrilling()
            }
        } else {
            this.stopDrilling()
        }
    }

    private stopDrilling() {
        this.isDrilling = false
        this.latestDrillPart?.deactivate()
    }

    /** Deep copy a robot. */
    public deepCopy(newX: number | null = null, newY: number | null = null) {
        const sourcePosition = this.getPosition()

        const newRobot = ModularRobot.create(
            this.scene,
            newX ?? sourcePosition.x,
            newY ?? sourcePosition.y
        )

        for (const block of this.blocks) {
            let newBlock = BlockBuilder.new(this.scene, block.localPos, block.blockType, newRobot)
            for (const part of block.modularParts) {
                newBlock.addPart(this.scene, part.partType, newRobot)
            }
            newRobot.addBlock(newBlock)
        }
        return newRobot.reload()
    }

    /** Adds a block using an offset in this robot's local grid. */
    public addBlock(block:ModularBlock) {
        block.robot = this
        block.globalPos = this.position.add(block.localPos)
        block.image.setPosition(block.globalPos.x, block.globalPos.y)
        const velocity = this.proxyGlobalBlock?.image.body?.velocity
        if (velocity) block.image.setVelocity(velocity.x, velocity.y)
        for (const part of block.modularParts) {
            if (part instanceof CpuPart) part.sourceRobot = this
            part.update(false)
        }
        block.updateFreshness()

        if(this.blocks.length == 0) {
            this.proxyGlobalBlock = block
        }
        this.blocks.push(block)
        this.updateChassis()
        this.scene.uiCamera.ignore(block.image)
        this.scene.robots?.registerBlocks(this)
        return this
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
    
    public weld() {
        this.scene.robots.connectWeldingBlocks(this)
    }

    public setGoal(goalPosition: XY) {
        this.goal = goalPosition
        this.timeIdle = 0
    }
    
    private stepToPosition(targetPosition: XY) {
        if (this.storedCosmorite != 0) {

            this.wheels.forEach((wheel) => wheel.activate())

            let angle = Phaser.Math.Angle.Between(
                this.position.x,
                this.position.y,
                targetPosition.x,
                targetPosition.y
            )

            this.blocks.forEach(block => {
                block.image.setVelocity(
                    Math.cos(angle) * this.maxSpeed,
                    Math.sin(angle) * this.maxSpeed)
            })
        } 
    }

    public getMeterRange() {
        if (this.storedCosmorite <= 0 || this.maxSpeed <= 0) return 0
        const drivingEnergyPerSecond = this.getCalculatedEnergyUse(true)
        const speedMetersPerSecond = this.maxSpeed / BLOCK_RES
        return (this.storedCosmorite / drivingEnergyPerSecond) * speedMetersPerSecond
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