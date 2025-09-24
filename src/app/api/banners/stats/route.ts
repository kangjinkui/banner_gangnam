import { NextRequest, NextResponse } from 'next/server';
import { BannerService } from '@/lib/services/banner.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filter parameters for stats
    const partyIds = searchParams.get('party_ids')?.split(',').filter(Boolean);
    const districts = searchParams.get('districts')?.split(',').filter(Boolean);

    const filters = {
      party_id: partyIds,
      administrative_district: districts,
    };

    const stats = await BannerService.getStats(filters);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('GET /api/banners/stats error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}