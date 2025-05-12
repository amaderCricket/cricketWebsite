// Modified src/utils/imageUtils.ts
import blankImage from '../assets/players/blank_image.png';

// In-memory cache for images
const imageCache: Record<string, string> = {};

// Local storage cache keys
const IMAGE_CACHE_PREFIX = 'player_image_';

export const getPlayerImage = async (player: {
  name: string;
  playerNameForImage: string;
}): Promise<string> => {
  const cacheKey = player.playerNameForImage;
  
  // Return from memory cache if available (fastest)
  if (imageCache[cacheKey]) {
    return imageCache[cacheKey];
  }
  
  // Try localStorage cache next (still fast)
  const localCachedImage = localStorage.getItem(`${IMAGE_CACHE_PREFIX}${cacheKey}`);
  if (localCachedImage) {
    // Store in memory cache too
    imageCache[cacheKey] = localCachedImage;
    return localCachedImage;
  }
  
  try {
    // Try to dynamically import the JPG with race condition for faster loading
    const jpgPromise = Promise.race([
      import(`../assets/players/${player.playerNameForImage}.jpg`).catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(null), 2000)) // 2s timeout
    ]);
    
    const jpgModule = await jpgPromise;
    
    if (jpgModule) {
      // Store in both caches and return
      imageCache[cacheKey] = jpgModule.default;
      try {
        localStorage.setItem(`${IMAGE_CACHE_PREFIX}${cacheKey}`, jpgModule.default);
      } catch (e) {
        // Ignore localStorage errors (might be full)
        console.error('LocalStorage error:', e);
      }
      return jpgModule.default;
    }

    // If JPG fails, try PNG with same race condition
    const pngPromise = Promise.race([
      import(`../assets/players/${player.playerNameForImage}.png`).catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(null), 2000)) // 2s timeout
    ]);
    
    const pngModule = await pngPromise;
    
    if (pngModule) {
      // Store in both caches and return
      imageCache[cacheKey] = pngModule.default;
      try {
        localStorage.setItem(`${IMAGE_CACHE_PREFIX}${cacheKey}`, pngModule.default);
      } catch (e) {
        // Ignore localStorage errors
        console.error('LocalStorage error:', e);
      }
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

// Enhanced preload function with prioritization
export const preloadPlayerImages = async (playerNames: string[]): Promise<void> => {
  if (!playerNames || playerNames.length === 0) return;
  
  // First, immediately load the top few players with higher priority
  const topPriority = playerNames.slice(0, 3);
  const normalPriority = playerNames.slice(3);
  
  // Process top priority players immediately
  await Promise.all(
    topPriority.map(playerName => 
      getPlayerImage({ 
        name: playerName, 
        playerNameForImage: playerName 
      })
    )
  );
  
  // Then process the rest in batches
  const BATCH_SIZE = 4; // Smaller batch size for better performance
  const batches = [];
  
  // Split into batches
  for (let i = 0; i < normalPriority.length; i += BATCH_SIZE) {
    batches.push(normalPriority.slice(i, i + BATCH_SIZE));
  }
  
  // Process each batch sequentially with small delays between batches
  for (const batch of batches) {
    await Promise.all(
      batch.map(playerName => 
        getPlayerImage({ 
          name: playerName, 
          playerNameForImage: playerName 
        })
      )
    );
    
    // Small delay between batches to avoid overwhelming the browser
    if (batches.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
};