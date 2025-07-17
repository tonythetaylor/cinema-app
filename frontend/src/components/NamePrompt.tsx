import React, { useState } from 'react'

interface NamePromptProps {
  onSubmit: (name: string) => void;
}

export default function NamePrompt({ onSubmit }: NamePromptProps) {
  const [name, setName] = useState('')

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="
          relative w-80 p-6
          bg-white/10 backdrop-blur-lg
          border border-white/20
          rounded-2xl
          shadow-2xl
          flex flex-col
          space-y-4
          transform transition-transform duration-300
          hover:scale-[1.02]
        "
      >
        <h2 className="text-2xl font-semibold text-white text-center">
          Who’s watching?
        </h2>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter your name"
          className="
            w-full px-4 py-2
            bg-white/20 backdrop-blur-md
            border border-white/30
            rounded-xl
            text-white placeholder-white/70
            focus:bg-white/30 focus:border-white/50
            focus:outline-none focus:ring-2 focus:ring-blue-400
            transition
          "
        />

        <button
          disabled={!name.trim()}
          onClick={() => onSubmit(name.trim())}
          className={`
            w-full py-2
            text-white font-medium
            rounded-xl
            transition
            ${name.trim()
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-white/20 cursor-not-allowed opacity-50'}
          `}
        >
          Continue
        </button>
      </div>
    </div>
  )
}