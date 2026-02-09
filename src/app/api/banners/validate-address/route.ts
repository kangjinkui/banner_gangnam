import { NextRequest, NextResponse } from 'next/server';
import { BannerService } from '@/lib/services/banner.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({
        success: false,
        error: '주소를 입력해주세요.',
      }, { status: 400 });
    }

    // Validate address using BannerService
    const validationResult = await BannerService.validateAddress(address);

    return NextResponse.json({
      success: true,
      data: validationResult,
    });
  } catch (error) {
    console.error('GET /api/banners/validate-address error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
