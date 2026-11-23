import type ModularRobot from "../bots/ModularRobot"
import type MainScene from "../CodeLuna"
import { xy } from "./XY"

export type FunctionDefinition = { name: string, body: string }
export type RobotFunction = FunctionDefinition & { expanded: boolean, error?: string }

type Value = number | string | boolean | null
type Expr =
    | { kind: "value", value: Value }
    | { kind: "name", name: string }
    | { kind: "call", name: string, args: Expr[] }
    | { kind: "unary", op: string, value: Expr }
    | { kind: "binary", op: string, left: Expr, right: Expr }
type Statement =
    | { kind: "expression", expression: Expr, line: number }
    | { kind: "assign", name: string, expression: Expr, line: number }
    | { kind: "if", condition: Expr, body: Statement[], otherwise: Statement[], line: number }
    | { kind: "while", condition: Expr, body: Statement[], line: number }
    | { kind: "return", expression: Expr | null, line: number }

type Step = { wait: number } | null
type Execution = Generator<Step, Value, void>
type Command = (...args: Value[]) => Value

const MAX_SOURCE_LENGTH = 20000
const MAX_STEPS = 100000
const STEPS_PER_UPDATE = 500
const MAX_CALL_DEPTH = 32
const COMMAND_ARITY: Record<string, [number, number]> = {
    canMove: [0, 0], canMine: [0, 0], hasCpu: [0, 0], hasDrill: [0, 0],
    getLunestone: [0, 0], getCosmorite: [0, 0], getFreeStorage: [0, 0], getMeterRange: [0, 0],
    move: [2, 2], aim: [2, 2], selectBlock: [1, 1], place: [2, 3],
    weld: [0, 0], shoot: [2, 2], goToMine: [0, 0], goHome: [0, 0]
}

class ExpressionParser {
    private tokens: string[] = []
    private index = 0

    constructor(source: string) {
        const token = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([A-Za-z_]\w*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(==|!=|<=|>=|[()+\-*/%,<>]))/y
        let pos = 0
        while (pos < source.length) {
            if (!source.slice(pos).trim()) break
            token.lastIndex = pos
            const match = token.exec(source)
            if (!match) throw new Error(`Unexpected character: ${source[pos]}`)
            this.tokens.push(match[1] ?? match[2] ?? match[3] ?? match[4])
            if (this.tokens.length > 512) throw new Error("Expression is too long")
            pos = token.lastIndex
        }
    }

    parse(): Expr {
        const result = this.binary(0)
        if (this.index !== this.tokens.length) throw new Error(`Unexpected token: ${this.tokens[this.index]}`)
        return result
    }

    private binary(minimum: number): Expr {
        let left = this.unary()
        const precedence: Record<string, number> = {
            or: 1, and: 2, "==": 3, "!=": 3, "<": 3, "<=": 3, ">": 3, ">=": 3,
            "+": 4, "-": 4, "*": 5, "/": 5, "%": 5
        }
        while (this.index < this.tokens.length) {
            const op = this.tokens[this.index]
            const priority = precedence[op]
            if (priority === undefined || priority < minimum) break
            this.index++
            left = { kind: "binary", op, left, right: this.binary(priority + 1) }
        }
        return left
    }

    private unary(): Expr {
        const token = this.tokens[this.index++]
        if (token === "not") {
            return { kind: "unary", op: token, value: this.binary(3) }
        }
        if (token === "-" || token === "+") {
            return { kind: "unary", op: token, value: this.unary() }
        }
        if (token === "(") {
            const expression = this.binary(0)
            this.expect(")")
            return expression
        }
        if (!token) throw new Error("Expected an expression")
        if (/^(?:\d|\.)/.test(token)) return { kind: "value", value: Number(token) }
        if (token[0] === '"' || token[0] === "'") {
            const value = token.slice(1, -1).replace(/\\(.)/g, (_match, char: string) =>
                ({ n: "\n", t: "\t", r: "\r" } as Record<string, string>)[char] ?? char)
            return { kind: "value", value }
        }
        if (token === "True" || token === "False" || token === "None") {
            return { kind: "value", value: token === "None" ? null : token === "True" }
        }
        if (!/^[A-Za-z_]\w*$/.test(token)) throw new Error(`Unexpected token: ${token}`)
        if (this.tokens[this.index] !== "(") return { kind: "name", name: token }
        this.index++
        const args: Expr[] = []
        if (this.tokens[this.index] !== ")") {
            do {
                args.push(this.binary(0))
                if (this.tokens[this.index] !== ",") break
                this.index++
            } while (true)
        }
        this.expect(")")
        return { kind: "call", name: token, args }
    }

    private expect(token: string) {
        if (this.tokens[this.index++] !== token) throw new Error(`Expected '${token}'`)
    }
}

