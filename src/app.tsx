/*
# TODO:
  - [x] timer
  - [ ] mine counter
  - [x] reset game
  - [x] flagging a tile
  - [x] clicking on a tile, revealing it if it's not flagged
  - [x] display number of surrounding mines on an uncovered tile
  - [ ] recursively uncovering all tiles
  - [ ] prevent first click from being a mine
  - [ ] mine counter
  - [ ] win state
*/

import { useReducer, useRef, useState } from 'react'
import { clsx } from 'clsx'
import clone from 'just-clone'

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
}

enum GameState {
  NEW,
  PLAYING,
  WON,
  LOST,
}

enum TileState {
  COVERED,
  UNCOVERED,
  FLAGGED,
  EXPLODED,
}

type Tile = {
  row: number
  col: number
  surroundingMines: number
  isMine: boolean
  state: TileState
}

function createMineSet(rows: number, cols: number, mines: number) {
  const mineSet = new Set<string>()
  while (mineSet.size < mines) {
    mineSet.add(
      `${Math.floor(Math.random() * rows)},${Math.floor(Math.random() * cols)}`,
    )
  }
  return mineSet
}

function surroundingMines(row: number, col: number, mineSet: Set<string>) {
  const surrounding = [
    [row - 1, col - 1],
    [row - 1, col],
    [row - 1, col + 1],
    [row, col - 1],
    [row, col + 1],
    [row + 1, col - 1],
    [row + 1, col],
    [row + 1, col + 1],
  ]
  return surrounding.reduce((acc, [r, c]) => {
    if (mineSet.has(`${r},${c}`)) {
      return acc + 1
    }
    return acc
  }, 0)
}

function createGameBoard({
  rows,
  cols,
  mineCoords,
}: {
  rows: number
  cols: number
  mineCoords: Set<string>
}) {
  return Array(rows)
    .fill(null)
    .map((_, row) => {
      return Array(cols)
        .fill(null)
        .map((_, col) => {
          return {
            row,
            col,
            surroundingMines: surroundingMines(row, col, mineCoords),
            isMine: mineCoords.has(`${row},${col}`),
            state: TileState.COVERED,
          }
        })
    })
}

enum ActionType {
  RESTART = 'RESTART',
  UNCOVER = 'UNCOVER',
  TOGGLE_FLAG = 'TOGGLE_FLAG',
}
type Coords = {
  row: number
  col: number
}
type Action = {
  type: ActionType
  coords?: Coords
}

type State = {
  gameState: GameState
  board: Tile[][]
  width: number
  height: number
  mineCount: number
  flagCount: number
  uncoveredCellCount: number
}

function initState(action?: Action): State {
  const { rows, cols, mines } = LEVELS.beginner
  const mineCoords = createMineSet(rows, cols, mines)
  return {
    board: createGameBoard({ rows, cols, mineCoords }),
    gameState: GameState.NEW,
    width: rows,
    height: cols,
    mineCount: mineCoords.size,
    flagCount: 0,
    uncoveredCellCount: 0,
  }
}
function updateBoard(prevBoard: Tile[][], coords: Coords) {
  const newBoard = clone(prevBoard)
  newBoard[coords.row][coords.col].state = TileState.UNCOVERED
  return newBoard
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ActionType.RESTART:
      return initState()
    case ActionType.UNCOVER:
      return {
        ...state,
        board:
          action.coords != null
            ? updateBoard(state.board, action.coords)
            : state.board,
        uncoveredCellCount: state.uncoveredCellCount + 1,
        gameState: GameState.PLAYING,
      }
    case ActionType.TOGGLE_FLAG:
      return {
        ...state,
        board: state.board.map((row, rowIndex) => {
          return row.map((tile, colIndex) => {
            if (
              rowIndex === action.coords?.row &&
              colIndex === action.coords?.col
            ) {
              if (tile.state === TileState.FLAGGED) {
                return { ...tile, state: TileState.COVERED }
              } else {
                return { ...tile, state: TileState.FLAGGED }
              }
            } else {
              return tile
            }
          })
        }),
        flagCount:
          action.coords != null
            ? state.flagCount +
              (state.board[action.coords.row][action.coords.col].state ===
              TileState.FLAGGED
                ? -1
                : 1)
            : state.flagCount,
      }
    default:
      console.error('unknown action', action)
      return state
  }
}

function App() {
  const [state, dispatch] = useReducer(
    reducer,
    { type: ActionType.RESTART },
    initState,
  )

  const [time, setTime] = useState(0)

  const timerRef = useRef<number>()

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
    const tile = state.board[coords.row][coords.col]
    if (tile.state !== TileState.COVERED) return
    dispatch({ type: ActionType.UNCOVER, coords })
  }

  function handleContextMenu(e: React.MouseEvent, coords: Coords) {
    e.preventDefault()
    // if the game is over, do nothing
    if (state.gameState === GameState.LOST || state.gameState == GameState.WON)
      return
    const tile = state.board[coords.row][coords.col]
    // don't do anything if tile is already revealed
    if (tile.state === TileState.UNCOVERED) return
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
          <div className="w-16 text-left">{state.flagCount}</div>
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
                  tile={tile}
                  onTileClick={handleClick}
                  onTileContextMenu={handleContextMenu}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GameTile({
  tile,
  onTileClick,
  onTileContextMenu,
}: {
  tile: Tile
  onTileClick: (e: React.MouseEvent, coords: Coords) => void
  onTileContextMenu: (e: React.MouseEvent, coords: Coords) => void
}) {
  return (
    <button
      className={clsx(
        {
          'bg-gray-400':
            tile.state === TileState.COVERED ||
            tile.state === TileState.FLAGGED,
          'bg-gray-200': tile.state === TileState.UNCOVERED,
          'bg-red-500': tile.state === TileState.EXPLODED,
        },
        'h-8 w-8  border border-black',
      )}
      onClick={(e) => onTileClick(e, { row: tile.row, col: tile.col })}
      onContextMenu={(e) =>
        onTileContextMenu(e, { row: tile.row, col: tile.col })
      }
    >
      {tile.state === TileState.COVERED && tile.isMine && 'x'}
      {tile.state === TileState.FLAGGED && '🚩'}
      {tile.state === TileState.EXPLODED && '💥'}
      {tile.state === TileState.UNCOVERED &&
        (tile.isMine
          ? '💣'
          : tile.surroundingMines > 0 && (
              <span className="text-blue-700">{tile.surroundingMines}</span>
            ))}
    </button>
  )
}

export default App
