import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import clone from 'just-clone'
// not currently in use
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

function getTilesToUpdate(row: number, col: number, board: Tile[][]): Tile[][] {
  // this function is recursive and returns the new board state after finding all connecting tiles with 0 surrounding mines and revealing them and their surrounding tiles
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
  surrounding.forEach(([r, c]) => {
    if (r >= 0 && r < board.length && c >= 0 && c < board[0].length) {
      if (board[r][c].state === TileState.COVERED) {
        board[r][c].state = TileState.UNCOVERED
        if (board[r][c].surroundingMines === 0) {
          getTilesToUpdate(r, c, board)
        }
      }
    }
  })
  return board
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

const initialMineCoords = createMineSet(8, 8, 10)

// setGameBoard(rows, cols, mines): [Tile[][], Set<string>] {
// what if the "gameBoard" is actually an object with the board and the mineCoords?

function App() {
  const [gameBoard, setGameBoard] = useState<Tile[][]>(() =>
    createGameBoard({ rows: 8, cols: 8, mineCoords: initialMineCoords }),
  )
  const [mineCoordinates, setMineCoordnates] =
    useState<Set<string>>(initialMineCoords)

  const [gameState, setGameState] = useState<GameState>(GameState.NEW)
  const [flagsPlaced, setFlagsPlaced] = useState(0)
  const [time, setTime] = useState(0)

  const timerRef = useRef<number>()

  useEffect(() => {
    setGameBoard(
      createGameBoard({ rows: 8, cols: 8, mineCoords: mineCoordinates }),
    )
  }, [mineCoordinates])

  function resetBoard() {
    setMineCoordnates(createMineSet(8, 8, 10))
    setGameState(GameState.NEW)
    setFlagsPlaced(0)
    clearInterval(timerRef.current)
    setTime(0)
  }

  function startGame() {
    setGameState(GameState.PLAYING)
    setFlagsPlaced(0)
    clearInterval(timerRef.current)
    setTime(0)
    timerRef.current = setInterval(() => {
      setTime((curr) => curr + 1)
    }, 1000)
  }

  function gameOver() {
    setGameState(GameState.LOST)
    clearInterval(timerRef.current)
  }

  function updateTileState(row: number, col: number, state: TileState) {
    setGameBoard((prevBoard) => {
      const newBoard = [...prevBoard]
      newBoard[row][col].state = state
      return newBoard
    })
  }

  // TODO: this is unfinished
  function revealMines() {
    setGameBoard((prevBoard) => {
      const newBoard = [...prevBoard]
      mineCoordinates.forEach((coord) => {
        const [r, c] = coord.split(',').map(Number)
        newBoard[r][c].state = TileState.UNCOVERED
      })
      return newBoard
    })
  }

  function reconfigureBoard(row: number, col: number) {
    resetBoard()
    // if row, col is mine: reconfigure again
    if (mineCoordinates.has(`${row},${col}`)) {
      reconfigureBoard(row, col)
    }
  }

  function handleClick(e: React.MouseEvent, tile: Tile) {
    // if the game is over, do nothing
    if (gameState === GameState.LOST || gameState == GameState.WON) return
    // only allow clicks on covered tiles
    if (tile.state !== TileState.COVERED) return
    if (gameState === GameState.NEW) {
      if (tile.isMine) {
        // TODO: ran into a race condition between states, need to rethink the seperation of gameBoard and mineCoords
        // reconfigureBoard(tile.col, tile.row)
      }
      startGame()
    }
    if (mineCoordinates.has(`${tile.row},${tile.col}`)) {
      gameOver()
      // TODO: reveal mines
      // revealMines()
      updateTileState(tile.row, tile.col, TileState.EXPLODED)
      return // if we hit a mine, don't do anything else, the game is over
    }
    // uncover tile(s)
    updateTileState(tile.row, tile.col, TileState.UNCOVERED)
    if (tile.surroundingMines === 0) {
      // clone of the board state to prevent mutation of react state
      const board = clone(gameBoard)
      // get the new board state after finding all surrounding tiles with 0 surrounding mines and uncovering them
      const updates = getTilesToUpdate(tile.row, tile.col, board)
      setGameBoard(updates)
    }
  }

  function handleContextMenu(e: React.MouseEvent, tile: Tile) {
    e.preventDefault()
    // if the game is over, do nothing
    if (gameState === GameState.LOST || gameState == GameState.WON) return
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
      <div className="inline-block">
        <div>{gameState === GameState.NEW && 'new'}</div>
        <div>{gameState === GameState.PLAYING && 'playing'}</div>
        <div>{gameState === GameState.WON && 'won'}</div>
        <div>{gameState === GameState.LOST && 'lost'}</div>
        <div className="flex justify-between">
          <div className="w-16">{/*flags:{flagsPlaced}*/}</div>
          <button className="text-6xl" onClick={resetBoard}>
            {gameState === GameState.NEW && '😀'}
            {gameState === GameState.PLAYING && '🥺'}
            {gameState === GameState.WON && '🥳'}
            {gameState === GameState.LOST && '😭'}
          </button>
          <div className="w-16 text-right">{time}</div>
        </div>
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
    </div>
  )
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
      {/* {tile.state === TileState.COVERED && tile.isMine && 'x'} */}
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
