export interface Theme {
  id: number;
  category: string;
  name: string;
  prompt: string;
  imgsNeeded: number;
}

export interface UploadedImage {
  data: string; // Data URL string
  mimeType: string;
}

export interface GeneratedImage {
  id: string;
  src: string; // Full data URL for display
  prompt: string;
  themeName: string;
  timeTaken: number;
}
