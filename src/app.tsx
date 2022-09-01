/*
# TODO:
  - [ ] add dev mode
  - [ ] double click to uncover surrounding tiles if number of surrounding mines matches number of surrounding flaggs placed
  - [ ] if flagged, don't reset tile on first click is mine
  - [ ] remove enums?
*/

import { useReducer } from 'react'
import { useInterval } from 'react-use'
import { clsx } from 'clsx'
import produce from 'immer'

interface Dificulty {
  rows: number
  cols: number
  mines: number
}

const LEVELS = {
  beginner: {
    rows: 8,
    cols: 8,
    mines: 10,
  },
  intermediate: {
    rows: 16,
    cols: 16,
    mines: 40,
  },
  expert: {
    rows: 16,
    cols: 30,
    mines: 99,
  },
} as const

type LevelName = keyof typeof LEVELS

enum GameState {
  NEW,
  PLAYING,
  WON,
  LOST,
}
// create the type from an enum:
// const GAME_STATES = ['new', 'playing', 'won', 'lost'] as const
// type GameState = typeof GAME_STATES[number]

// or just create a type directly:
// type GameState = 'new' | 'playing' | 'won' | 'lost'

enum TileState {
  COVERED,
  UNCOVERED,
  FLAGGED,
  EXPLODED,
}

type Board = TileState[][]
type Coords = readonly [number, number]
type CoordsMap = Map<string, Coords>

interface State {
  gameState: GameState
  board: Board
  width: number
  height: number
  mineCoords: CoordsMap
  time: number
  devMode: boolean
}

enum ActionType {
  RESTART,
  UNCOVER,
  TOGGLE_FLAG,
  TIMER_TICK,
  TOGGLE_DEV_MODE,
}

type Action =
  | {
      type:
        | ActionType.RESTART
        | ActionType.TIMER_TICK
        | ActionType.TOGGLE_DEV_MODE
    }
  | { type: ActionType.UNCOVER | ActionType.TOGGLE_FLAG; coords: Coords }

function createMineMap(
  width: number,
  height: number,
  mines: number,
  avoid?: Coords,
): CoordsMap {
  const mineMap = new Map() as CoordsMap
  while (mineMap.size < mines) {
    const mineCoords: Coords = [
      Math.floor(Math.random() * width),
      Math.floor(Math.random() * height),
    ]
    mineMap.set(mineCoords.join(), mineCoords)
  }
  if (avoid && mineMap.has(avoid.join())) {
    return createMineMap(width, height, mines, avoid)
  }
  return mineMap
}

function surroundingCoords(coords: Coords) {
  const [row, col] = coords
  return [
    [row - 1, col - 1],
    [row - 1, col],
    [row - 1, col + 1],
    [row, col - 1],
    [row, col + 1],
    [row + 1, col - 1],
    [row + 1, col],
    [row + 1, col + 1],
  ] as Coords[]
}

function getSurroundingMineCount(startingCoords: Coords, mineSet: CoordsMap) {
  const surrounding = surroundingCoords(startingCoords)
  return surrounding.reduce((acc, coords) => {
    if (mineSet.has(coords.join())) {
      return acc + 1
    }
    return acc
  }, 0)
}

