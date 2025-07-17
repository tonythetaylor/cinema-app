import React from 'react';

export default function TailwindTest() {
  return (
    <div className="m-8 p-8 bg-red-500 text-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-4">🎉 Tailwind Is Working!</h1>
      <p className="text-lg">
        If you see this red box with white text and rounded corners, Tailwind is up and running.
      </p>
    </div>
  );
}