function parseBody(source: string): Statement[] {
    if (source.length > MAX_SOURCE_LENGTH) throw new Error("Function body is too long")
    const lines = source.replace(/\r\n?/g, "\n").split("\n")
        .map((text, index) => ({ text, number: index + 1 }))
        .filter(line => line.text.trim() && !line.text.trimStart().startsWith("#"))
    let index = 0
    const parseBlock = (indent: number, depth: number): Statement[] => {
        if (depth > 32) throw new Error("Too many nested blocks")
        const statements: Statement[] = []
        while (index < lines.length) {
            const line = lines[index]
            const prefix = line.text.match(/^\s*/)?.[0] ?? ""
            if (prefix.includes("\t")) throw new Error(`Line ${line.number}: Use spaces for indentation`)
            if (prefix.length < indent) break
            if (prefix.length > indent) throw new Error(`Line ${line.number}: Unexpected indentation`)
            const text = line.text.trim()
            if (text === "else:") break
            index++
            try {
                const block = text.match(/^(if|while)\s+(.+):$/)
                if (block) {
                    if (index >= lines.length) throw new Error("Expected an indented block")
                    const nextIndent = lines[index].text.match(/^ */)![0].length
                    if (nextIndent <= indent) throw new Error("Expected an indented block")
                    const body = parseBlock(nextIndent, depth + 1)
                    if (block[1] === "while") {
                        statements.push({ kind: "while", condition: new ExpressionParser(block[2]).parse(), body, line: line.number })
                    } else {
                        let otherwise: Statement[] = []
                        if (index < lines.length && lines[index].text === " ".repeat(indent) + "else:") {
                            index++
                            if (index >= lines.length) throw new Error("Expected an indented block after else")
                            const elseIndent = lines[index].text.match(/^ */)![0].length
                            if (elseIndent <= indent) throw new Error("Expected an indented block after else")
                            otherwise = parseBlock(elseIndent, depth + 1)
                        }
                        statements.push({ kind: "if", condition: new ExpressionParser(block[2]).parse(), body, otherwise, line: line.number })
                    }
                } else if (text === "return" || text.startsWith("return ")) {
                    statements.push({ kind: "return", expression: text === "return" ? null : new ExpressionParser(text.slice(7)).parse(), line: line.number })
                } else {
                    const assignment = text.match(/^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/)
                    statements.push(assignment
                        ? { kind: "assign", name: assignment[1], expression: new ExpressionParser(assignment[2]).parse(), line: line.number }
                        : { kind: "expression", expression: new ExpressionParser(text).parse(), line: line.number })
                }
            } catch (error) {
                throw new Error(`Line ${line.number}: ${error instanceof Error ? error.message : String(error)}`)
            }
        }
        return statements
    }
    const result = parseBlock(0, 0)
    if (index < lines.length) throw new Error(`Line ${lines[index].number}: Unexpected else`)
    return result
}

export default class PythonFunctions {
    private readonly commands: Record<string, Command>
    private execution: Execution | null = null
    private remainingWait = 0
    private steps = 0
    private onError: ((message: string) => void) | null = null

