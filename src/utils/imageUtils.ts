// src/utils/imageUtils.ts
// Import the blank image as a fallback
import blankImage from '../assets/players/blank_image.png';

export const getPlayerImage = async (player: {
  name: string;
  playerNameForImage: string;
}): Promise<string> => {
  try {
    // Try to dynamically import the JPG
    const jpgModule = await import(`../assets/players/${player.playerNameForImage}.jpg`).catch(() => null);
    
    if (jpgModule) {
      return jpgModule.default;
    }

    // If JPG fails, try PNG
    const pngModule = await import(`../assets/players/${player.playerNameForImage}.png`).catch(() => null);
    
    if (pngModule) {
      return pngModule.default;
    }

    // If both fail, return blank image
    return blankImage;
  } catch (error) {
    console.error(`Error loading image for player ${player.name}:`, error);
    return blankImage;
  }
};