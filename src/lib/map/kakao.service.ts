import { Coordinates } from '@/types';

// Kakao Map API service
export class KakaoMapService {
  /**
   * Get API key (dynamically read from environment)
   */
  private static getApiKey(): string | undefined {
    return process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
  }

  /**
   * Get REST API key (dynamically read from environment)
   */
  private static getRestApiKey(): string | undefined {
    return process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
  }

  /**
   * Initialize Kakao Map script
   */
  static async loadKakaoMapScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.kakao?.maps) {
        resolve();
        return;
      }

      const apiKey = this.getApiKey();
      if (!apiKey) {
        reject(new Error('Kakao Map API key is not configured'));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,clusterer&autoload=false`;
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
    const restApiKey = this.getRestApiKey();

    console.log('[KakaoMapService] REST API Key present:', !!restApiKey);
    console.log('[KakaoMapService] REST API Key value:', restApiKey ? `${restApiKey.substring(0, 8)}...` : 'undefined');

    if (!restApiKey) {
      throw new Error('Kakao REST API key is not configured');
    }

    try {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
        {
          headers: {
            Authorization: `KakaoAK ${restApiKey}`,
            KA: 'sdk/1.0 os/javascript lang/en-US origin/http://localhost:3000',
          },
        }
      );

      console.log('[KakaoMapService] Kakao API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[KakaoMapService] Kakao API error response:', errorText);
        throw new Error(`Kakao API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.documents || data.documents.length === 0) {
        throw new Error('주소를 찾을 수 없습니다. 정확한 주소를 입력해주세요.');
      }

      const document = data.documents[0];
      const coordinates = {
        lat: parseFloat(document.y),
        lng: parseFloat(document.x),
      };

      // Get administrative district using coord2regioncode for accurate result
      const administrative_district = await this.getAdministrativeDistrictByCoordinates(
        coordinates.lat,
        coordinates.lng
      );

      return {
        ...coordinates,
        administrative_district,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('주소 변환 중 오류가 발생했습니다.');
    }
  }

  /**
   * Get administrative district (행정동) using coordinates
   * Uses Kakao coord2regioncode API to get accurate administrative district
   */
  static async getAdministrativeDistrictByCoordinates(lat: number, lng: number): Promise<string | undefined> {
    const restApiKey = this.getRestApiKey();
    if (!restApiKey) {
      throw new Error('Kakao REST API key is not configured');
    }

    try {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
        {
          headers: {
            Authorization: `KakaoAK ${restApiKey}`,
            KA: 'sdk/1.0 os/javascript lang/en-US origin/http://localhost:3000',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Kakao API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.documents || data.documents.length === 0) {
        return undefined;
      }

      // Find the 'H' type document which represents administrative district (행정동)
      const adminDistrict = data.documents.find((doc: any) => doc.region_type === 'H');

      if (adminDistrict) {
        // region_3depth_name contains the administrative district name (e.g., "삼성1동", "역삼2동")
        return adminDistrict.region_3depth_name;
      }

      return undefined;
    } catch (error) {
      console.error('Failed to get administrative district:', error);
      return undefined;
    }
  }

  /**
   * Convert coordinates to address using Kakao API
   */
  static async coordinatesToAddress(lat: number, lng: number): Promise<{
    address: string;
    administrative_district?: string;
  }> {
    const restApiKey = this.getRestApiKey();
    if (!restApiKey) {
      throw new Error('Kakao REST API key is not configured');
    }

    try {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
        {
          headers: {
            Authorization: `KakaoAK ${restApiKey}`,
            KA: 'sdk/1.0 os/javascript lang/en-US origin/http://localhost:3000',
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

      if (document.road_address) {
        address = document.road_address.address_name;
      } else if (document.address) {
        address = document.address.address_name;
      }

      // Get administrative district using coord2regioncode for accurate result
      const administrative_district = await this.getAdministrativeDistrictByCoordinates(lat, lng);

      return {
        address,
        administrative_district,
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
    const restApiKey = this.getRestApiKey();
    if (!restApiKey) {
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
          Authorization: `KakaoAK ${restApiKey}`,
          KA: 'sdk/1.0 os/javascript lang/en-US origin/http://localhost:3000',
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
   * Get administrative districts within Gangnam-gu (22 total)
   */
  static async getGangnamDistricts(): Promise<string[]> {
    // Complete list of 22 administrative districts in Gangnam-gu
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
      '세곡동',
      '일원본동',
      '일원1동',
      '일원2동',
      '수서동',
    ];
  }

  /**
   * Check if coordinates are within Gangnam-gu bounds
   * Updated bounds to cover entire Gangnam-gu including southern areas (Suseo, Segok)
   */
  static isWithinGangnamBounds(coordinates: Coordinates): boolean {
    // Extended bounds of Gangnam-gu to cover all areas
    const bounds = {
      north: 37.5500,  // Extended north (Cheongdam area)
      south: 37.4400,  // Extended south (Suseo, Segok area)
      east: 127.1300,  // Extended east (Suseo area)
      west: 126.9800,  // Extended west (Sinsa, Apgujeong area)
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
        CustomOverlay: any;
        LatLngBounds: any;
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