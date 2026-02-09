import { NextRequest, NextResponse } from 'next/server';
import { BannerService } from '@/lib/services/banner.service';
import { bannerUpdateSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '현수막 ID가 필요합니다.',
      }, { status: 400 });
    }

    const banner = await BannerService.getById(id);

    if (!banner) {
      return NextResponse.json({
        success: false,
        error: '현수막을 찾을 수 없습니다.',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.error('GET /api/banners/[id] error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '현수막 ID가 필요합니다.',
      }, { status: 400 });
    }

    const formData = await request.formData();

    // Extract form fields
    const bannerType = formData.get('banner_type') as string || undefined;
    const department = formData.get('department') as string || undefined;
    const partyId = formData.get('party_id') as string || undefined;
    const address = formData.get('address') as string || undefined;
    const text = formData.get('text') as string || undefined;
    const startDate = formData.get('start_date') as string || undefined;
    const endDate = formData.get('end_date') as string || undefined;
    const memo = formData.get('memo') as string || undefined;
    const isActiveStr = formData.get('is_active') as string;
    const isActive = isActiveStr ? isActiveStr === 'true' : undefined;
    const image = formData.get('image') as File | null;

    // Prepare data for validation (only include defined values)
    const bannerData: any = {};
    if (bannerType) bannerData.banner_type = bannerType;
    if (department !== undefined) bannerData.department = department;
    if (partyId) bannerData.party_id = partyId;
    if (address) bannerData.address = address;
    if (text) bannerData.text = text;
    if (startDate) bannerData.start_date = startDate;
    if (endDate) bannerData.end_date = endDate;
    if (memo !== undefined) bannerData.memo = memo;
    if (isActive !== undefined) bannerData.is_active = isActive;

    // Enforce type-specific fields when banner_type is provided
    if (bannerType === 'political') {
      if (!partyId) {
        return NextResponse.json({
          success: false,
          error: '정치 현수막은 정당이 필요합니다.',
        }, { status: 400 });
      }
    }

    if (bannerType === 'public') {
      if (!department) {
        return NextResponse.json({
          success: false,
          error: '공공 현수막은 부서명이 필요합니다.',
        }, { status: 400 });
      }
      bannerData.party_id = null;
    }

    if (bannerType === 'rally') {
      bannerData.party_id = null;
      bannerData.department = null;
    }

    // Validate input
    const validatedData = bannerUpdateSchema.parse(bannerData);

    // Update banner with image (cast to any to allow image field)
    const banner = await BannerService.update(id, {
      ...validatedData,
      image: image || undefined,
    } as any);

    return NextResponse.json({
      success: true,
      data: banner,
      message: '현수막이 성공적으로 수정되었습니다.',
    });
  } catch (error) {
    console.error('PUT /api/banners/[id] error:', error);

    if (error instanceof Error) {
      if (error.message.includes('찾을 수 없습니다')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 404 });
      }

      if (error.message.includes('validation') || error.message.includes('올바른')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 400 });
      }

      if (error.message.includes('주소')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 422 });
      }
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '현수막 ID가 필요합니다.',
      }, { status: 400 });
    }

    const body = await request.json();

    // Enforce type-specific fields when banner_type is provided
    if (body?.banner_type === 'political') {
      if (!body.party_id) {
        return NextResponse.json({
          success: false,
          error: '정치 현수막은 정당이 필요합니다.',
        }, { status: 400 });
      }
    }

    if (body?.banner_type === 'public') {
      if (!body.department) {
        return NextResponse.json({
          success: false,
          error: '공공 현수막은 부서명이 필요합니다.',
        }, { status: 400 });
      }
      body.party_id = null;
    }

    if (body?.banner_type === 'rally') {
      body.party_id = null;
      body.department = null;
    }

    // Validate input
    const validatedData = bannerUpdateSchema.parse(body);

    // Update banner
    const banner = await BannerService.update(id, validatedData);

    return NextResponse.json({
      success: true,
      data: banner,
      message: '현수막이 성공적으로 수정되었습니다.',
    });
  } catch (error) {
    console.error('PATCH /api/banners/[id] error:', error);

    if (error instanceof Error) {
      if (error.message.includes('찾을 수 없습니다')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 404 });
      }

      if (error.message.includes('validation') || error.message.includes('올바른')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '현수막 ID가 필요합니다.',
      }, { status: 400 });
    }

    if (hardDelete) {
      await BannerService.hardDelete(id);
    } else {
      await BannerService.delete(id);
    }

    return NextResponse.json({
      success: true,
      message: hardDelete ? '현수막이 영구적으로 삭제되었습니다.' : '현수막이 비활성화되었습니다.',
    });
  } catch (error) {
    console.error('DELETE /api/banners/[id] error:', error);

    if (error instanceof Error) {
      if (error.message.includes('찾을 수 없습니다')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
