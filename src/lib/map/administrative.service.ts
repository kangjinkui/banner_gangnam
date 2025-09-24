import { GeocodingService } from './geocoding.service';
import { KakaoMapService } from './kakao.service';
import { Coordinates } from '@/types';

// Administrative district service for Gangnam-gu
export class AdministrativeService {
  // Administrative districts in Gangnam-gu with their approximate center coordinates
  private static readonly GANGNAM_DISTRICTS = {
    '삼성1동': { lat: 37.5080, lng: 127.0563, bounds: { north: 37.5130, south: 37.5030, east: 127.0613, west: 127.0513 } },
    '삼성2동': { lat: 37.5050, lng: 127.0450, bounds: { north: 37.5100, south: 37.5000, east: 127.0500, west: 127.0400 } },
    '대치1동': { lat: 37.4950, lng: 127.0620, bounds: { north: 37.5000, south: 37.4900, east: 127.0670, west: 127.0570 } },
    '대치2동': { lat: 37.4900, lng: 127.0550, bounds: { north: 37.4950, south: 37.4850, east: 127.0600, west: 127.0500 } },
    '대치4동': { lat: 37.4850, lng: 127.0480, bounds: { north: 37.4900, south: 37.4800, east: 127.0530, west: 127.0430 } },
    '역삼1동': { lat: 37.4950, lng: 127.0350, bounds: { north: 37.5000, south: 37.4900, east: 127.0400, west: 127.0300 } },
    '역삼2동': { lat: 37.4850, lng: 127.0320, bounds: { north: 37.4900, south: 37.4800, east: 127.0370, west: 127.0270 } },
    '도곡1동': { lat: 37.4850, lng: 127.0420, bounds: { north: 37.4900, south: 37.4800, east: 127.0470, west: 127.0370 } },
    '도곡2동': { lat: 37.4750, lng: 127.0350, bounds: { north: 37.4800, south: 37.4700, east: 127.0400, west: 127.0300 } },
    '개포1동': { lat: 37.4800, lng: 127.0650, bounds: { north: 37.4850, south: 37.4750, east: 127.0700, west: 127.0600 } },
    '개포2동': { lat: 37.4700, lng: 127.0580, bounds: { north: 37.4750, south: 37.4650, east: 127.0630, west: 127.0530 } },
    '개포4동': { lat: 37.4650, lng: 127.0450, bounds: { north: 37.4700, south: 37.4600, east: 127.0500, west: 127.0400 } },
    '압구정동': { lat: 37.5280, lng: 127.0280, bounds: { north: 37.5330, south: 37.5230, east: 127.0330, west: 127.0230 } },
    '청담동': { lat: 37.5200, lng: 127.0450, bounds: { north: 37.5250, south: 37.5150, east: 127.0500, west: 127.0400 } },
    '신사동': { lat: 37.5180, lng: 127.0200, bounds: { north: 37.5230, south: 37.5130, east: 127.0250, west: 127.0150 } },
    '논현1동': { lat: 37.5120, lng: 127.0380, bounds: { north: 37.5170, south: 37.5070, east: 127.0430, west: 127.0330 } },
    '논현2동': { lat: 37.5050, lng: 127.0250, bounds: { north: 37.5100, south: 37.5000, east: 127.0300, west: 127.0200 } },
  };

  /**
   * Get all administrative districts in Gangnam-gu
   */
  static getAllDistricts(): Array<{
    name: string;
    center: Coordinates;
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  }> {
    return Object.entries(this.GANGNAM_DISTRICTS).map(([name, data]) => ({
      name,
      center: { lat: data.lat, lng: data.lng },
      bounds: data.bounds,
    }));
  }

  /**
   * Get district by name
   */
  static getDistrictByName(name: string): {
    name: string;
    center: Coordinates;
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  } | null {
    const districtData = this.GANGNAM_DISTRICTS[name as keyof typeof this.GANGNAM_DISTRICTS];
    if (!districtData) {
      return null;
    }

    return {
      name,
      center: { lat: districtData.lat, lng: districtData.lng },
      bounds: districtData.bounds,
    };
  }

