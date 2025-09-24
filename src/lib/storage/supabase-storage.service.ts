import { supabase } from '@/lib/database/supabase';

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  contentType: string;
}

export class SupabaseStorageService {
  private static readonly BUCKET_NAME = 'banners';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(file: File, path: string): Promise<UploadResult> {
    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('파일 크기는 5MB 이하여야 합니다.');
    }

    // Validate file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('지원되는 파일 형식: JPEG, PNG, WebP');
    }

    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        if (error.message.includes('already exists')) {
          throw new Error('동일한 이름의 파일이 이미 존재합니다.');
        }
        throw new Error(`파일 업로드 실패: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return {
        url: publicUrlData.publicUrl,
        path: data.path,
        size: file.size,
        contentType: file.type,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('파일 업로드 중 오류가 발생했습니다.');
    }
  }

  /**
   * Upload banner image with automatic path generation
   */
  static async uploadBannerImage(file: File, bannerId?: string): Promise<UploadResult> {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = bannerId
      ? `${bannerId}_${timestamp}.${fileExtension}`
      : `banner_${timestamp}.${fileExtension}`;

    const path = `banners/${fileName}`;

    return this.uploadFile(file, path);
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) {
        throw new Error(`파일 삭제 실패: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('파일 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * Delete banner image by URL
   */
  static async deleteBannerImageByUrl(url: string): Promise<void> {
    const path = this.extractPathFromUrl(url);
    if (path) {
      await this.deleteFile(path);
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(path: string): Promise<{
    name: string;
    size: number;
    contentType: string;
    lastModified: string;
  }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop(),
        });

      if (error || !data || data.length === 0) {
        throw new Error('파일을 찾을 수 없습니다.');
      }

      const fileInfo = data[0];
      return {
        name: fileInfo.name,
        size: fileInfo.metadata?.size || 0,
        contentType: fileInfo.metadata?.contentType || 'application/octet-stream',
        lastModified: fileInfo.updated_at || fileInfo.created_at,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('파일 정보 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * List files in a directory
   */
  static async listFiles(directory: string = '', limit: number = 100): Promise<Array<{
    name: string;
    path: string;
    size: number;
    contentType: string;
    lastModified: string;
    url: string;
  }>> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(directory, {
          limit,
          sortBy: { column: 'updated_at', order: 'desc' },
        });

      if (error) {
        throw new Error(`파일 목록 조회 실패: ${error.message}`);
      }

      return (data || []).map(file => {
        const fullPath = directory ? `${directory}/${file.name}` : file.name;
        const { data: publicUrlData } = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(fullPath);

        return {
          name: file.name,
          path: fullPath,
          size: file.metadata?.size || 0,
          contentType: file.metadata?.contentType || 'application/octet-stream',
          lastModified: file.updated_at || file.created_at,
          url: publicUrlData.publicUrl,
        };
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('파일 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Create signed URL for private access
   */
  static async createSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(path, expiresIn);

      if (error || !data) {
        throw new Error('서명된 URL 생성에 실패했습니다.');
      }

      return data.signedUrl;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('서명된 URL 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * Check if file exists
   */
  static async fileExists(path: string): Promise<boolean> {
    try {
      const directory = path.split('/').slice(0, -1).join('/');
      const fileName = path.split('/').pop();

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(directory, {
          search: fileName,
        });

      if (error) {
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byContentType: Record<string, { count: number; size: number }>;
  }> {
    try {
      const files = await this.listFiles('', 1000); // Get up to 1000 files

      const stats = {
        totalFiles: files.length,
        totalSize: 0,
        byContentType: {} as Record<string, { count: number; size: number }>,
      };

      files.forEach(file => {
        stats.totalSize += file.size;

        if (!stats.byContentType[file.contentType]) {
          stats.byContentType[file.contentType] = { count: 0, size: 0 };
        }

        stats.byContentType[file.contentType].count++;
        stats.byContentType[file.contentType].size += file.size;
      });

      return stats;
    } catch (error) {
      throw new Error('스토리지 통계 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * Extract file path from public URL
   */
  private static extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');

      // Find the bucket name in the path and extract everything after it
      const bucketIndex = pathParts.indexOf(this.BUCKET_NAME);
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cleanup orphaned files (files not referenced in database)
   */
  static async cleanupOrphanedFiles(): Promise<{
    deletedCount: number;
    deletedSize: number;
    errors: string[];
  }> {
    const result = {
      deletedCount: 0,
      deletedSize: 0,
      errors: [] as string[],
    };

    try {
      // Get all files from storage
      const storageFiles = await this.listFiles('banners');

      // Get all image URLs from database
      const { data: banners, error } = await supabase
        .from('banners')
        .select('image_url, thumbnail_url')
        .not('image_url', 'is', null);

      if (error) {
        throw new Error(`데이터베이스 조회 실패: ${error.message}`);
      }

      const referencedUrls = new Set<string>();
      banners.forEach(banner => {
        if (banner.image_url) referencedUrls.add(banner.image_url);
        if (banner.thumbnail_url) referencedUrls.add(banner.thumbnail_url);
      });

      // Find orphaned files
      const orphanedFiles = storageFiles.filter(file => !referencedUrls.has(file.url));

      // Delete orphaned files
      for (const file of orphanedFiles) {
        try {
          await this.deleteFile(file.path);
          result.deletedCount++;
          result.deletedSize += file.size;
        } catch (error) {
          result.errors.push(`Failed to delete ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return result;
    } catch (error) {
      throw new Error(`정리 작업 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}