import { useState } from 'react'
import { clsx } from 'clsx'
// TODO: rename mineSet to mineCoordinates
// TODO: Clicking a square with no adjacent mines clears that square and clicks all adjacent squares.
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
  console.log(mineSet) // TODO: remove
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
  mines,
}: {
  rows: number
  cols: number
  mines: number
}) {
  const mineSet = createMineSet(rows, cols, mines)
  return Array(rows)
    .fill(null)
    .map((_, row) => {
      return Array(cols)
        .fill(null)
        .map((_, col) => {
          return {
            row,
            col,
            surroundingMines: surroundingMines(row, col, mineSet),
            isMine: mineSet.has(`${row},${col}`),
            state: TileState.COVERED,
          }
        })
    })
}

function GameTile({
  tile,
  onTileClick,
  onTileContextMenu,
}: {
  tile: Tile
  onTileClick: (e: React.MouseEvent, tile: Tile) => void
  onTileContextMenu: (e: React.MouseEvent, tile: Tile) => void
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
      onClick={(e) => onTileClick(e, tile)}
      onContextMenu={(e) => onTileContextMenu(e, tile)}
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

function App() {
  const [gameBoard, setGameBoard] = useState<Tile[][]>(() =>
    createGameBoard(LEVELS.beginner),
  )
  const [gameState, setGameState] = useState<
    'pending' | 'playing' | 'game over'
  >('pending')
  // TODO: combine uncover and flag into one updateTileState function that updates tile.state
  function updateTileState(row: number, col: number, state: TileState) {
    setGameBoard((prevBoard) => {
      const newBoard = [...prevBoard]
      newBoard[row][col].state = state
      return newBoard
    })
  }
  const handleClick = (e: React.MouseEvent, tile: Tile) => {
    // only allow clicks on hidden tiles
    if (tile.state === TileState.COVERED) {
      if (tile.isMine) {
        updateTileState(tile.row, tile.col, TileState.EXPLODED)
        // reveal all mines

        // TODO: set game state to game over
        return null // if we hit a mine, don't do anything else the game is over
      }
      updateTileState(tile.row, tile.col, TileState.UNCOVERED)
      if (tile.surroundingMines === 0) {
        // TODO: recursively uncover surrounding tiles
        // get all surrounding tiles
        const surrounding = [
          [tile.row - 1, tile.col - 1],
          [tile.row - 1, tile.col],
          [tile.row - 1, tile.col + 1],
          [tile.row, tile.col - 1],
          [tile.row, tile.col + 1],
          [tile.row + 1, tile.col - 1],
          [tile.row + 1, tile.col],
          [tile.row + 1, tile.col + 1],
        ]
        // remove surrounding tiles that are out of bounds
        const validSurrounding = surrounding.filter(
          ([row, col]) =>
            row >= 0 &&
            row < gameBoard.length &&
            col >= 0 &&
            col < gameBoard[0].length,
        )
        console.log(validSurrounding)
        // if they are covered, uncover them
        for (const [row, col] of validSurrounding) {
          updateTileState(row, col, TileState.UNCOVERED)
        }
      }
    }
  }
  const handleContextMenu = (e: React.MouseEvent, tile: Tile) => {
    e.preventDefault()
    // don't do anything if tile is already revealed
    if (tile.state === TileState.UNCOVERED) return
    updateTileState(
      tile.row,
      tile.col,
      tile.state === TileState.FLAGGED ? TileState.COVERED : TileState.FLAGGED,
    )
  }
  return (
    <div>
      <h1 className="my-9 text-5xl font-bold">Minesweeper</h1>
      <button
        className="my-9 rounded-lg bg-blue-500 p-4 text-white"
        onClick={() => setGameBoard(createGameBoard(LEVELS.beginner))}
      >
        Beginner
      </button>
      <button
        className="my-9 rounded-lg bg-blue-500 p-4 text-white"
        onClick={() => setGameBoard(createGameBoard(LEVELS.intermediate))}
      >
        Intermediate
      </button>
      <button
        className="my-9 rounded-lg bg-blue-500 p-4 text-white"
        onClick={() => setGameBoard(createGameBoard(LEVELS.expert))}
      >
        Expert
      </button>
      <div className="flex flex-col">
        {gameBoard.map((row, rowIndex) => (
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
  )
}

export default App
