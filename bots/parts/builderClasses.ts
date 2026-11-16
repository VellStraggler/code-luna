import MainScene from "../../CodeLuna";
import { PART_CPU_NAME } from "../../main/constants";
import { XY } from "../../main/xy";
import ModularRobot from "../ModularRobot";
import { BlockDefinition } from "./BlockDefinition";
import CpuPart from "./CpuPart";
import ModularBlock from "./ModularBlock";
import { ModularPart } from "./ModularPart";
import WheelBlock from "./WheelBlock";

export default class BlockBuilder {
    public static new(scene: MainScene, offset:XY, blockType: BlockDefinition, robot: ModularRobot): ModularBlock {
        switch (blockType) {
            case (BlockDefinition.wheel):
                return new WheelBlock(scene, offset,
                    robot)
            default:
                return new ModularBlock(scene, offset,
                    blockType, robot)
        }
    }
}

export class PartBuilder {
    public static new(scene: MainScene, partType: string, parentBlock: ModularBlock,  robot: ModularRobot): ModularPart {
        switch (partType) {
            case (PART_CPU_NAME):
                let cpuPart = new CpuPart(scene, parentBlock, robot)
                robot.latestCpuPart = cpuPart
                return cpuPart
            default:
                return new ModularPart(scene, parentBlock, partType)
        }
    }
}