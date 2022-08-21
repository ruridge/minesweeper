import { useState } from 'react'
import { clsx } from 'clsx'
// create the classic Windows game Minesweeper in React
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
type gameTileType = {
  row: number
  col: number
  surroundingMines: number
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  state: 'hidden' | 'revealed' | 'flagged' | string // TODO: remove string
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
            isRevealed: true, // TODO: remove
            isFlagged: false, // TODO: remove
            state: 'revealed',
          }
        })
    })
}

function GameTile({
  tile,
  onTileClick,
  onTileContextMenu,
}: {
  tile: gameTileType
  onTileClick: (tile: gameTileType) => void
  onTileContextMenu: (tile: gameTileType) => void
}) {
  const handleClick = () => {
    // don't do anything if the tile is already flagged or revealed
    if (tile.isFlagged || tile.isRevealed) return
    onTileClick(tile)
  }
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    // don't do anything if tile is already revealed
    if (tile.isRevealed) return
    onTileContextMenu(tile)
  }
  return (
    <button
      className={clsx([
        tile.isRevealed ? 'bg-gray-200' : 'bg-gray-300',
        'h-8 w-8  border border-black',
      ])}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* TODO: replace isFlagged and isRevealed with single tile.state prop */}
      {tile.isFlagged ? '🚩' : tile.isRevealed && tile.isMine ? '💣' : ''}
      {tile.isRevealed && !tile.isMine && tile.surroundingMines > 0 ? (
        <span className="text-blue-700">{tile.surroundingMines}</span>
      ) : (
        ''
      )}
    </button>
  )
}

function App() {
  const [gameBoard, setGameBoard] = useState<gameTileType[][]>(() =>
    createGameBoard(LEVELS.beginner),
  )
  // TODO: combine uncover and flag into one updateTileState function that updates tile.state
  function uncoverTile(tile: gameTileType) {
    setGameBoard((prevBoard) =>
      prevBoard.map((prevRow) =>
        prevRow.map((prevTile) => {
          if (prevTile.row === tile.row && prevTile.col === tile.col) {
            return { ...prevTile, isRevealed: true }
          }
          return prevTile
        }),
      ),
    )
  }
  function flagTile(tile: gameTileType) {
    setGameBoard((prevBoard) =>
      prevBoard.map((prevRow) =>
        prevRow.map((prevTile) => {
          if (prevTile.row === tile.row && prevTile.col === tile.col) {
            return { ...prevTile, isFlagged: !prevTile.isFlagged }
          }
          return prevTile
        }),
      ),
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
                onTileClick={uncoverTile}
                onTileContextMenu={flagTile}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
