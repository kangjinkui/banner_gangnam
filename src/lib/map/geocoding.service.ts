import { KakaoMapService } from './kakao.service';
import { Coordinates } from '@/types';

// Geocoding service with caching
export class GeocodingService {
  private static cache = new Map<string, { result: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Convert address to coordinates with caching
   */
  static async addressToCoordinates(address: string): Promise<Coordinates & { administrative_district?: string }> {
    const cacheKey = `addr_to_coord_${address}`;
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const result = await KakaoMapService.addressToCoordinates(address);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Convert coordinates to address with caching
   */
  static async coordinatesToAddress(lat: number, lng: number): Promise<{
    address: string;
    administrative_district?: string;
  }> {
    const cacheKey = `coord_to_addr_${lat}_${lng}`;
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const result = await KakaoMapService.coordinatesToAddress(lat, lng);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Extract administrative district from address string
   */
  static extractAdministrativeDistrict(address: string): string | null {
    // Regular expression to extract administrative district from Korean address
    const patterns = [
      // Pattern for "서울시 강남구 삼성1동" format
      /서울(?:특별시|시)?\s*강남구\s*([가-힣]+동)/,
      // Pattern for "강남구 삼성1동" format
      /강남구\s*([가-힣]+동)/,
      // Pattern for standalone district name
      /([가-힣]+[0-9]*동)(?:\s|$)/,
    ];

    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Validate if address is within Gangnam-gu
   */
  static async validateGangnamAddress(address: string): Promise<{
    isValid: boolean;
    coordinates?: Coordinates;
    administrative_district?: string;
    error?: string;
  }> {
    try {
      const result = await this.addressToCoordinates(address);

      // Use Kakao API to verify the district via coord2regioncode
      const isInGangnam = await this.verifyGangnamDistrict(result.lat, result.lng);

      if (!isInGangnam) {
        return {
          isValid: false,
          error: '강남구 내의 주소만 등록할 수 있습니다.',
        };
      }

      return {
        isValid: true,
        coordinates: result,
        administrative_district: result.administrative_district,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '주소 검증 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * Verify if coordinates are in Gangnam-gu using Kakao coord2regioncode API
   */
  private static async verifyGangnamDistrict(lat: number, lng: number): Promise<boolean> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

      if (!apiKey) {
        console.error('Kakao REST API key is not configured');
        return KakaoMapService.isWithinGangnamBounds({ lat, lng });
      }

      const response = await fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
        {
          headers: {
            Authorization: `KakaoAK ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`Kakao API error: ${response.status}`);
        // If API fails, fallback to bounds check
        return KakaoMapService.isWithinGangnamBounds({ lat, lng });
      }

      const data = await response.json();

      if (!data.documents || data.documents.length === 0) {
        return false;
      }

      // Check both 'B' (법정동) and 'H' (행정동) type documents
      for (const doc of data.documents) {
        // region_2depth_name contains the district name (e.g., "강남구")
        if (doc.region_2depth_name === '강남구') {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to verify Gangnam district:', error);
      // Fallback to bounds check if API fails
      return KakaoMapService.isWithinGangnamBounds({ lat, lng });
    }
  }

  /**
   * Batch geocoding for multiple addresses
   */
  static async batchGeocode(addresses: string[]): Promise<Array<{
    address: string;
    result?: Coordinates & { administrative_district?: string };
    error?: string;
  }>> {
    const results = await Promise.allSettled(
      addresses.map(async (address) => {
        try {
          const result = await this.addressToCoordinates(address);
          return { address, result };
        } catch (error) {
          return {
            address,
            error: error instanceof Error ? error.message : '주소 변환 실패',
          };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          address: addresses[index],
          error: '주소 변환 중 오류가 발생했습니다.',
        };
      }
    });
  }

  /**
   * Search for address suggestions
   */
  static async getAddressSuggestions(query: string, limit: number = 5): Promise<Array<{
    address: string;
    coordinates: Coordinates;
    administrative_district?: string;
  }>> {
    if (query.length < 3) {
      return [];
    }

    try {
      const places = await KakaoMapService.searchPlaces(query, undefined, 5000);

      return places
        .filter(place => KakaoMapService.isWithinGangnamBounds(place.coordinates))
        .slice(0, limit)
        .map(place => ({
          address: place.address,
          coordinates: place.coordinates,
          administrative_district: this.extractAdministrativeDistrict(place.address) || undefined,
        }));
    } catch (error) {
      console.error('Failed to get address suggestions:', error);
      return [];
    }
  }

  /**
   * Get cached result
   */
  private static getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set cache result
   */
  private static setCache(key: string, result: any): void {
    // Limit cache size to prevent memory issues
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear geocoding cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxAge: number } {
    const now = Date.now();
    let oldestTimestamp = now;

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxAge: now - oldestTimestamp,
    };
  }
}