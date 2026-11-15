// "npx vite" to run this. Vite starts with index.html

import * as Phaser from 'phaser'
import MainStats from "./main/MainStats"
import Player, { PlayerState } from "./main/Player"
import Base from "./main/Base"
import GUI from "./main/gui"
import HPImage from './main/HPImage'
import { BASIC_ASSET_NAMES, WINDOW, BLOCK_RES, LASER_TEST_MS, FRAME_TIME_MS, BASE_POS, GAME_SPEED, REFINEMENT_RATE_MS, MINING_RATE_MS, COSMORITE_ORE, TWO_FRAME_ASSETS, F1, F0, BLOCK_DEPTH, FACTORY_BLOCK } from './main/constants'
import IGameFighter from './bots/contracts/IGameFighter'
import pos, { XY, xy } from './main/xy'
import LaserShot from './bots/LaserShot'
import Controls from './main/Controls'
import ModularRobots from './bots/ModularRobots'
import Logic from './main/logic'
import ModularRobot from './bots/ModularRobot'
import { BlockType } from './bots/parts/BlockType'
import ModularBlock from './bots/parts/ModularBlock'
import { PartType } from './bots/parts/PartType'

export default class MainScene extends Phaser.Scene {
    public player!: Player
    private ground!: Phaser.GameObjects.TileSprite
    public robots!: ModularRobots
    public lasers: LaserShot[] = []
    public base!: Base
    public cosmoriteOre!: HPImage
    public mainStats!: MainStats
    public GUI!: GUI
    public uiCamera!: Phaser.Cameras.Scene2D.Camera
    public baseLayer: Phaser.GameObjects.GameObject[] = []

    private controls!: Controls
    public typing = false

    public animateScene = false
    public prevFrameTime: number = 0
    private prevShotTime: number = 0

    laserSound!: HTMLAudioElement
    painSound!: HTMLAudioElement
    drillSound!: HTMLAudioElement

    constructor() {
        super('MainScene')
    }

    preload() {
        let prefix = 'assets/'
        let suffix = '.png'
        BASIC_ASSET_NAMES.forEach(asset => {
            this.load.image(asset, (prefix + asset + suffix))
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
        this.painSound = new Audio(prefix + "audio/pain.mp3")
    }

    create() {
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

        /// GUI and Stats ///
        this.mainStats = new MainStats(10,10)
        this.GUI = new GUI(this, this.mainStats)
        camera.ignore(this.GUI.getUILayer())

        this.createGround()

        this.createPlayer()

        this.createBase(BASE_POS.x, BASE_POS.y)

        this.robots = new ModularRobots(this)
        this.robots.debug_createRobot()

        /// Player Firing Laser
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.controls.onNonButtonClick(pointer)
        })
        
        this.createOre(500, 300)
        
        this.controls = new Controls(this, this.player)
        this.input.addListener("focus", () => {
            console.log("FOCUS")
            this.typing = true
            this.input.keyboard!.enabled = false
        })
        this.input.addListener("blur", () => {
            console.log("BLUR")
            this.typing = false
            this.input.keyboard!.enabled = true
        })

        //UI Camera shouldn't double-render non-UI items
        const baseLayer = this.add.layer(this.baseLayer)
        this.uiCamera.ignore(baseLayer)
    }

    createGround() {
        this.ground = this.add.tileSprite(
            0, 600, 5000, 5000, 'tile-ground'
        )
        this.uiCamera.ignore(this.ground)
    }

    createOre(x = 0, y = 0) {
        this.cosmoriteOre = new HPImage(this, x, y, COSMORITE_ORE, false) 
            .setImmovable(true)
        
        this.physics.add.collider(this.player, this.cosmoriteOre, () => {
            this.cosmoriteOre.isOverlapped = true;
        })
        this.robots.get(0).notifyOfCosmorite()
    }

    createPlayer() {
        this.player = new Player(this, 400, 350, 'player/down-f0')
        this.cameras.main.startFollow(this.player)
        this.player.hurtSound = this.painSound
    }

    createBase(x:number, y:number) {
        this.base = new Base(this, x, y)
        this.physics.add.overlap(this.player, this.base, () => {
            this.base.isOverlapped = true
        })
    }
    
