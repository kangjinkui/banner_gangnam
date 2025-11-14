import { NextRequest, NextResponse } from 'next/server';
import { BannerService } from '@/lib/services/banner.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json({
        success: false,
        error: '위도와 경도를 입력해주세요.',
      }, { status: 400 });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({
        success: false,
        error: '유효한 좌표를 입력해주세요.',
      }, { status: 400 });
    }

    // Reverse geocode using BannerService
    const result = await BannerService.reverseGeocode(latitude, longitude);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('GET /api/banners/reverse-geocode error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
