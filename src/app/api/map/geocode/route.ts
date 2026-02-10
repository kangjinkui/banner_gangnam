import { NextRequest, NextResponse } from 'next/server';
import { GeocodingService } from '@/lib/map';
import { geocodingRequestSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = geocodingRequestSchema.parse(body);

    // Geocode address
    const result = await GeocodingService.addressToCoordinates(validatedData.address);

    return NextResponse.json({
      success: true,
      data: {
        lat: result.lat,
        lng: result.lng,
        administrative_district: result.administrative_district,
        formatted_address: validatedData.address,
      },
    });
  } catch (error) {
    console.error('POST /api/map/geocode error:', error);

    if (error instanceof Error) {
      if (error.message.includes('validation') || error.message.includes('올바른')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 400 });
      }

      if (error.message.includes('찾을 수 없습니다') || error.message.includes('API')) {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get address suggestions
    const suggestions = await GeocodingService.getAddressSuggestions(query, 10);

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('GET /api/map/geocode error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}