import { NextRequest, NextResponse } from 'next/server';
import { BannerService } from '@/lib/services/banner.service';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filters = body.filters || {};

    // Get banner data with filters
    const { data: banners } = await BannerService.getAll({
      filters,
    });

    // Prepare data for Excel
    const isPublicRallyExport = filters.banner_type &&
      Array.isArray(filters.banner_type) &&
      filters.banner_type.includes('public');

    const excelData = banners.map(banner => {
      const isRally = banner.banner_type === 'rally';
      const base: Record<string, string | undefined> = {
        '게시자명': (banner as any).poster_name || (banner.party?.name) || '',
        '현수막 문구': banner.text,
        '주소': banner.address,
        '행정동': banner.administrative_district || '미분류',
        '활성 상태': banner.is_active ? '활성' : '비활성',
        '생성일': new Date(banner.created_at).toLocaleDateString('ko-KR'),
        '메모': banner.memo || '',
        '이미지 URL': banner.image_url || '',
      };
      if (!isPublicRallyExport || !isRally) {
        base['시작일'] = banner.start_date || '';
        base['종료일'] = banner.end_date || '';
      } else {
        base['시작일'] = '';
        base['종료일'] = '';
      }
      return base;
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // 게시자명
      { wch: 30 }, // 현수막 문구
      { wch: 40 }, // 주소
      { wch: 12 }, // 행정동
      { wch: 10 }, // 활성 상태
      { wch: 12 }, // 생성일
      { wch: 30 }, // 메모
      { wch: 50 }, // 이미지 URL
      { wch: 12 }, // 시작일
      { wch: 12 }, // 종료일
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, '현수막 목록');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="banners_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('POST /api/export/excel error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
