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
type dificulty = 'beginner' | 'intermediate' | 'expert'

type gameTileType = {
  row: number
  col: number
  surroundingMines?: number
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
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
  return Array(rows)
    .fill(null)
    .map((_, row) => {
      return Array(cols)
        .fill(null)
        .map((_, col) => {
          return {
            row,
            col,
            isMine: Math.floor(Math.random() * mines) === 0,
            isRevealed: false,
            isFlagged: false,
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
  const [uncovered, setUncovered] = useState(false)
  const [isFlagged, setIsFlagged] = useState(false)
  const handleClick = () => {
    if (isFlagged) return
    setUncovered(true)
    onTileClick(tile)
  }
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (uncovered) return
    setIsFlagged(!isFlagged)
    onTileContextMenu(tile)
  }
  return (
    <button
      className={clsx([
        uncovered ? 'bg-gray-200' : 'bg-gray-300',
        'h-8 w-8  border border-black',
      ])}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {isFlagged ? '🚩' : uncovered && tile.isMine ? '💣' : ''}
      {uncovered && !tile.isMine && tile.surroundingMines && (
        <span className="text-blue-700">{tile.surroundingMines}</span>
      )}
    </button>
  )
}

function App() {
  const [gameBoard, setGameBoard] = useState<gameTileType[][]>([])
  // const [gameState, setGameState] = useState('pending') // pending, running, won, lost
  // const [gameTime, setGameTime] = useState(0)
  const [dificulty] = useState<dificulty>('beginner')
  const startGame = () => {
    // setGameState('running')
    // setGameTime(0)
    setGameBoard(createGameBoard(LEVELS[dificulty]))
  }
  return (
    <div>
      <h1 className="my-9 text-5xl font-bold">Minesweeper</h1>
      <button
        className="my-9 rounded-lg bg-blue-500 p-4 text-white"
        onClick={startGame}
      >
        Start Game
      </button>
      <div className="flex flex-col">
        {gameBoard.map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-row">
            {row.map((tile, colIndex) => (
              <GameTile
                key={colIndex}
                tile={tile}
                onTileClick={() => {
                  return
                }}
                onTileContextMenu={() => {
                  return
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
