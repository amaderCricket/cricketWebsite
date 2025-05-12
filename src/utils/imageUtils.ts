// src/utils/imageUtils.ts
// Import the blank image as a fallback
import blankImage from '../assets/players/blank_image.png';

// Create an in-memory cache to avoid redundant imports
const imageCache: Record<string, string> = {};

export const getPlayerImage = async (player: {
  name: string;
  playerNameForImage: string;
}): Promise<string> => {
  // First check localStorage cache
  const localCacheKey = `player_image_${player.playerNameForImage}`;
  const cachedUrl = localStorage.getItem(localCacheKey);
  if (cachedUrl) {
    return cachedUrl;
  }

  // Then check memory cache
  if (imageCache[player.playerNameForImage]) {
    // Save to localStorage for future visits
    localStorage.setItem(localCacheKey, imageCache[player.playerNameForImage]);
    return imageCache[player.playerNameForImage];
  }

  try {
    // Try to dynamically import the JPG
    const jpgModule = await import(`../assets/players/${player.playerNameForImage}.jpg`).catch(() => null);
    
    if (jpgModule) {
      imageCache[player.playerNameForImage] = jpgModule.default;
      localStorage.setItem(localCacheKey, jpgModule.default);
      return jpgModule.default;
    }

    // If JPG fails, try PNG
    const pngModule = await import(`../assets/players/${player.playerNameForImage}.png`).catch(() => null);
    
    if (pngModule) {
      imageCache[player.playerNameForImage] = pngModule.default;
      localStorage.setItem(localCacheKey, pngModule.default);
      return pngModule.default;
    }

    // If both fail, return blank image
    localStorage.setItem(localCacheKey, blankImage);
    return blankImage;
  } catch (error) {
    console.error(`Error loading image for player ${player.name}:`, error);
    localStorage.setItem(localCacheKey, blankImage);
    return blankImage;
  }
};