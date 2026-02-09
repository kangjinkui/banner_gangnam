import { NextRequest, NextResponse } from 'next/server';
import { AdministrativeService } from '@/lib/map';
import { BannerService } from '@/lib/services/banner.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'all';

    let districts: string[] = [];

    if (source === 'banners') {
      // Get districts from actual banner data
      districts = await BannerService.getAdministrativeDistricts();
    } else if (source === 'system') {
      // Get all available districts in Gangnam-gu
      const allDistricts = AdministrativeService.getAllDistricts();
      districts = allDistricts.map(d => d.name);
    } else {
      // Get both and merge
      const systemDistricts = AdministrativeService.getAllDistricts().map(d => d.name);
      const bannerDistricts = await BannerService.getAdministrativeDistricts();
      districts = Array.from(new Set([...systemDistricts, ...bannerDistricts])).sort();
    }

    return NextResponse.json({
      success: true,
      data: districts,
    });
  } catch (error) {
    console.error('GET /api/map/districts error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}