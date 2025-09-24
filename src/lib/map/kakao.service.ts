import { Coordinates } from '@/types';

// Kakao Map API service
export class KakaoMapService {
  private static apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
  private static restApiKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

  /**
   * Initialize Kakao Map script
   */
  static async loadKakaoMapScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.kakao?.maps) {
        resolve();
        return;
      }

      if (!this.apiKey) {
        reject(new Error('Kakao Map API key is not configured'));
        return;
      }

      const script = document.createElement('script');
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${this.apiKey}&libraries=services,clusterer&autoload=false`;
      script.async = true;

      script.onload = () => {
        window.kakao.maps.load(() => {
          resolve();
        });
      };

      script.onerror = () => {
        reject(new Error('Failed to load Kakao Map script'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Convert address to coordinates using Kakao API
   */
  static async addressToCoordinates(address: string): Promise<Coordinates & { administrative_district?: string }> {
    if (!this.restApiKey) {
      throw new Error('Kakao REST API key is not configured');
    }

    try {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
        {
          headers: {
            Authorization: `KakaoAK ${this.restApiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Kakao API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.documents || data.documents.length === 0) {
        throw new Error('주소를 찾을 수 없습니다. 정확한 주소를 입력해주세요.');
      }

      const document = data.documents[0];
      const result = {
        lat: parseFloat(document.y),
        lng: parseFloat(document.x),
      };

      // Extract administrative district if available
      if (document.address?.region_3depth_name) {
        result.administrative_district = document.address.region_3depth_name;
      } else if (document.road_address?.region_3depth_name) {
        result.administrative_district = document.road_address.region_3depth_name;
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('주소 변환 중 오류가 발생했습니다.');
    }
  }

  /**
   * Convert coordinates to address using Kakao API
   */
  static async coordinatesToAddress(lat: number, lng: number): Promise<{
    address: string;
    administrative_district?: string;
  }> {
    if (!this.restApiKey) {
      throw new Error('Kakao REST API key is not configured');
    }

    try {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
        {
          headers: {
            Authorization: `KakaoAK ${this.restApiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Kakao API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.documents || data.documents.length === 0) {
        throw new Error('좌표에 해당하는 주소를 찾을 수 없습니다.');
      }

      const document = data.documents[0];
      let address = '';
      let administrative_district = '';

      if (document.road_address) {
        address = document.road_address.address_name;
        administrative_district = document.road_address.region_3depth_name;
      } else if (document.address) {
        address = document.address.address_name;
        administrative_district = document.address.region_3depth_name;
      }

      return {
        address,
        administrative_district: administrative_district || undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('좌표 변환 중 오류가 발생했습니다.');
    }
  }

  /**
   * Search places by keyword
   */
  static async searchPlaces(keyword: string, coordinates?: Coordinates, radius?: number): Promise<Array<{
    name: string;
    address: string;
    coordinates: Coordinates;
    category: string;
  }>> {
    if (!this.restApiKey) {
      throw new Error('Kakao REST API key is not configured');
    }

    try {
      let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}`;

      if (coordinates) {
        url += `&x=${coordinates.lng}&y=${coordinates.lat}`;
        if (radius) {
          url += `&radius=${radius}`;
        }
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `KakaoAK ${this.restApiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Kakao API error: ${response.status}`);
      }

      const data = await response.json();

      return data.documents.map((doc: any) => ({
        name: doc.place_name,
        address: doc.road_address_name || doc.address_name,
        coordinates: {
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
        },
        category: doc.category_group_name || doc.category_name,
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('장소 검색 중 오류가 발생했습니다.');
    }
  }

  /**
   * Get administrative districts within Gangnam-gu
   */
  static async getGangnamDistricts(): Promise<string[]> {
    // Hardcoded list of administrative districts in Gangnam-gu
    // In production, this could be fetched from an API or database
    return [
      '삼성1동',
      '삼성2동',
      '대치1동',
      '대치2동',
      '대치4동',
      '역삼1동',
      '역삼2동',
      '도곡1동',
      '도곡2동',
      '개포1동',
      '개포2동',
      '개포4동',
      '압구정동',
      '청담동',
      '신사동',
      '논현1동',
      '논현2동',
      '압구정동',
      '청담동',
    ];
  }

  /**
   * Check if coordinates are within Gangnam-gu bounds
   */
  static isWithinGangnamBounds(coordinates: Coordinates): boolean {
    // Approximate bounds of Gangnam-gu
    const bounds = {
      north: 37.5400,
      south: 37.4600,
      east: 127.0800,
      west: 127.0000,
    };

    return (
      coordinates.lat >= bounds.south &&
      coordinates.lat <= bounds.north &&
      coordinates.lng >= bounds.west &&
      coordinates.lng <= bounds.east
    );
  }

  /**
   * Calculate distance between two coordinates (in meters)
   */
  static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.lat * Math.PI) / 180;
    const φ2 = (coord2.lat * Math.PI) / 180;
    const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

// Types for Kakao Map
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: any;
        LatLng: any;
        Marker: any;
        InfoWindow: any;
        services: {
          Geocoder: any;
          Places: any;
        };
        MarkerClusterer: any;
        event: {
          addListener: (target: any, type: string, handler: Function) => void;
          removeListener: (target: any, type: string, handler: Function) => void;
        };
      };
    };
  }
}