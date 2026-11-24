# Program Name: Code: Luna

## Dev Running Instructions:
Install dependencies with ```npm install```, then start the development server with ```npm run dev```.
Run unit tests with ```npm test``` and type checks with ```npm run typecheck```. Test files live in ```test/``` and are not included in the production bundle.

## Language(s)/Framework(s): 
Typescript in Phaser, ported to desktop with Electron, backend server running in C# on AWS EC2

## Basic Description:
StarCraft but using programmable, modular robots. Collect Lunestone and Cosmorite gas (Lunestone is revealed by the meteorite crash)

## Basic Architecture: 
- Robot programs use a bounded, Python-like interpreter updated with the game loop.
- Web-based game with framerate capped at 60 fps. Simple graphics
- Write so that rendering and update information are entirely separate jobs (decoupled for future backend design with an EC2)

## Robot programs

The robot monitor lets you edit named, no-argument functions and run one with its play button.
Functions can call each other and return values. For example:

```python
# Function: travel
move(0, -100)
wait(2)
```

```python
# Function: patrol
travel()
if canMove():
    goHome()
```

The language supports numbers, strings, `True`, `False`, `None`, local assignments,
arithmetic, comparisons, `and`, `or`, `not`, `if`/`else`, `while`, and `return`.
It is a Python-like subset, not full Python. Indent blocks with spaces.

Commands are `move(x, y)` (relative world units), `aim(x, y)`, `shoot(x, y)`
(world coordinates), `selectBlock(name)`, `place(x, y, factoryIndex)` (factoryIndex
defaults to 0), `weld()`, `goToMine()`, `goHome()`, and `wait(seconds)`. Queries
include `canMove()`, `canMine()`, `hasCpu()`, `hasDrill()`, `getLunestone()`,
`getCosmorite()`, `getFreeStorage()`, and `getMeterRange()` (estimated metres).
Movement sets a goal and does not wait for arrival; `wait` pauses the program.
Running another function replaces the current program; the monitor's Stop button
cancels it. Programs continue when the monitor closes. Robots and their function
edits are saved automatically in this browser's local storage and restored on
reload; running programs do not resume. Instruction and call-depth limits stop
runaway programs.

## BUGS:
- guns without CPUs still fire

## Graphical Features
### Not Implemented
- HTML UI with text entry for code
- Players, blocks, and parts can have idle animations
- Players, blocks, and parts can have active animations
- Explosions when blocks/parts are destroyed
- Shadows on everything would be nice

## Shooting Mechanics
### Implemented:
- Shooting a robot breaks off a block
- Shooting a player damages the player
- Laser-mounted blocks can still fire after breaking off
- Players can take refuge in bases
- lasers have a cost and cannot be fired when you can't pay
- Lone blocks are destroyed when fired upon
- Health is taken into account for damage 2-fold
### Not Implemented:
- Health is restored for newly-broken-off parts
- Lasers fire from the gun itself, not just the origin of the robot
- Blocks can be reduced to minerals
- Damaged blocks show their health bar after being hit

## World Mechanics
### Implemented:
- A single meteorite landing site is found anywhere in the world
- Meteorites go into mining mode when touching a player or bot
- Simple tiling ground texture
### Not Implemented:
- Multiple meteorite landing sites determined by player count
- Top-down player view that lazily follows the mouse

## Robot Mechanics
### Warning to the Devs:
- Do NOT alter bounce or drag on any physics object. It will bounce into oblivion.
### Implemented:
- Robots are made of multiple modular pieces
- Robots maintain functionality of residual pieces and parts
- non-wheeled robots cannot be moved
- singular blocks have a high level of force resistance
### Not Implemented:
- Actions are determined by the CPU
- bug where sending them somewhere repeatedly increases the gas cost for no reason

## Parent Classes:
- ModularPart:
    - researchLevel (1 to 3)
    - Attaches to a ModularBlock
- ModularBlock
    - researchLevel (1 to 3)
        - Higher level gives access to smaller, lighter frames
        - Also allows for more ModularParts to be attached to one block
- Material
    - Lunestone
    - Cosmorite
    - Bulkstone (Has both)

## Asset Addition Protocol:
When adding an asset, add it to ```constants.ts``` as well.
If it has multiple frames, these must also be added.

## Next steps:
1. arrowToBase icon with distance
1. Wheels spin based on direction 
1. Shadow layer
1. Minerals on top of meteor hole
1. Fix the evaluate method to stop rerunning all the time. Only on geometry changes
    1. maybe break up the evaluate into submethods and only call some sometimes.