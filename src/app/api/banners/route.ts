import { NextRequest, NextResponse } from 'next/server';
import { BannerService } from '@/lib/services/banner.service';
import { bannerCreateSchema } from '@/lib/validations';
import { QueryOptions } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const isActive = searchParams.get('is_active');
    const bannerType = searchParams.get('banner_type') || undefined;
    const department = searchParams.get('department') || undefined;
    const partyIds = searchParams.get('party_ids')?.split(',').filter(Boolean);
    const districts = searchParams.get('districts')?.split(',').filter(Boolean);
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const sortField = searchParams.get('sort_field') || 'created_at';
    const sortDirection = searchParams.get('sort_direction') || 'desc';

    // Handle map bounds for spatial queries
    const bounds = searchParams.get('bounds');
    let boundsObj;
    if (bounds) {
      try {
        boundsObj = JSON.parse(bounds);
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: '잘못된 bounds 파라미터입니다.',
        }, { status: 400 });
      }
    }

    // If bounds are provided, use spatial query
    if (boundsObj) {
      const banners = await BannerService.getByBounds(boundsObj);
      return NextResponse.json({
        success: true,
        data: banners,
        total: banners.length,
      });
    }

    const options: QueryOptions = {
      page,
      limit,
      filters: {
        banner_type: bannerType as 'political' | 'public' | 'rally' | 'all' | undefined,
        department,
        search,
        is_active: isActive ? isActive === 'true' : undefined,
        party_id: partyIds,
        administrative_district: districts,
        date_range: startDate || endDate ? { start_date: startDate, end_date: endDate } : undefined,
      },
      sort: {
        field: sortField,
        direction: sortDirection as 'asc' | 'desc',
      },
    };

    const result = await BannerService.getAll(options);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/banners error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract common fields
    const bannerType = (formData.get('banner_type') as string) || 'political';
    const address = formData.get('address') as string;
    const text = formData.get('text') as string;
    const memo = formData.get('memo') as string || undefined;
    const isActiveRaw = formData.get('is_active');
    const isActive = isActiveRaw === null ? undefined : isActiveRaw === 'true';
    const image = formData.get('image') as File | null;

    // Prepare data based on banner type
    const bannerData: any = {
      banner_type: bannerType,
      address,
      text,
      memo,
      ...(isActive !== undefined ? { is_active: isActive } : {}),
    };

    // Add type-specific fields
    if (bannerType === 'political') {
      bannerData.party_id = formData.get('party_id') as string;
      bannerData.start_date = formData.get('start_date') as string;
      bannerData.end_date = formData.get('end_date') as string;
    } else if (bannerType === 'public') {
      bannerData.department = formData.get('department') as string;
      const startDate = formData.get('start_date') as string;
      const endDate = formData.get('end_date') as string;
      if (startDate) bannerData.start_date = startDate;
      if (endDate) bannerData.end_date = endDate;
    } else if (bannerType === 'rally') {
      const startDate = formData.get('start_date') as string;
      const endDate = formData.get('end_date') as string;
      if (startDate) bannerData.start_date = startDate;
      if (endDate) bannerData.end_date = endDate;
    }

    // Validate input
    const validatedData = bannerCreateSchema.parse(bannerData);

    // Create banner with image
    const banner = await BannerService.create({
      ...validatedData,
      image: image || undefined,
    } as any);

    return NextResponse.json({
      success: true,
      data: banner,
      message: '현수막이 성공적으로 생성되었습니다.',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/banners error:', error);

    if (error instanceof Error) {
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
