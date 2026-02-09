import { NextRequest, NextResponse } from 'next/server';
import { BannerService } from '@/lib/services/banner.service';
import { bannerBulkUpdateSchema, bannerBulkDeleteSchema } from '@/lib/validations';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = bannerBulkUpdateSchema.parse(body);

    // Perform bulk update
    await BannerService.bulkUpdate(validatedData.banner_ids, validatedData.updates);

    return NextResponse.json({
      success: true,
      message: `${validatedData.banner_ids.length}개의 현수막이 성공적으로 수정되었습니다.`,
    });
  } catch (error) {
    console.error('PUT /api/banners/bulk error:', error);

    if (error instanceof Error) {
      if (error.message.includes('validation') || error.message.includes('선택')) {
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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = bannerBulkDeleteSchema.parse(body);

    // Perform bulk delete
    await BannerService.bulkDelete(validatedData.banner_ids);

    return NextResponse.json({
      success: true,
      message: `${validatedData.banner_ids.length}개의 현수막이 성공적으로 삭제되었습니다.`,
    });
  } catch (error) {
    console.error('DELETE /api/banners/bulk error:', error);

    if (error instanceof Error) {
      if (error.message.includes('validation') || error.message.includes('선택')) {
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