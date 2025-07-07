import { Stage } from './types';
import { UploadIcon, ScriptIcon, VideoIcon } from './components/Icons';

export const NAV_ITEMS = [
  { id: Stage.UPLOAD, label: 'Upload Content', icon: UploadIcon },
  { id: Stage.SCRIPT, label: 'Edit Script', icon: ScriptIcon },
  { id: Stage.GENERATE, label: 'Generate Video', icon: VideoIcon },
];

export const SUPPORTED_VOICES = ['Echo', 'Oasis', 'Persian', 'Puck', 'Zephyr'];
