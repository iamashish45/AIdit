import React from 'react';
import EditorTool from './features/editor/EditorTool';

export default function App() {
  // Option A: read from env (recommended)
  // <EditorTool /> will automatically use process.env.REACT_APP_PIXABAY_KEY

  // Option B: pass key explicitly (immediate, avoids .env)
  const pixabayKey = '53270247-aef2cd84e1e877abd1580c8ea';

  return (
    // Use either <EditorTool /> (env) or <EditorTool pixabayKey={pixabayKey} /> (prop)
    <EditorTool pixabayKey={pixabayKey} />
  );
}