    update(_time: number, delta: number) {
        const distance = GAME_SPEED * (delta / 1000)

        if(_time > this.prevShotTime + LASER_TEST_MS) {
            this.prevShotTime = _time
        }

        if(_time > this.prevFrameTime + FRAME_TIME_MS) {
            this.animateScene = true
            this.prevFrameTime = _time
        }
        
        this.controls.updateMovement(distance)

        if (this.controls.spaceJustDown()) {
            this.debug_shootAllLasers()
        }

        for (const laser of this.lasers) {
            laser.update(delta)
        }
        // remove dead bolts!
        this.lasers = this.lasers.filter(laser => !laser.dead)

        /// MINING ///
        if(this.cosmoriteOre.isOverlapped) {
            if (this.cosmoriteOre.isDead()) {
                this.cosmoriteOre.randomTeleport(800)
                this.cosmoriteOre.respawn()
            } else {
                let amt = (MINING_RATE_MS * delta)/1000
                this.mainStats.incCosmorite(amt)
                this.cosmoriteOre.takeDamage(amt/10)
            }
            this.cosmoriteOre.isOverlapped = false
        }

        /// BASE GUI ///
        if(this.base.isOverlapped) {
            this.player.setVisible(false)
            this.GUI.toggleBaseGUI(true)

            this.base.isOverlapped = false
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
        const use = shooter.shootLaser()
        if (use > 0) {
            new LaserShot(this, shooter, [target])
            // this.mainStats.drainGas(use)
        }
    }

    public async shootAtMousePosition(fromObj: IGameFighter, position: Phaser.Input.Pointer) {
        this.shootAtPosition(fromObj, xy(position.worldX, position.worldY))
    }

    public async shootAtPosition(fromObj: IGameFighter, xy:XY) {
        const use = fromObj.shootLaser()
        if (use > 0) {
            new LaserShot(this, fromObj, this.robots.robots, xy)
        }
    }

    public async weldAtMousePosition(fromObj: HPImage, position: Phaser.Input.Pointer) {
        // ensure they are both close enough to position
        console.log(fromObj.getPosition() + " as player, clicked at: " + position.worldX + ", " + position.worldY)
        let dist = Logic.getDistFromClick(fromObj, position)
        if (dist > BLOCK_RES * 6) return
        // find 2 nearest robots and the nearest blocks within them
        let nearestBlocks: ModularBlock[] = []
        for (const robot of this.robots) {
            let nearestBlock: ModularBlock | null = null
            let nearestDist = BLOCK_RES * 2
            for (const block of robot.blocks) {
                let dist = Logic.getDist(block.image.getPosition(), xy(position.worldX, position.worldY))
                if (dist < nearestDist) {
                    nearestBlock = block
                    nearestDist = dist
                }
            }
            if (nearestBlock) nearestBlocks.push(nearestBlock)
        }
        const click = xy(position.worldX, position.worldY)
        nearestBlocks.sort((a, b) =>
            Logic.getDist(a.image.getPosition(), click) - Logic.getDist(b.image.getPosition(), click))
        // Weld nearby robots, or repair a directly clicked block on a lone robot.
        if (nearestBlocks.length >= 2) {
            let blockA = nearestBlocks[0]
            let blockB = nearestBlocks[1]
            if (blockA.connectRobotAt(blockB)) {
                this.sound.play("weld")
            }
        } else if (nearestBlocks.length == 1) {
            const block = nearestBlocks[0]
            if (block.hp < block.maxHP && block.image.getBounds().contains(click.x, click.y)) {
                block.resetHP()
                this.sound.play("weld")
            }
        }
    }

    public debug_summonBlock(fromObj: HPImage, position: Phaser.Input.Pointer) {
        let dist = Logic.getDistFromClick(fromObj, position)
        if (dist > BLOCK_RES * 6) return
        if (this.mainStats.getLunestone() >= 1) {
            this.mainStats.incLunestone(-1)
            let roundx = Math.round(position.worldX/BLOCK_RES) * BLOCK_RES
            let roundy = Math.round(position.worldY/BLOCK_RES) * BLOCK_RES
            this.robots.push(ModularRobot.create(this, roundx, roundy)
                .addPart(PartType.partCpu)
                .addEnemyCollider(this.player))
        }
    }
    public debug_summonRobot() {
        let newRobot = this.robots.get(0).deepCopy(200,200)
        newRobot.addEnemyCollider(this.player)
        newRobot.notifyOfCosmorite()
        this.robots.push(newRobot)
        this.uiCamera.ignore(this.baseLayer)
    }
    public debug_getMineSiteString() {
        return "(" + this.cosmoriteOre.getCenter().x.toFixed(0).toString() + ", "
                + this.cosmoriteOre.getCenter().y.toFixed(0).toString() + ")"
    }
    public debug_getMineSiteXY() {
        return xy(this.cosmoriteOre.getCenter().x, this.cosmoriteOre.getCenter().y)
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
