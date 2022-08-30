/*
# TODO:
  - [x] timer
  - [x] mine counter
  - [x] reset game
  - [x] flagging a tile
  - [x] clicking on a tile, revealing it if it's not flagged
  - [x] display number of surrounding mines on an uncovered tile
  - [x] consolodate state that can be computed from other state
  - [x] uncover all mines when game is lost
  - [x] explode when you click on a mine
  - [x] prevent first click from being a mine
  - [x] count mines minus flags placed
  - [ ] recursively uncovering all tiles when clicking on a tile with no surrounding mines
  - [ ] stop timer when game is over
  - [ ] win state
  - [ ] remove enums?
*/

import { useReducer, useRef, useState } from 'react'
import { clsx } from 'clsx'

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
}

enum ActionType {
  RESTART,
  UNCOVER,
  TOGGLE_FLAG,
}

type Action =
  | { type: ActionType.RESTART }
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
  ]
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
  }
}
function uncoverTiles(
  board: Board,
  coords: Coords,
  mineCoords: CoordsMap,
): Board {
  // uncover the tile we clicked on
  return board.map((row, rowIndex) =>
    row.map((tile, colIndex) => {
      if (rowIndex === coords[0] && colIndex === coords[1]) {
        return TileState.UNCOVERED
      } else {
        return tile
      }
      // then if there are no mines neibouring the tile, uncover all surrounding tiles
      // continue uncovering neibour tiles until we find all mines
    }),
  )
}

// function recursivelyUncoverTiles(state: State, coords: Coords): State {
//   const { board } = state
//   if (surroundingMines(coords, state.mineCoords) === 0) {
//     const surrounding = surroundingCoords(coords)
//     for (const [r, c] of surrounding) {
//       // todo...
//       if (board[r][c].state === TileState.COVERED) {
//         board = uncoverTiles(board, { row: r, col: c })
//         board = recursivelyInitState(state, { row: r, col: c })
//       }
//     }
//   }
//   return { ...state, board }
// }

function getStateOnUncover(state: State, coords: Coords): State {
  const { gameState, board, mineCoords } = state
  switch (gameState) {
    // if the game has already been won or lost, do nothing
    case GameState.LOST:
    case GameState.WON:
      return state

    case GameState.NEW:
      // if it's a mine, reset the board
      if (mineCoords.has(coords.join())) {
        return {
          ...initState({ dificulty: LEVELS.beginner, avoid: coords }),
        }
      }
      // else uncover the tile
      return {
        ...state,
        gameState: GameState.PLAYING,
        board: uncoverTiles(board, coords, mineCoords),
      }

    case GameState.PLAYING:
      // if we uncover a mine, explode the clicked mine and uncover all other mines
      if (mineCoords.has(coords.join())) {
        return {
          ...state,
          board: board.map((row, rowIndex) => {
            return row.map((tile, colIndex) => {
              if (rowIndex === coords[0] && colIndex === coords[1]) {
                return TileState.EXPLODED
              } else if (mineCoords.has([rowIndex, colIndex].join())) {
                return TileState.UNCOVERED
              } else {
                return tile
              }
            })
          }),
          // and set the game state to lost
          gameState: GameState.LOST,
        }
      } else {
        // start uncovering tiles
        return {
          ...state,
          board: uncoverTiles(board, coords, mineCoords),
        }
        // TODO: check if the game is won
      }
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ActionType.RESTART:
      return initState({ dificulty: LEVELS.beginner })
    case ActionType.UNCOVER:
      return action.coords != null
        ? getStateOnUncover(state, action.coords)
        : state
    case ActionType.TOGGLE_FLAG: {
      const coords = action.coords
      return {
        ...state,
        board: state.board.map((row, rowIndex) => {
          return row.map((tile, colIndex) => {
            if (rowIndex === coords[0] && colIndex === coords[1]) {
              if (tile === TileState.FLAGGED) {
                return TileState.COVERED
              } else {
                return TileState.FLAGGED
              }
            } else {
              return tile
            }
          })
        }),
      }
    }
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

  const [time, setTime] = useState(0)

  const timerRef = useRef<number>()

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
    clearInterval(timerRef.current)
    setTime(0)
  }

  function handleClick(e: React.MouseEvent, coords: Coords) {
    // if the game is over, do nothing
    if (state.gameState === GameState.LOST || state.gameState == GameState.WON)
      return
    if (state.gameState === GameState.NEW) {
      // start timer
      clearInterval(timerRef.current)
      setTime(0)
      timerRef.current = setInterval(() => {
        setTime((curr) => curr + 1)
      }, 1000)
    }
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
    <div>
      <h1 className="my-9 text-5xl font-bold">Minesweeper</h1>
      <div className="inline-block">
        <div>{state.gameState === GameState.NEW && 'new'}</div>
        <div>{state.gameState === GameState.PLAYING && 'playing'}</div>
        <div>{state.gameState === GameState.WON && 'won'}</div>
        <div>{state.gameState === GameState.LOST && 'lost'}</div>
        <div className="flex justify-between">
          <div className="w-16 text-left">
            {state.mineCoords.size - placedFlaggs}
          </div>
          <button className="text-6xl" onClick={resetBoard}>
            {state.gameState === GameState.NEW && '😀'}
            {state.gameState === GameState.PLAYING && '🥺'}
            {state.gameState === GameState.WON && '🥳'}
            {state.gameState === GameState.LOST && '😭'}
          </button>
          <div className="w-16 text-right">{time}</div>
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
                />
              ))}
            </div>
          ))}
        </div>
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
}

function GameTile(props: GameTileProps) {
  return (
    <button
      className={clsx(
        {
          'bg-gray-400':
            props.tileState === TileState.COVERED ||
            props.tileState === TileState.FLAGGED,
          'bg-gray-200': props.tileState === TileState.UNCOVERED,
          'bg-red-500': props.tileState === TileState.EXPLODED,
        },
        'h-8 w-8  border border-black',
      )}
      onClick={(e) => props.onTileClick(e, [props.x, props.y])}
      onContextMenu={(e) => props.onTileContextMenu(e, [props.x, props.y])}
    >
      {props.tileState === TileState.COVERED && props.isMine && 'x'}
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

export default App
