import { SupabaseStorageService } from './supabase-storage.service';

export interface ImageProcessOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ThumbnailOptions extends ImageProcessOptions {
  width: number;
  height: number;
}

export interface ImageUploadResult {
  originalUrl: string;
  thumbnailUrl?: string;
  originalSize: number;
  thumbnailSize?: number;
}

export class ImageService {
  private static readonly DEFAULT_THUMBNAIL_SIZE = { width: 300, height: 200 };
  private static readonly DEFAULT_MAX_SIZE = { width: 1920, height: 1080 };
  private static readonly DEFAULT_QUALITY = 0.8;

  /**
   * Upload banner image with automatic thumbnail generation
   */
  static async uploadBannerImage(file: File, bannerId?: string): Promise<ImageUploadResult> {
    try {
      // Validate image file
      this.validateImageFile(file);

      // Process main image
      const processedImage = await this.processImage(file, {
        maxWidth: this.DEFAULT_MAX_SIZE.width,
        maxHeight: this.DEFAULT_MAX_SIZE.height,
        quality: this.DEFAULT_QUALITY,
      });

      // Upload main image
      const originalUpload = await SupabaseStorageService.uploadBannerImage(processedImage, bannerId);

      // Generate and upload thumbnail
      const thumbnail = await this.generateThumbnail(file, this.DEFAULT_THUMBNAIL_SIZE);
      const thumbnailUpload = await SupabaseStorageService.uploadBannerImage(
        thumbnail,
        bannerId ? `${bannerId}_thumb` : undefined
      );

      return {
        originalUrl: originalUpload.url,
        thumbnailUrl: thumbnailUpload.url,
        originalSize: processedImage.size,
        thumbnailSize: thumbnail.size,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('이미지 업로드 중 오류가 발생했습니다.');
    }
  }

  /**
   * Process image (resize, compress, format conversion)
   */
  static async processImage(file: File, options: ImageProcessOptions = {}): Promise<File> {
    const {
      maxWidth = this.DEFAULT_MAX_SIZE.width,
      maxHeight = this.DEFAULT_MAX_SIZE.height,
      quality = this.DEFAULT_QUALITY,
      format = 'jpeg',
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Canvas context를 생성할 수 없습니다.'));
        return;
      }

      img.onload = () => {
        // Calculate new dimensions
        const { width, height } = this.calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 처리에 실패했습니다.'));
              return;
            }

            const processedFile = new File(
              [blob],
              this.generateFileName(file.name, format),
              { type: `image/${format}` }
            );

            resolve(processedFile);
          },
          `image/${format}`,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('이미지를 로드할 수 없습니다.'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate thumbnail from image
   */
  static async generateThumbnail(file: File, options: ThumbnailOptions): Promise<File> {
    const {
      width,
      height,
      quality = this.DEFAULT_QUALITY,
      format = 'jpeg',
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Canvas context를 생성할 수 없습니다.'));
        return;
      }

      img.onload = () => {
        canvas.width = width;
        canvas.height = height;

        // Calculate crop area to maintain aspect ratio
        const sourceRatio = img.width / img.height;
        const targetRatio = width / height;

        let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;

        if (sourceRatio > targetRatio) {
          // Image is wider, crop from sides
          sourceWidth = img.height * targetRatio;
          sourceX = (img.width - sourceWidth) / 2;
        } else if (sourceRatio < targetRatio) {
          // Image is taller, crop from top/bottom
          sourceHeight = img.width / targetRatio;
          sourceY = (img.height - sourceHeight) / 2;
        }

        // Draw cropped and resized image
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, width, height
        );

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('썸네일 생성에 실패했습니다.'));
              return;
            }

            const thumbnailFile = new File(
              [blob],
              this.generateFileName(file.name, format, '_thumb'),
              { type: `image/${format}` }
            );

            resolve(thumbnailFile);
          },
          `image/${format}`,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('이미지를 로드할 수 없습니다.'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Validate image file
   */
  private static validateImageFile(file: File): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB for original

    if (!allowedTypes.includes(file.type)) {
      throw new Error('지원되는 이미지 형식: JPEG, PNG, WebP');
    }

    if (file.size > maxSize) {
      throw new Error('이미지 파일은 10MB 이하여야 합니다.');
    }
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio),
    };
  }

  /**
   * Generate filename with optional suffix
   */
  private static generateFileName(
    originalName: string,
    format: string,
    suffix: string = ''
  ): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}${suffix}.${format}`;
  }

  /**
   * Get image dimensions
   */
  static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        reject(new Error('이미지 크기를 가져올 수 없습니다.'));
        URL.revokeObjectURL(img.src);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create image preview URL
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Revoke preview URL
   */
  static revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Check if file is a valid image
   */
  static isValidImage(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    return allowedTypes.includes(file.type);
  }

  /**
   * Convert image to base64
   */
  static async imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Base64 변환에 실패했습니다.'));
        }
      };

      reader.onerror = () => {
        reject(new Error('파일을 읽을 수 없습니다.'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Compress image file size
   */
  static async compressImage(
    file: File,
    targetSizeKB: number,
    maxAttempts: number = 5
  ): Promise<File> {
    let quality = 0.9;
    let currentFile = file;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (currentFile.size <= targetSizeKB * 1024) {
        return currentFile;
      }

      currentFile = await this.processImage(file, {
        quality,
        format: 'jpeg',
      });

      quality -= 0.15;

      if (quality < 0.3) {
        break;
      }
    }

    return currentFile;
  }

  /**
   * Delete banner images (both original and thumbnail)
   */
  static async deleteBannerImages(originalUrl: string, thumbnailUrl?: string): Promise<void> {
    try {
      await SupabaseStorageService.deleteBannerImageByUrl(originalUrl);

      if (thumbnailUrl) {
        await SupabaseStorageService.deleteBannerImageByUrl(thumbnailUrl);
      }
    } catch (error) {
      console.error('Failed to delete banner images:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }
}