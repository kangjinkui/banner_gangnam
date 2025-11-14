import { PartiesService, BannersService } from '@/lib/database';
import { ImageService } from '@/lib/storage';
import { partyCreateSchema, partyUpdateSchema, type PartyCreateInput, type PartyUpdateInput } from '@/lib/validations';
import { Party, PartyWithBannerCount } from '@/types/party';
import { QueryOptions } from '@/types';

export class PartyService {
  /**
   * Get all parties with optional filtering and pagination
   */
  static async getAll(options?: QueryOptions): Promise<{ data: Party[]; total: number }> {
    return PartiesService.getAll(options);
  }

  /**
   * Get parties with banner counts
   */
  static async getWithBannerCounts(): Promise<PartyWithBannerCount[]> {
    return PartiesService.getWithBannerCounts();
  }

  /**
   * Get a single party by ID
   */
  static async getById(id: string): Promise<Party | null> {
    if (!id || typeof id !== 'string') {
      throw new Error('올바른 정당 ID를 입력하세요.');
    }
    return PartiesService.getById(id);
  }

  /**
   * Create a new party with validation
   */
  static async create(input: PartyCreateInput): Promise<Party> {
    // Validate input
    const parsed = partyCreateSchema.parse(input);

    // Check if party name already exists
    const nameExists = await PartiesService.nameExists(parsed.name);
    if (nameExists) {
      throw new Error('이미 존재하는 정당명입니다.');
    }

    // Create party with validated data
    return PartiesService.create({
      name: parsed.name,
      color: parsed.color,
      marker_icon_url: parsed.marker_icon_url,
      is_active: parsed.is_active ?? true,
    });
  }

  /**
   * Update a party with validation
   */
  static async update(id: string, input: PartyUpdateInput): Promise<Party> {
    if (!id || typeof id !== 'string') {
      throw new Error('올바른 정당 ID를 입력하세요.');
    }

    // Validate input
    const validatedInput = partyUpdateSchema.parse(input);

    // Check if party exists
    const existingParty = await PartiesService.getById(id);
    if (!existingParty) {
      throw new Error('정당을 찾을 수 없습니다.');
    }

    // Check if new name already exists (if name is being updated)
    if (validatedInput.name && validatedInput.name !== existingParty.name) {
      const nameExists = await PartiesService.nameExists(validatedInput.name, id);
      if (nameExists) {
        throw new Error('이미 존재하는 정당명입니다.');
      }
    }

    // Update party
    return PartiesService.update(id, validatedInput);
  }

  /**
   * Delete a party (soft delete)
   */
  static async delete(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('올바른 정당 ID를 입력하세요.');
    }

    // Check if party exists
    const existingParty = await PartiesService.getById(id);
    if (!existingParty) {
      throw new Error('정당을 찾을 수 없습니다.');
    }

    // Check if party has active banners
    const { data: banners } = await BannersService.getAll({
      filters: { party_id: [id], is_active: true },
      limit: 1,
    });

    if (banners && banners.length > 0) {
      throw new Error('활성화된 현수막이 있는 정당은 삭제할 수 없습니다. 먼저 현수막을 비활성화하거나 삭제하세요.');
    }

    // Delete party
    await PartiesService.delete(id);
  }

  /**
   * Hard delete a party (permanent deletion - admin only)
   */
  static async hardDelete(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('올바른 정당 ID를 입력하세요.');
    }

    await PartiesService.hardDelete(id);
  }

  /**
   * Upload and set party marker icon
   */
  static async uploadMarkerIcon(partyId: string, iconFile: File): Promise<string> {
    if (!iconFile || !ImageService.isValidImage(iconFile)) {
      throw new Error('올바른 이미지 파일을 선택하세요.');
    }

    // Check if party exists
    const existingParty = await PartiesService.getById(partyId);
    if (!existingParty) {
      throw new Error('정당을 찾을 수 없습니다.');
    }

    try {
      // Upload icon image (smaller size for markers)
      const processedIcon = await ImageService.processImage(iconFile, {
        maxWidth: 64,
        maxHeight: 64,
        quality: 0.9,
        format: 'png', // PNG for better icon quality with transparency
      });

      const uploadResult = await ImageService.uploadBannerImage(processedIcon, `party_${partyId}_icon`);

      // Delete old icon if exists
      if (existingParty.marker_icon_url) {
        await ImageService.deleteBannerImages(existingParty.marker_icon_url);
      }

      // Update party with new icon URL
      await PartiesService.update(partyId, {
        marker_icon_url: uploadResult.originalUrl,
      });

      return uploadResult.originalUrl;
    } catch (error) {
      throw new Error(`마커 아이콘 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * Remove party marker icon
   */
  static async removeMarkerIcon(partyId: string): Promise<void> {
    // Check if party exists
    const existingParty = await PartiesService.getById(partyId);
    if (!existingParty) {
      throw new Error('정당을 찾을 수 없습니다.');
    }

    // Delete icon file if exists
    if (existingParty.marker_icon_url) {
      await ImageService.deleteBannerImages(existingParty.marker_icon_url);
    }

    // Update party to remove icon URL
    await PartiesService.update(partyId, {
      marker_icon_url: null,
    });
  }

  /**
   * Get party statistics
   */
  static async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalBanners: number;
    activeBanners: number;
  }> {
    const { data: allParties } = await PartiesService.getAll();
    const partiesWithBanners = await PartiesService.getWithBannerCounts();

    const totalBanners = partiesWithBanners.reduce((sum, party) => sum + party.banner_count, 0);
    const activeBanners = partiesWithBanners.reduce((sum, party) => sum + party.active_banner_count, 0);

    return {
      total: allParties.length,
      active: allParties.filter(p => p.is_active).length,
      inactive: allParties.filter(p => !p.is_active).length,
      totalBanners,
      activeBanners,
    };
  }

  /**
   * Validate party data
   */
  static validatePartyData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      partyCreateSchema.parse(data);
      return { isValid: true, errors: [] };
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          errors.push(err.message);
        });
      } else {
        errors.push('유효하지 않은 데이터입니다.');
      }

      return { isValid: false, errors };
    }
  }

  /**
   * Bulk update parties status
   */
  static async bulkUpdateStatus(partyIds: string[], isActive: boolean): Promise<void> {
    if (!Array.isArray(partyIds) || partyIds.length === 0) {
      throw new Error('업데이트할 정당을 선택하세요.');
    }

    const updatePromises = partyIds.map(id =>
      PartiesService.update(id, { is_active: isActive })
    );

    try {
      await Promise.all(updatePromises);
    } catch (error) {
      throw new Error(`일괄 업데이트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * Search parties by name
   */
  static async searchByName(query: string, limit: number = 10): Promise<Party[]> {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const { data } = await PartiesService.getAll({
      filters: { search: query.trim() },
      limit,
    });

    return data;
  }
}