/// <reference types="vite/client" />
// "npx vite" to run this. Vite starts with index.html

import * as Phaser from 'phaser'
import MainStats from "./player/MainStats"
import Player from "./player/Player"
import PlayerBase from "./player/PlayerBase"
import GUI from "./gui/gui"
import HPImage from './main/HPImage'
import { BASIC_ASSET_NAMES, WINDOW, BLOCK_RES, LASER_TEST_MS, FRAME_TIME_MS, BASE_POS, GAME_SPEED, REFINEMENT_RATE_MS, MINING_RATE_MS, GAS_MINE_RATE, STONE_MINE_RATE, COSMORITE_ORE, TWO_FRAME_ASSETS, F1, F0, BLOCK_NAMES } from './main/constants'
import IGameFighter from './bots/contracts/IGameFighter'
import { XY, xy } from './main/XY'
import LaserShot from './bots/LaserShot'
import Controls from './player/Controls'
import ModularRobots from './bots/ModularRobots'
import GameGeometry from './main/GameGeometry'
import ModularRobot from './bots/ModularRobot'
import { BlockDefinition } from './bots/parts-and-blocks/BlockDefinition'
import ModularBlock from './bots/parts-and-blocks/ModularBlock'
import RobotCache from './main/RobotCache'
import PublicChat from './main/PublicChat'

export default class MainScene extends Phaser.Scene {
    player!: Player
    private ground!: Phaser.GameObjects.TileSprite
    robots!: ModularRobots
    lasers: LaserShot[] = []
    playerBase!: PlayerBase
    cosmoriteOre!: HPImage
    mineSites: HPImage[] = []
    mainStats!: MainStats
    readonly chat = new PublicChat()
    GUI!: GUI
    uiCamera!: Phaser.Cameras.Scene2D.Camera
    worldLayer!: Phaser.GameObjects.Layer
    private playerCollisionBodies = new Map<Phaser.Physics.Arcade.Body, boolean>()

    private controls!: Controls
    typing = false

    animateScene = false
    prevFrameTime: number = 0
    private prevShotTime: number = 0
    private robotCache!: RobotCache
    private lastRobotSave = 0

    laserSound!: HTMLAudioElement
    painSound!: HTMLAudioElement
    drillSound!: Phaser.Sound.BaseSound

    constructor() {
        super('MainScene')
    }

    preload() {
        const prefix = `${import.meta.env.BASE_URL}assets/`
        const suffix = '.png'
        BASIC_ASSET_NAMES.forEach(asset => {
            this.load.image(asset, (prefix + asset + suffix))
        });
        BLOCK_NAMES.forEach(asset => {
            this.load.image(asset, (prefix + "block/" + asset + suffix))
        });
        TWO_FRAME_ASSETS.forEach(asset => {
            this.load.image(asset + F0, (prefix + asset + F0 + suffix))
            this.load.image(asset + F1, (prefix + asset + F1 + suffix))
        })
        
        let audioPre = prefix + "audio/"
        this.load.audio("laser", audioPre + "laser.mp3")
        this.load.audio("pain", audioPre + "pain.mp3")
        this.load.audio("drilling", audioPre + "drilling.wav", {loop: true, volume: 0.5})
        this.load.audio("weld", audioPre + "weld.mp3")
        this.load.audio("cancelled", audioPre + "cancelled.mp3")
        this.painSound = new Audio(prefix + "audio/pain.mp3")
    }
    
    create() {
        this.drillSound = this.sound.add("drilling", { loop: true, volume: 0.5 })
        this.input.setTopOnly(true)
        /// CAMERA ///
        const camera = this.cameras.main
        camera.setZoom(2)
        const zoomSpeed = 0.005

        this.input.on('wheel', (
            _pointer: Phaser.Input.Pointer, 
            _gameObjects: Phaser.GameObjects.GameObject[], 
            _deltaX: number, 
            deltaY: number
            ) => {

            let newZoom = camera.zoom - deltaY * zoomSpeed
            newZoom = Phaser.Math.Clamp(newZoom, 0.1, 3)

            camera.setZoom(newZoom)
        })

        /// UI CAMERA /// : is unmoving
        this.uiCamera = this.cameras.add(0,0,WINDOW.x, WINDOW.y)
        this.uiCamera.setZoom(1)
        if (this.physics.world.debugGraphic != undefined)
        this.uiCamera.ignore(this.physics.world.debugGraphic) // no hitboxes double-rendered
        this.worldLayer = this.add.layer()
        this.uiCamera.ignore(this.worldLayer)
        this.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, () => {
            for (const [body, immovable] of this.playerCollisionBodies) body.setImmovable(immovable)
            this.playerCollisionBodies.clear()
        })

        /// GUI and Stats ///
        this.mainStats = new MainStats(10,10, () => this.cancelAction())
        this.GUI = new GUI(this, this.mainStats)
        camera.ignore(this.GUI.getUILayer())

        this.createGround()

