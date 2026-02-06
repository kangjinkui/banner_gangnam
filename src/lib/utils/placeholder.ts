/**
 * Placeholder image utility
 * Generates SVG-based placeholder images to avoid external dependencies
 */

export function createPlaceholderImage(
  width: number = 150,
  height: number = 100,
  text: string = '이미지 없음'
): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f3f4f6"/>
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dy=".3em"
        fill="#9ca3af"
        font-family="Arial, sans-serif"
        font-size="14"
      >${text}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

/**
 * Common placeholder images
 */
export const PLACEHOLDER_IMAGES = {
  banner: createPlaceholderImage(150, 100, '현수막 이미지'),
  bannerLarge: createPlaceholderImage(800, 400, '이미지 없음'),
  bannerSmall: createPlaceholderImage(100, 80, ''),
  mapPopup: createPlaceholderImage(280, 120, '이미지 없음'),
};

/**
 * Get image URL with fallback to placeholder
 */
export function getImageWithFallback(
  imageUrl: string | null | undefined,
  fallbackType: keyof typeof PLACEHOLDER_IMAGES = 'banner'
): string {
  return imageUrl || PLACEHOLDER_IMAGES[fallbackType];
}
