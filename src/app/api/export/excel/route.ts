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
    const excelData = banners.map(banner => ({
      '정당명': banner.party.name,
      '현수막 문구': banner.text,
      '주소': banner.address,
      '행정동': banner.administrative_district || '미분류',
      '시작일': banner.start_date,
      '종료일': banner.end_date,
      '활성 상태': banner.is_active ? '활성' : '비활성',
      '생성일': new Date(banner.created_at).toLocaleDateString('ko-KR'),
      '메모': banner.memo || '',
      '이미지 URL': banner.image_url || '',
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // 정당명
      { wch: 30 }, // 현수막 문구
      { wch: 40 }, // 주소
      { wch: 12 }, // 행정동
      { wch: 12 }, // 시작일
      { wch: 12 }, // 종료일
      { wch: 10 }, // 활성 상태
      { wch: 12 }, // 생성일
      { wch: 30 }, // 메모
      { wch: 50 }, // 이미지 URL
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