    constructor(private scene: MainScene, private robot: ModularRobot) {
        const number = (value: Value, name: string) => {
            if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${name} requires finite numbers`)
            return value
        }
        this.commands = {
            canMove: () => robot.canMove(),
            canMine: () => robot.canMine(),
            hasCpu: () => robot.hasCpu(),
            hasDrill: () => robot.hasDrill(),
            getLunestone: () => robot.storedLunestone,
            getCosmorite: () => robot.storedCosmorite,
            getFreeStorage: () => robot.getFreeStorage(),
            getMeterRange: () => robot.getMeterRange(),
            move: (x, y) => { robot.move(number(x, "move"), number(y, "move")); return null },
            aim: (x, y) => { robot.aim(xy(number(x, "aim"), number(y, "aim"))); return null },
            selectBlock: (name) => {
                if (typeof name !== "string") throw new Error("selectBlock requires a block name")
                robot.selectBlock(name); return null
            },
            place: (x, y, index = 0) => robot.place(number(x, "place"), number(y, "place"), number(index, "place")),
            weld: () => { robot.weld(); return null },
            shoot: (x, y) => { scene.shootAtPosition(robot, xy(number(x, "shoot"), number(y, "shoot"))); return null },
            goToMine: () => { robot.setGoal(scene.debug_getMineSiteXY()); return null },
            goHome: () => { robot.setGoal(scene.playerBase.getPosition()); return null }
        }
    }

    run(definitions: FunctionDefinition[], name: string, onError: (message: string) => void) {
        const functions = new Map<string, Statement[]>()
        for (const definition of definitions) {
            if (!/^[A-Za-z_]\w*$/.test(definition.name) ||
                ["True", "False", "None", "if", "else", "while", "return", "and", "or", "not", "wait"].includes(definition.name) ||
                Object.hasOwn(this.commands, definition.name)) {
                throw new Error(`Invalid or reserved function name: ${definition.name}`)
            }
            if (functions.has(definition.name)) throw new Error(`Duplicate function: ${definition.name}`)
            try {
                functions.set(definition.name, parseBody(definition.body))
            } catch (error) {
                throw new Error(`${definition.name}: ${error instanceof Error ? error.message : String(error)}`)
            }
        }
        if (!functions.has(name)) throw new Error(`Unknown function: ${name}`)
        this.cancel()
        this.execution = this.callUser(functions, name, [], 0)
        this.onError = onError
    }

    cancel() {
        this.execution = null
        this.remainingWait = 0
        this.steps = 0
        this.onError = null
    }

    update(delta: number) {
        if (!this.execution) return
        if (this.remainingWait > 0) {
            this.remainingWait -= Math.max(0, delta)
            if (this.remainingWait > 0) return
        }
        try {
            for (let i = 0; i < STEPS_PER_UPDATE && this.execution; i++) {
                if (++this.steps > MAX_STEPS) throw new Error("Instruction limit exceeded")
                const result = this.execution.next()
                if (result.done) { this.cancel(); return }
                if (result.value?.wait) { this.remainingWait = result.value.wait; return }
            }
        } catch (error) {
            const report = this.onError
            this.cancel()
            report?.(error instanceof Error ? error.message : String(error))
        }
    }

    private *callUser(functions: Map<string, Statement[]>, name: string, args: Value[], depth: number): Execution {
        if (depth >= MAX_CALL_DEPTH) throw new Error("Function call depth exceeded")
        const body = functions.get(name)
        if (!body) throw new Error(`Unknown function: ${name}`)
        if (args.length) throw new Error(`${name} takes no arguments`)
        try {
            const result = yield* this.executeBlock(functions, body, new Map(), depth)
            return result.returned ? result.value : null
        } catch (error) {
            throw new Error(`${name}: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    private *executeBlock(functions: Map<string, Statement[]>, body: Statement[], variables: Map<string, Value>, depth: number): Generator<Step, { returned: boolean, value: Value }, void> {
        for (const statement of body) {
            yield null
            try {
                if (statement.kind === "expression") yield* this.evaluate(functions, statement.expression, variables, depth)
                else if (statement.kind === "assign") variables.set(statement.name, yield* this.evaluate(functions, statement.expression, variables, depth))
                else if (statement.kind === "return") return { returned: true, value: statement.expression ? yield* this.evaluate(functions, statement.expression, variables, depth) : null }
                else if (statement.kind === "if") {
                    const condition = yield* this.evaluate(functions, statement.condition, variables, depth)
                    const result = yield* this.executeBlock(functions, condition ? statement.body : statement.otherwise, variables, depth)
                    if (result.returned) return result
                } else {
                    while (yield* this.evaluate(functions, statement.condition, variables, depth)) {
                        const result = yield* this.executeBlock(functions, statement.body, variables, depth)
                        if (result.returned) return result
                    }
                }
            } catch (error) {
                throw new Error(`Line ${statement.line}: ${error instanceof Error ? error.message : String(error)}`)
            }
        }
        return { returned: false, value: null }
    }

    private *evaluate(functions: Map<string, Statement[]>, expression: Expr, variables: Map<string, Value>, depth: number): Execution {
        yield null
        if (expression.kind === "value") return expression.value
        if (expression.kind === "name") {
            if (!variables.has(expression.name)) throw new Error(`Unknown variable: ${expression.name}`)
            return variables.get(expression.name)!
        }
        if (expression.kind === "call") {
            const args: Value[] = []
            for (const arg of expression.args) args.push(yield* this.evaluate(functions, arg, variables, depth))
            if (expression.name === "wait") {
                if (args.length !== 1 || typeof args[0] !== "number" ||
                    !Number.isFinite(args[0] * 1000) || args[0] < 0) {
                    throw new Error("wait requires a non-negative number of seconds")
                }
                yield { wait: args[0] * 1000 }
                return null
            }
            if (Object.hasOwn(this.commands, expression.name)) {
                const [min, max] = COMMAND_ARITY[expression.name]
                if (args.length < min || args.length > max) {
                    throw new Error(`${expression.name} expects ${min === max ? min : `${min} to ${max}`} arguments`)
                }
                return this.commands[expression.name](...args)
            }
            return yield* this.callUser(functions, expression.name, args, depth + 1)
        }
        if (expression.kind === "unary") {
            const value = yield* this.evaluate(functions, expression.value, variables, depth)
            if (expression.op === "not") return !value
            if (typeof value !== "number") throw new Error("Unary arithmetic requires a number")
            return expression.op === "-" ? -value : value
        }
        const left = yield* this.evaluate(functions, expression.left, variables, depth)
        if (expression.op === "and" && !left) return left
        if (expression.op === "or" && left) return left
        const right = yield* this.evaluate(functions, expression.right, variables, depth)
        switch (expression.op) {
            case "and": case "or": return right
            case "==": return left === right
            case "!=": return left !== right
        }
        if (typeof left !== "number" || typeof right !== "number") throw new Error(`${expression.op} requires numbers`)
        switch (expression.op) {
            case "+": return left + right
            case "-": return left - right
            case "*": return left * right
            case "/": if (right !== 0) return left / right; break
            case "%": if (right !== 0) return left % right; break
            case "<": return left < right
            case "<=": return left <= right
            case ">": return left > right
            case ">=": return left >= right
        }
        throw new Error("Division by zero")
    }
}
