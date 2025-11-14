import { NextRequest, NextResponse } from 'next/server';
import { PartyService } from '@/lib/services/party.service';

export async function GET(request: NextRequest) {
  try {
    const stats = await PartyService.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('GET /api/parties/stats error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}