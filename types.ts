export enum Stage {
  UPLOAD = 'UPLOAD',
  SCRIPT = 'SCRIPT',
  GENERATE = 'GENERATE',
}

export interface UploadedFile {
  file: File;
  summary?: string;
}

export interface Script {
  intro: string;
  mainContent: string;
  summary: string;
  cta: string;
}

export interface Scene {
  scene: number;
  scriptChunk: string;
  imagePrompt: string;
  justification: string;
  imageUrl: string;
  audioUrl?: string;
  audioDuration?: number; // in seconds
}

export interface VideoData {
  scenes: Scene[];
  thumbnailUrl: string;
  youtubeTags: string[];
  voice: string;
}

export interface AppContextType {
  stage: Stage;
  projectName: string;
  files: UploadedFile[];
  category: string | null;
  genre: string | null;
  duration: number | null;
  script: Script | null;
  videoData: VideoData | null;
  isLoading: boolean;
  error: string | null;
  isVoiceModalOpen: boolean;
  setProjectName: (name: string) => void;
  setFiles: (files: File[]) => void;
  setCategory: (category: string | null) => void;
  setGenre: (genre: string | null) => void;
  setDuration: (duration: number | null) => void;
  navigateToStage: (stage: Stage) => void;
  summarizeAndProceed: () => Promise<void>;
  generateScript: () => Promise<void>;
  updateScript: (updatedScript: Script) => void;
  generateVideo: (voice?: string) => Promise<void>;
  setIsVoiceModalOpen: (isOpen: boolean) => void;
}

// WebCodecs API stubs to make TypeScript happy.
// These types are available in newer versions of @types/web or in specific libraries like @types/wicg-web-codecs.
declare global {
  type AudioEncoderOutputCallback = (chunk: any, metadata?: any) => void;
  type WebCodecsErrorCallback = (error: DOMException) => void;

  interface AudioEncoderInit {
    output: AudioEncoderOutputCallback;
    error: WebCodecsErrorCallback;
  }

  interface AudioEncoderConfig {
    codec: string;
    sampleRate: number;
    numberOfChannels: number;
    bitrate?: number;
  }

  class AudioEncoder {
    constructor(init: AudioEncoderInit);
    configure(config: AudioEncoderConfig): void;
    encode(data: AudioData): void;
    flush(): Promise<void>;
    close(): void;
    state: 'unconfigured' | 'configured' | 'closed';
  }

  type AudioSampleFormat = 'u8' | 's16' | 's32' | 'f32' | 'u8-planar' | 's16-planar' | 's32-planar' | 'f32-planar';

  interface AudioDataInit {
    format: AudioSampleFormat;
    sampleRate: number;
    numberOfFrames: number;
    numberOfChannels: number;
    timestamp: number;
    data: BufferSource;
  }

  class AudioData {
    constructor(init: AudioDataInit);
    clone(): AudioData;
    close(): void;
    readonly format: AudioSampleFormat | null;
    readonly sampleRate: number;
    readonly numberOfFrames: number;
    readonly numberOfChannels: number;
    readonly duration: number;
    readonly timestamp: number;
  }
}