function initState(initArg: { dificulty: Dificulty; avoid?: Coords }): State {
  const { rows, cols, mines } = initArg.dificulty
  const mineCoords = createMineMap(rows, cols, mines, initArg.avoid)
  return {
    board: Array(rows)
      .fill(null)
      .map((_, rowIndex) =>
        Array(cols)
          .fill(TileState.COVERED)
          .map((tile, colIndex) => {
            if (
              initArg.avoid &&
              initArg.avoid[0] === rowIndex &&
              initArg.avoid[1] === colIndex
            ) {
              return TileState.UNCOVERED
            } else {
              return tile
            }
          }),
      ),
    gameState: initArg.avoid ? GameState.PLAYING : GameState.NEW,
    width: rows,
    height: cols,
    mineCoords,
    time: 0,
    devMode: false,
  }
}
function uncoverTiles(draftState: State, currentCoords: Coords) {
  const { board, mineCoords, width, height } = draftState
  const [currentX, currentY] = currentCoords
  board[currentX][currentY] = TileState.UNCOVERED
  // uncover the tile we clicked on
  // if there are no surrounding mines, uncover all surrounding tiles
  if (getSurroundingMineCount(currentCoords, mineCoords) === 0) {
    const surrounding = surroundingCoords(currentCoords)
    surrounding
      .filter(
        // filter out tiles that are out of bounds
        ([x, y]) => x >= 0 && x < width && y >= 0 && y < height,
      )
      .forEach(([x, y]) => {
        if (board[x][y] === TileState.COVERED) {
          uncoverTiles(draftState, [x, y])
        }
      })
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ActionType.RESTART:
      return initState({ dificulty: LEVELS.beginner })
    case ActionType.TIMER_TICK:
      return produce(state, (draft) => {
        draft.time += 1
      })
    case ActionType.UNCOVER:
      switch (state.gameState) {
        // if the game has already been won or lost, do nothing
        case GameState.LOST:
        case GameState.WON:
          return state

        case GameState.NEW:
          // if it's a mine, reset the board
          if (state.mineCoords.has(action.coords.join())) {
            return initState({
              dificulty: LEVELS.beginner,
              avoid: action.coords,
            })
          }
        // falls through to default if we didn't hit a mine

        case GameState.PLAYING:
          // if we uncover a mine, explode the clicked mine and uncover all other mines
          if (state.mineCoords.has(action.coords.join())) {
            return produce(state, (draft) => {
              const [x, y] = action.coords
              draft.gameState = GameState.LOST
              for (const [r, c] of state.mineCoords.values()) {
                draft.board[r][c] = TileState.UNCOVERED
              }
              draft.board[x][y] = TileState.EXPLODED
            })
          }
        // falls through if we didn't hit a mine

        default: // if the game state is NEW or PLAYING the clicked tile is always uncovered
          // start uncovering tiles
          return produce(state, (draft) => {
            draft.gameState = GameState.PLAYING

            uncoverTiles(draft, action.coords)

            const boardSize = draft.width * draft.height
            const totalUncoveredTiles = draft.board.reduce(
              (acc, row) =>
                acc + row.filter((tile) => tile === TileState.UNCOVERED).length,
              0,
            )
            // if the size of the board minus the number of uncovered tiles is equal to the number of mines, the game is won
            if (draft.mineCoords.size === boardSize - totalUncoveredTiles) {
              draft.gameState = GameState.WON
            }
          })
      }
    case ActionType.TOGGLE_FLAG: {
      const [x, y] = action.coords
      return produce(state, (draft) => {
        const tileState = draft.board[x][y]
        if (tileState === TileState.COVERED) {
          draft.board[x][y] = TileState.FLAGGED
        } else if (tileState === TileState.FLAGGED) {
          draft.board[x][y] = TileState.COVERED
        }
      })
    }

    case ActionType.TOGGLE_DEV_MODE:
      return produce(state, (draft) => {
        draft.devMode = !draft.devMode
      })

    default:
      console.error('unknown action', action)
      return state
  }
}

