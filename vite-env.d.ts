interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  // add more environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}