  /**
   * Find district by coordinates
   */
  static findDistrictByCoordinates(coordinates: Coordinates): string | null {
    for (const [name, data] of Object.entries(this.GANGNAM_DISTRICTS)) {
      const { bounds } = data;
      if (
        coordinates.lat >= bounds.south &&
        coordinates.lat <= bounds.north &&
        coordinates.lng >= bounds.west &&
        coordinates.lng <= bounds.east
      ) {
        return name;
      }
    }

    return null;
  }

  /**
   * Extract administrative district from address using multiple methods
   */
  static async extractAdministrativeDistrict(address: string, coordinates?: Coordinates): Promise<string | null> {
    // Method 1: Try to extract from address string
    const extractedFromAddress = GeocodingService.extractAdministrativeDistrict(address);
    if (extractedFromAddress && this.GANGNAM_DISTRICTS.hasOwnProperty(extractedFromAddress)) {
      return extractedFromAddress;
    }

    // Method 2: Use coordinates if provided
    if (coordinates) {
      const districtFromCoords = this.findDistrictByCoordinates(coordinates);
      if (districtFromCoords) {
        return districtFromCoords;
      }
    }

    // Method 3: Geocode the address and find district
    try {
      const geocodeResult = await GeocodingService.addressToCoordinates(address);

      // First try the administrative_district from geocoding API
      if (geocodeResult.administrative_district && this.GANGNAM_DISTRICTS.hasOwnProperty(geocodeResult.administrative_district)) {
        return geocodeResult.administrative_district;
      }

      // Then try to find by coordinates
      const districtFromGeocode = this.findDistrictByCoordinates(geocodeResult);
      if (districtFromGeocode) {
        return districtFromGeocode;
      }
    } catch (error) {
      console.error('Failed to extract administrative district:', error);
    }

    return null;
  }

  /**
   * Get districts within a bounding box
   */
  static getDistrictsInBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Array<{
    name: string;
    center: Coordinates;
  }> {
    const result = [];

    for (const [name, data] of Object.entries(this.GANGNAM_DISTRICTS)) {
      const center = { lat: data.lat, lng: data.lng };

      // Check if district center is within bounds
      if (
        center.lat >= bounds.south &&
        center.lat <= bounds.north &&
        center.lng >= bounds.west &&
        center.lng <= bounds.east
      ) {
        result.push({ name, center });
      }
    }

    return result;
  }

  /**
   * Get nearby districts from a given coordinate
   */
  static getNearbyDistricts(coordinates: Coordinates, radiusKm: number = 2): Array<{
    name: string;
    center: Coordinates;
    distance: number;
  }> {
    const results = [];

    for (const [name, data] of Object.entries(this.GANGNAM_DISTRICTS)) {
      const center = { lat: data.lat, lng: data.lng };
      const distance = KakaoMapService.calculateDistance(coordinates, center) / 1000; // Convert to km

      if (distance <= radiusKm) {
        results.push({
          name,
          center,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        });
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get district statistics
   */
  static getDistrictStats(): {
    total: number;
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    center: Coordinates;
  } {
    const districts = Object.values(this.GANGNAM_DISTRICTS);

    const bounds = {
      north: Math.max(...districts.map(d => d.bounds.north)),
      south: Math.min(...districts.map(d => d.bounds.south)),
      east: Math.max(...districts.map(d => d.bounds.east)),
      west: Math.min(...districts.map(d => d.bounds.west)),
    };

    const center = {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2,
    };

    return {
      total: districts.length,
      bounds,
      center,
    };
  }

  /**
   * Validate if address is in a specific district
   */
  static async validateAddressInDistrict(address: string, targetDistrict: string): Promise<{
    isValid: boolean;
    actualDistrict?: string;
    error?: string;
  }> {
    try {
      const extractedDistrict = await this.extractAdministrativeDistrict(address);

      if (!extractedDistrict) {
        return {
          isValid: false,
          error: '행정동을 확인할 수 없습니다.',
        };
      }

      const isValid = extractedDistrict === targetDistrict;

      return {
        isValid,
        actualDistrict: extractedDistrict,
        error: isValid ? undefined : `입력된 주소는 ${extractedDistrict}에 위치합니다.`,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '주소 검증 중 오류가 발생했습니다.',
      };
    }
  }
}