import { BannersService } from '@/lib/database';
import { GeocodingService, AdministrativeService } from '@/lib/map';
import { ImageService } from '@/lib/storage';
import {
  bannerCreateSchema,
  bannerUpdateSchema,
  type BannerCreateInput,
  type BannerUpdateInput,
  type BannerFormInput,
} from '@/lib/validations';
import { Banner, BannerWithParty, BannerStats, MapMarker } from '@/types/banner';
import { QueryOptions } from '@/types';

export class BannerService {
  /**
   * Get all banners with optional filtering and pagination
   */
  static async getAll(options?: QueryOptions): Promise<{ data: BannerWithParty[]; total: number }> {
    return BannersService.getAll(options);
  }

  /**
   * Get banners within map bounds
   */
  static async getByBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<BannerWithParty[]> {
    return BannersService.getByBounds(bounds);
  }

  /**
   * Get map markers for display
   */
  static async getMapMarkers(bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<MapMarker[]> {
    const banners = bounds
      ? await BannersService.getByBounds(bounds)
      : (await BannersService.getAll()).data;

    const now = new Date();

    return banners.map((banner) => ({
      id: banner.id,
      position: { lat: banner.lat, lng: banner.lng },
      party_color: banner.party.color,
      party_name: banner.party.name,
      text: banner.text,
      address: banner.address,
      is_expired: new Date(banner.end_date) < now,
    }));
  }

  /**
   * Get a single banner by ID
   */
  static async getById(id: string): Promise<BannerWithParty | null> {
    if (!id || typeof id !== 'string') {
      throw new Error('올바른 현수막 ID를 입력하세요.');
    }
    return BannersService.getById(id);
  }

  /**
   * Create a new banner with complete workflow
   */
  static async create(input: BannerFormInput): Promise<Banner> {
    // Validate input
    const { image, ...bannerData } = input;
    const validatedInput = bannerCreateSchema.parse(bannerData);

    try {
      // Step 1: Geocode address (includes administrative_district from Kakao API)
      const geocodeResult = await GeocodingService.addressToCoordinates(validatedInput.address);

      // Step 2: Use administrative district from geocoding result
      // Kakao API's coord2regioncode provides the most accurate administrative district
      const administrativeDistrict = geocodeResult.administrative_district || null;

      // Log for debugging
      console.log('Banner creation - Address:', validatedInput.address);
      console.log('Banner creation - Coordinates:', geocodeResult.lat, geocodeResult.lng);
      console.log('Banner creation - Administrative district:', administrativeDistrict);

      // Step 3: Upload image if provided
      let imageUrl: string | undefined;
      let thumbnailUrl: string | undefined;

      if (image && ImageService.isValidImage(image)) {
        const uploadResult = await ImageService.uploadBannerImage(image);
        imageUrl = uploadResult.originalUrl;
        thumbnailUrl = uploadResult.thumbnailUrl;
      }

      // Step 4: Create banner in database
      const banner = await BannersService.create({
        party_id: validatedInput.party_id,
        address: validatedInput.address,
        text: validatedInput.text,
        start_date: validatedInput.start_date,
        end_date: validatedInput.end_date,
        memo: validatedInput.memo,
        is_active: validatedInput.is_active,
        lat: geocodeResult.lat,
        lng: geocodeResult.lng,
        administrative_district: administrativeDistrict,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
      });

      return banner;
    } catch (error) {
      throw new Error(`현수막 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * Update a banner with validation and geocoding
   */
  static async update(id: string, input: BannerFormInput): Promise<Banner> {
    if (!id || typeof id !== 'string') {
      throw new Error('올바른 현수막 ID를 입력하세요.');
    }

    const { image, ...bannerData } = input;
    const validatedInput = bannerUpdateSchema.parse(bannerData);

    // Check if banner exists
    const existingBanner = await BannersService.getById(id);
    if (!existingBanner) {
      throw new Error('현수막을 찾을 수 없습니다.');
    }

    try {
      let updateData = { ...validatedInput };

      // Re-geocode if address has changed
      if (validatedInput.address && validatedInput.address !== existingBanner.address) {
        const geocodeResult = await GeocodingService.addressToCoordinates(validatedInput.address);

        // Use administrative district directly from Kakao API
        const administrativeDistrict = geocodeResult.administrative_district || null;

        // Log for debugging
        console.log('Banner update - Address:', validatedInput.address);
        console.log('Banner update - Coordinates:', geocodeResult.lat, geocodeResult.lng);
        console.log('Banner update - Administrative district:', administrativeDistrict);

        updateData = {
          ...updateData,
          lat: geocodeResult.lat,
          lng: geocodeResult.lng,
          administrative_district: administrativeDistrict,
        } as any;
      }

      // Handle image update
      if (image && ImageService.isValidImage(image)) {
        // Delete old images
        if (existingBanner.image_url) {
          await ImageService.deleteBannerImages(existingBanner.image_url, existingBanner.thumbnail_url || undefined);
        }

        // Upload new images
        const uploadResult = await ImageService.uploadBannerImage(image, id);
        (updateData as any).image_url = uploadResult.originalUrl;
        (updateData as any).thumbnail_url = uploadResult.thumbnailUrl;
      }

      // Update banner
      return BannersService.update(id, updateData);
    } catch (error) {
      throw new Error(`현수막 업데이트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * Delete a banner (soft delete)
   */
  static async delete(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('올바른 현수막 ID를 입력하세요.');
    }

    // Check if banner exists
    const existingBanner = await BannersService.getById(id);
    if (!existingBanner) {
      throw new Error('현수막을 찾을 수 없습니다.');
    }

    // Delete banner
    await BannersService.delete(id);
  }

  /**
   * Hard delete a banner (permanent deletion - admin only)
   */
  static async hardDelete(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('올바른 현수막 ID를 입력하세요.');
    }

    // Get banner data for cleanup
    const existingBanner = await BannersService.getById(id);
    if (!existingBanner) {
      throw new Error('현수막을 찾을 수 없습니다.');
    }

    // Delete images if they exist
    if (existingBanner.image_url) {
      await ImageService.deleteBannerImages(existingBanner.image_url, existingBanner.thumbnail_url || undefined);
    }

    // Hard delete from database
    await BannersService.hardDelete(id);
  }

  /**
   * Get banner statistics
   */
  static async getStats(filters?: any): Promise<BannerStats> {
    return BannersService.getStats(filters);
  }

  /**
   * Get unique administrative districts from banners
   */
  static async getAdministrativeDistricts(): Promise<string[]> {
    return BannersService.getAdministrativeDistricts();
  }

  /**
   * Bulk update banners
   */
  static async bulkUpdate(bannerIds: string[], updates: Partial<BannerUpdateInput>): Promise<void> {
    if (!Array.isArray(bannerIds) || bannerIds.length === 0) {
      throw new Error('업데이트할 현수막을 선택하세요.');
    }

    const validatedUpdates = bannerUpdateSchema.parse(updates);
    await BannersService.bulkUpdate(bannerIds, validatedUpdates);
  }

  /**
   * Bulk delete banners
   */
  static async bulkDelete(bannerIds: string[]): Promise<void> {
    if (!Array.isArray(bannerIds) || bannerIds.length === 0) {
      throw new Error('삭제할 현수막을 선택하세요.');
    }

    await BannersService.bulkDelete(bannerIds);
  }

  /**
   * Validate banner address
   */
  static async validateAddress(address: string): Promise<{
    isValid: boolean;
    coordinates?: { lat: number; lng: number };
    administrative_district?: string;
    error?: string;
  }> {
    return GeocodingService.validateGangnamAddress(address);
  }

  /**
   * Get address suggestions for autocomplete
   */
  static async getAddressSuggestions(query: string): Promise<Array<{
    address: string;
    coordinates: { lat: number; lng: number };
    administrative_district?: string;
  }>> {
    return GeocodingService.getAddressSuggestions(query);
  }

  /**
   * Check for expired banners
   */
  static async getExpiredBanners(): Promise<BannerWithParty[]> {
    const now = new Date();
    const { data } = await BannersService.getAll({
      filters: {
        is_active: true,
        date_range: { start_date: '', end_date: now.toISOString().split('T')[0] },
      },
    } as any);

    return data.filter(banner => new Date(banner.end_date) < now);
  }

  /**
   * Extend banner period
   */
  static async extendPeriod(id: string, newEndDate: string): Promise<Banner> {
    if (!id || typeof id !== 'string') {
      throw new Error('올바른 현수막 ID를 입력하세요.');
    }

    const existingBanner = await BannersService.getById(id);
    if (!existingBanner) {
      throw new Error('현수막을 찾을 수 없습니다.');
    }

    const newEndDateTime = new Date(newEndDate);
    const currentEndDateTime = new Date(existingBanner.end_date);

    if (newEndDateTime <= currentEndDateTime) {
      throw new Error('연장 날짜는 현재 종료일보다 늦어야 합니다.');
    }

    return BannersService.update(id, { end_date: newEndDate });
  }

  /**
   * Duplicate banner
   */
  static async duplicate(id: string, overrides?: Partial<BannerCreateInput>): Promise<Banner> {
    if (!id || typeof id !== 'string') {
      throw new Error('올바른 현수막 ID를 입력하세요.');
    }

    const existingBanner = await BannersService.getById(id);
    if (!existingBanner) {
      throw new Error('현수막을 찾을 수 없습니다.');
    }

    // Prepare data for duplication (exclude ID and timestamps)
    const duplicateData: BannerCreateInput = {
      party_id: existingBanner.party_id,
      address: existingBanner.address,
      text: existingBanner.text,
      start_date: existingBanner.start_date,
      end_date: existingBanner.end_date,
      memo: existingBanner.memo || undefined,
      is_active: existingBanner.is_active,
      ...overrides, // Apply any overrides
    };

    return BannersService.create({
      party_id: duplicateData.party_id,
      address: duplicateData.address,
      text: duplicateData.text,
      start_date: duplicateData.start_date,
      end_date: duplicateData.end_date,
      memo: duplicateData.memo,
      is_active: duplicateData.is_active,
      lat: existingBanner.lat,
      lng: existingBanner.lng,
      administrative_district: existingBanner.administrative_district || undefined,
      // Note: Images are not duplicated to avoid storage issues
    });
  }

  /**
   * Search banners by text content
   */
  static async searchByText(query: string, limit: number = 20): Promise<BannerWithParty[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const { data } = await BannersService.getAll({
      filters: { search: query.trim() },
      limit,
    });

    return data;
  }

  /**
   * Get banners by party
   */
  static async getByParty(partyId: string): Promise<BannerWithParty[]> {
    if (!partyId || typeof partyId !== 'string') {
      throw new Error('올바른 정당 ID를 입력하세요.');
    }

    const { data } = await BannersService.getAll({
      filters: { party_id: [partyId] },
    } as any);

    return data;
  }

  /**
   * Reverse geocode coordinates to address
   */
  static async reverseGeocode(lat: number, lng: number): Promise<{
    address: string;
    administrative_district?: string;
  }> {
    return GeocodingService.coordinatesToAddress(lat, lng);
  }
}