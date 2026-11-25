import { describe, expect, it, vi } from "vitest"
import type ModularRobot from "../bots/ModularRobot"
import type MainScene from "../CodeLuna"
import PythonFunctions from "../main/PythonFunctions"

function runProgram(hasDish: boolean, source: string) {
    const chat = {
        print: vi.fn(),
        getText: vi.fn(() => "latest chat")
    }
    const robot = { hasDish: () => hasDish } as unknown as ModularRobot
    const scene = { chat } as unknown as MainScene
    const program = new PythonFunctions(scene, robot)
    let error: string | undefined
    program.run([{ name: "main", body: source }], "main", message => { error = message })
    program.update(16)
    return { chat, error }
}

describe("robot chat commands", () => {
    it("blocks reading and writing without a receiving dish", () => {
        const write = runProgram(false, 'print("hello")')
        expect(write.error).toContain("receiving dish")
        expect(write.chat.print).not.toHaveBeenCalled()

        const read = runProgram(false, "getChatText()")
        expect(read.error).toContain("receiving dish")
        expect(read.chat.getText).not.toHaveBeenCalled()
    })

    it("allows reading and writing with a receiving dish", () => {
        const write = runProgram(true, 'print("hello")')
        expect(write.error).toBeUndefined()
        expect(write.chat.print).toHaveBeenCalledWith("hello")

        const read = runProgram(true, "getChatText()")
        expect(read.error).toBeUndefined()
        expect(read.chat.getText).toHaveBeenCalledOnce()
    })
})
