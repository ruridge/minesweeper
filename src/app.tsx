import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <h1 className="my-9 text-5xl font-bold">Vite + React + Tailwind</h1>
      <button
        className="rounded-lg bg-pink-600 px-6 py-2 text-pink-50"
        onClick={() => setCount(count + 1)}
      >
        Count: {count}
      </button>
    </div>
  )
}

export default App
