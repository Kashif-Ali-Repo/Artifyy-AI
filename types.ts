export enum AppState {
  IDLE,
  PREVIEW,
  CROPPING,
  ANALYZING,
  AWAITING_CONFIRMATION,
  ENHANCING,
  GENERATING,
  DONE,
  ERROR,
}

export enum EnhancementStrength {
  SUBTLE = 'Subtle',
  NATURAL = 'Natural',
  STRONG = 'Strong',
}

export interface ImageFile {
  base64: string;
  mimeType: string;
  url: string;
}

export interface SavedSettings {
  strength: EnhancementStrength;
  detailLevel: number;
}