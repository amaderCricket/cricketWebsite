// Modified src/utils/imageUtils.ts
import blankImage from '../assets/players/blank_image.png';

// In-memory cache for images
const imageCache: Record<string, string> = {};

export const getPlayerImage = async (player: {
  name: string;
  playerNameForImage: string;
}): Promise<string> => {
  const cacheKey = player.playerNameForImage;
  
  // Return from cache if available
  if (imageCache[cacheKey]) {
    return imageCache[cacheKey];
  }
  
  try {
    // Try to dynamically import the JPG
    const jpgModule = await import(`../assets/players/${player.playerNameForImage}.jpg`).catch(() => null);
    
    if (jpgModule) {
      // Store in cache and return
      imageCache[cacheKey] = jpgModule.default;
      return jpgModule.default;
    }

    // If JPG fails, try PNG
    const pngModule = await import(`../assets/players/${player.playerNameForImage}.png`).catch(() => null);
    
    if (pngModule) {
      // Store in cache and return
      imageCache[cacheKey] = pngModule.default;
      return pngModule.default;
    }

    // If both fail, cache and return blank image
    imageCache[cacheKey] = blankImage;
    return blankImage;
  } catch (error) {
    console.error(`Error loading image for player ${player.name}:`, error);
    // Cache the blank image for failed attempts too
    imageCache[cacheKey] = blankImage;
    return blankImage;
  }
};

// New function to preload images for multiple players
export const preloadPlayerImages = async (playerNames: string[]): Promise<void> => {
  // Limit concurrent requests to avoid overwhelming the browser
  const BATCH_SIZE = 5;
  const batches = [];
  
  // Split into batches
  for (let i = 0; i < playerNames.length; i += BATCH_SIZE) {
    batches.push(playerNames.slice(i, i + BATCH_SIZE));
  }
  
  // Process each batch sequentially
  for (const batch of batches) {
    // Process images in a batch concurrently
    await Promise.all(
      batch.map(playerName => 
        getPlayerImage({ 
          name: playerName, 
          playerNameForImage: playerName 
        })
      )
    );
  }
};