        this.createPlayer()

        this.createBase(BASE_POS.x, BASE_POS.y)

        this.robots = new ModularRobots(this)

        /// Player Firing Laser
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.controls.onNonButtonClick(pointer)
        })
        
        this.createOre(500, 300)
        this.robotCache = new RobotCache(this, () => this.GUI.showSaveWarning())
        if (!this.robotCache.load()) this.robots.debug_createRobot()
        const saveRobots = () => this.robotCache.save()
        const saveWhenHidden = () => {
            if (document.visibilityState === "hidden") saveRobots()
        }
        window.addEventListener("pagehide", saveRobots)
        document.addEventListener("visibilitychange", saveWhenHidden)
        this.events.once("shutdown", () => {
            saveRobots()
            window.removeEventListener("pagehide", saveRobots)
            document.removeEventListener("visibilitychange", saveWhenHidden)
        })
        
        this.controls = new Controls(this, this.player)
    }

    addWorldObject(object: Phaser.GameObjects.GameObject) {
        if (!this.worldLayer.list.includes(object)) this.worldLayer.add(object)
    }

    cancelAction() {
        if (!this.sound.get("cancelled")?.isPlaying) this.sound.play("cancelled")
    }

    isPlayerMoving() {
        return this.controls?.isMoving() ?? false
    }

    preventPlayerPush(body: Phaser.Physics.Arcade.Body) {
        if (!this.playerCollisionBodies.has(body)) this.playerCollisionBodies.set(body, body.immovable)
        body.setImmovable(true)
    }

    restorePlayerCollision(body: Phaser.Physics.Arcade.Body) {
        const immovable = this.playerCollisionBodies.get(body)
        if (immovable === undefined) return
        body.setImmovable(immovable)
        this.playerCollisionBodies.delete(body)
    }

    createGround() {
        this.ground = this.add.tileSprite(
            0, 600, 5000, 5000, 'tile-ground'
        )
        this.ground.setDepth(-100)
        this.addWorldObject(this.ground)
    }

    createOre(x = 0, y = 0) {
        const ore = new HPImage(this, x, y, COSMORITE_ORE, false)
            .setImmovable(true)
        this.cosmoriteOre = ore
        this.mineSites.push(ore)
        
        this.physics.add.collider(this.player, ore, () => {
            ore.isOverlapped = true;
        })
    }

    getNearestMineSite(position: XY, range = Infinity): HPImage | null {
        let nearest: HPImage | null = null
        let distance = range
        for (const site of this.mineSites) {
            if (!site.active || !site.visible || !site.body?.enable || site.isDead()) continue
            const nextDistance = Phaser.Math.Distance.Between(position.x, position.y, site.x, site.y)
            if (nextDistance <= distance) {
                nearest = site
                distance = nextDistance
            }
        }
        return nearest
    }

    createPlayer() {
        this.player = new Player(this, 400, 350, 'player/down-f0')
    }

    createBase(x:number, y:number) {
        this.playerBase = new PlayerBase(this, x, y)
    }
    
    update(_time: number, delta: number) {
        if(_time > this.prevShotTime + LASER_TEST_MS) {
            this.prevShotTime = _time
        }

        if(_time > this.prevFrameTime + FRAME_TIME_MS) {
            this.animateScene = true
            this.prevFrameTime = _time
        }
        
        this.controls.updateMovement(GAME_SPEED)

        if (this.controls.spaceJustDown()) {
            this.debug_shootAllLasers()
        }

        for (const laser of this.lasers) {
            laser.update(delta)
        }
        // remove dead bolts!
        this.lasers = this.lasers.filter(laser => !laser.dead)

        /// MINING ///
        for (const site of this.mineSites) {
            if (!site.isOverlapped) continue
            if (site.isDead()) {
                site.randomTeleport(800)
                site.respawn()
            } else {
                const minedAmount = (MINING_RATE_MS * delta)/1000
                this.mainStats.incCosmorite(minedAmount * GAS_MINE_RATE)
                this.mainStats.incLunestone(minedAmount * STONE_MINE_RATE)
                site.takeDamage(minedAmount/10)
            }
            site.isOverlapped = false
        }

        /// BASE GUI ///
        if(this.playerBase.isOverlapped) {
            this.GUI.toggleBaseGUI(true)
            this.player.setVisible(!this.GUI.baseGUI.isVisible)

            this.playerBase.isOverlapped = false
        } else {
            this.GUI.toggleBaseGUI(false)
            this.player.setVisible(true)
        }
        this.GUI.update()

        this.mainStats.deltaDrainGas(delta)

        /// ROBOT POSITIONS ///
        for(const robotI of this.robots) {
            robotI.update(delta)
            robotI.aim(this.player.getPosition())
        }
        this.robots.connectWeldingBlocks()
        this.robots.connectFreshBlocks()
        if (_time - this.lastRobotSave >= 1000) {
            this.lastRobotSave = _time
            this.robotCache.save()
        }

        const isAnyRobotDrilling = this.robots.robots.some(robot => robot.isDrilling)
        if (isAnyRobotDrilling && !this.drillSound.isPlaying) {
            this.drillSound.play()
        } else if (!isAnyRobotDrilling && this.drillSound.isPlaying) {
            this.drillSound.stop()
        }

        this.animateScene = false
    }

    public async debug_shootAllLasers() {
        for (const robot of this.robots) {
            if (robot.canShoot()) {
                this.shootAtObject(robot, this.player)
            }
        }
    }

    public async shootAtObject(shooter: IGameFighter, target: IGameFighter) {
        shooter.aim(target.getPosition())
        const energyCost = shooter.shootLaser()
        if (energyCost > 0) {
            if (shooter instanceof ModularRobot) {
                for (const gun of shooter.guns) {
                    new LaserShot(this, shooter, [target], undefined, gun.image.getPosition())
                }
            } else {
                new LaserShot(this, shooter, [target])
            }
        }
    }

    public async shootAtMousePosition(shooter: IGameFighter, pointer: Phaser.Input.Pointer) {
        this.shootAtPosition(shooter, xy(pointer.worldX, pointer.worldY))
    }

    public async shootAtPosition(shooter: IGameFighter, targetPosition: XY) {
        const energyCost = shooter.shootLaser()
        if (energyCost > 0) {
            new LaserShot(this, shooter, this.robots.robots, targetPosition)
        } else this.cancelAction()
    }

    public async weldAtMousePosition(sourceImage: HPImage, pointer: Phaser.Input.Pointer) {
        // ensure they are both close enough to position
        console.log(sourceImage.getPosition() + " as player, clicked at: " + pointer.worldX + ", " + pointer.worldY)
        const distanceFromPlayer = GameGeometry.distanceFromPointer(sourceImage, pointer)
        if (distanceFromPlayer > BLOCK_RES * 6) {
            this.cancelAction()
            return
        }
        // find 2 nearest robots and the nearest blocks within them
        let nearestBlocks: ModularBlock[] = []
        for (const robot of this.robots) {
            let nearestBlock: ModularBlock | null = null
            let nearestDistance = BLOCK_RES * 2
            for (const block of robot.blocks) {
                const distanceToClick = GameGeometry.distanceBetween(
                    block.image.getPosition(), xy(pointer.worldX, pointer.worldY)
                )
                if (distanceToClick < nearestDistance) {
                    nearestBlock = block
                    nearestDistance = distanceToClick
                }
            }
            if (nearestBlock) nearestBlocks.push(nearestBlock)
        }
        const clickPosition = xy(pointer.worldX, pointer.worldY)
        nearestBlocks.sort((a, b) =>
            GameGeometry.distanceBetween(a.image.getPosition(), clickPosition)
                - GameGeometry.distanceBetween(b.image.getPosition(), clickPosition))
        // Weld nearby robots, or repair a directly clicked block on a lone robot.
        if (nearestBlocks.length >= 2) {
            let blockA = nearestBlocks[0]
            let blockB = nearestBlocks[1]
            if (!blockA.connectRobotAt(blockB)) this.cancelAction()
        } else if (nearestBlocks.length == 1) {
            const block = nearestBlocks[0]
            if (block.hp < block.maxHP && block.image.getBounds().contains(clickPosition.x, clickPosition.y)) {
                block.resetHP()
                this.sound.play("weld")
            } else this.cancelAction()
        } else this.cancelAction()
    }

    public debug_summonBlock(sourceImage: HPImage, pointer: Phaser.Input.Pointer) {
        const distanceFromPlayer = GameGeometry.distanceFromPointer(sourceImage, pointer)
        if (distanceFromPlayer > BLOCK_RES * 6) {
            this.cancelAction()
            return
        }
        if (this.mainStats.getLunestone() >= 1) {
            this.mainStats.incLunestone(-1)
            const x = Math.round(pointer.worldX/BLOCK_RES) * BLOCK_RES
            const y = Math.round(pointer.worldY/BLOCK_RES) * BLOCK_RES
            this.robots.push(ModularRobot.create(this, x, y, BlockDefinition.factory)
                .addEnemyCollider(this.player))
        } else this.cancelAction()
    }
    public debug_summonRobot() {
        let newRobot = this.robots.get(0).deepCopy(200,200)
        newRobot.addEnemyCollider(this.player)
        this.robots.push(newRobot)
    }
    debug_getMineSiteXY() {
        return this.cosmoriteOre.getPosition()
    }

}

const config: Phaser.Types.Core.GameConfig = {
    parent: "game",
    type: Phaser.AUTO,
    width: WINDOW.x,
    height: WINDOW.y,
    backgroundColor: '#444444',
    physics: {
        default: "arcade",
        arcade: {
            debug: false //show hitboxes
        }
    },
    scale: {
        // mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH 
    },
    scene: MainScene
}

new Phaser.Game(config)