function App() {
  const [state, dispatch] = useReducer(
    reducer,
    { dificulty: LEVELS.beginner },
    initState,
  )

  useInterval(() => {
    if (state.gameState !== GameState.PLAYING) {
      return
    }
    dispatch({ type: ActionType.TIMER_TICK })
  }, 1000)

  const placedFlaggs = state.board.reduce((acc, row) => {
    return (
      acc +
      row.reduce((acc, tile) => {
        return tile === TileState.FLAGGED ? acc + 1 : acc
      }, 0)
    )
  }, 0)

  function resetBoard() {
    dispatch({ type: ActionType.RESTART })
  }

  function handleClick(e: React.MouseEvent, coords: Coords) {
    // if the game is over, do nothing
    if (state.gameState === GameState.LOST || state.gameState == GameState.WON)
      return
    // only allow clicks on covered tiles
    const tile = state.board[coords[0]][coords[1]]
    if (tile !== TileState.COVERED) return
    dispatch({ type: ActionType.UNCOVER, coords })
  }

  function handleContextMenu(e: React.MouseEvent, coords: Coords) {
    e.preventDefault()
    // if the game is over, do nothing
    if (state.gameState === GameState.LOST || state.gameState == GameState.WON)
      return
    const tile = state.board[coords[0]][coords[1]]
    // don't do anything if tile is already revealed
    if (tile === TileState.UNCOVERED) return
    dispatch({ type: ActionType.TOGGLE_FLAG, coords })
  }
  return (
    <div className="w-screen max-w-md border-2 border-neutral-300 bg-neutral-400">
      <div className="flex justify-between bg-blue-900">
        <h1>💣 Minesweeper</h1>
        <div>_☐☒</div>
      </div>
      <div className="flex space-x-2 px-2">
        <button disabled>Game</button>
        <button disabled>Help</button>
        <button
          className="first-letter:underline"
          onClick={() => dispatch({ type: ActionType.TOGGLE_DEV_MODE })}
        >
          Dev
        </button>
      </div>
      <div className="h-6">
        {state.devMode && (
          <div>
            {state.gameState === GameState.NEW && 'new'}
            {state.gameState === GameState.PLAYING && 'playing'}
            {state.gameState === GameState.WON && 'won'}
            {state.gameState === GameState.LOST && 'lost'}
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <Display value={state.mineCoords.size - placedFlaggs} />
        <button className="text-6xl" onClick={resetBoard}>
          {state.gameState === GameState.NEW && '😀'}
          {state.gameState === GameState.PLAYING && '🥺'}
          {state.gameState === GameState.WON && '🥳'}
          {state.gameState === GameState.LOST && '😭'}
        </button>
        <Display value={state.time} alignment="right" />
      </div>
      <div className="flex flex-col">
        {state.board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-row justify-center">
            {row.map((tile, colIndex) => (
              <GameTile
                key={`${rowIndex},${colIndex}`}
                x={rowIndex}
                y={colIndex}
                onTileClick={handleClick}
                onTileContextMenu={handleContextMenu}
                tileState={tile}
                isMine={state.mineCoords.has([rowIndex, colIndex].join())}
                surroundingMines={getSurroundingMineCount(
                  [rowIndex, colIndex],
                  state.mineCoords,
                )}
                isDevMode={state.devMode}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

type TileClickHandler = (e: React.MouseEvent, coords: Coords) => void
interface GameTileProps {
  x: number
  y: number
  tileState: TileState
  onTileClick: TileClickHandler
  onTileContextMenu: TileClickHandler
  isMine: boolean
  surroundingMines: number
  isDevMode: boolean
}

function GameTile(props: GameTileProps) {
  return (
    <button
      className={clsx(
        {
          'bg-neutral-400':
            props.tileState === TileState.COVERED ||
            props.tileState === TileState.FLAGGED,
          'bg-neutral-200': props.tileState === TileState.UNCOVERED,
          'bg-red-600': props.tileState === TileState.EXPLODED,
        },
        'aspect-square w-full grow basis-0 border border-black',
      )}
      onClick={(e) => props.onTileClick(e, [props.x, props.y])}
      onContextMenu={(e) => props.onTileContextMenu(e, [props.x, props.y])}
    >
      {props.isDevMode &&
        props.tileState === TileState.COVERED &&
        props.isMine &&
        'x'}
      {props.tileState === TileState.FLAGGED && '🚩'}
      {props.tileState === TileState.EXPLODED && '💥'}
      {props.tileState === TileState.UNCOVERED &&
        (props.isMine
          ? '💣'
          : props.surroundingMines > 0 && (
              <span className="text-blue-700">{props.surroundingMines}</span>
            ))}
    </button>
  )
}

const displayAlignments = {
  left: clsx('text-left'),
  right: clsx('text-right'),
} as const

type DisplayAlignment = keyof typeof displayAlignments

interface DisplayProps {
  value: number
  alignment?: DisplayAlignment
}
function Display(props: DisplayProps) {
  const alignment = props.alignment ?? 'left'
  return (
    <div
      className={clsx(
        displayAlignments[alignment],
        'w-16 font-mono text-4xl text-red-700',
      )}
    >
      {props.value}
    </div>
  )
}

export default App
