'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Users, Calendar, AlertTriangle, Download, Search, Filter } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useBanners, useBannerActions, useBannerSummary, useExpiredBanners } from '@/store/banner.store';
import { useDeleteBanner } from '@/hooks/use-banners';
import { BannerWithParty } from '@/types/banner';
import { KakaoMap } from '@/features/map/components/KakaoMap';
import { PartyManagement } from '@/features/parties/components/PartyManagement';
import { BannerDetailDialog } from '@/features/banners/components/BannerDetailDialog';
import { LoginDialog } from '@/features/auth/components/LoginDialog';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';
import { PLACEHOLDER_IMAGES } from '@/lib/utils/placeholder';

// Mock data - 실제로는 Supabase에서 가져올 데이터
const mockBannersData: BannerWithParty[] = [
  {
    id: '1',
    party_id: '1',
    text: '함께 만드는 더 나은 미래',
    address: '서울시 강남구 역삼동 123-45',
    lat: 37.5665,
    lng: 126.9780,
    administrative_district: '역삼1동',
    start_date: '2024-01-15',
    end_date: '2024-03-15',
    image_url: PLACEHOLDER_IMAGES.banner,
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    party: {
      id: '1',
      name: '더불어민주당',
      color: '#1D4ED8',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: '2',
    party_id: '2',
    text: '국민과 함께하는 변화',
    address: '서울시 서초구 서초동 678-90',
    lat: 37.4835,
    lng: 127.0321,
    administrative_district: '서초1동',
    start_date: '2024-02-01',
    end_date: '2024-02-28',
    image_url: PLACEHOLDER_IMAGES.banner,
    is_active: true,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    party: {
      id: '2',
      name: '국민의힘',
      color: '#DC2626',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: '3',
    party_id: '3',
    text: '청년을 위한 정책',
    address: '서울시 강남구 논현동 456-78',
    lat: 37.5133,
    lng: 127.0384,
    administrative_district: '논현1동',
    start_date: '2024-01-20',
    end_date: '2024-04-20',
    image_url: PLACEHOLDER_IMAGES.banner,
    is_active: true,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
    party: {
      id: '3',
      name: '정의당',
      color: '#F59E0B',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('목록');
  const [isPartyManagementOpen, setIsPartyManagementOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [activePartyCount, setActivePartyCount] = useState(0);

  // Store hooks
  const banners = useBanners();
  const summary = useBannerSummary();
  const expiredBanners = useExpiredBanners();
  const { setBanners } = useBannerActions();

  // Auth hooks
  const { user, isAuthenticated, isLoading, signOut, hasPermission } = useAuth();

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all banners (including inactive) with higher limit for filtering
        const response = await fetch('/api/banners?limit=1000');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setBanners(result.data);
          }
        } else {
          // Fallback to mock data if API fails
          setBanners(mockBannersData);
        }
      } catch (error) {
        console.error('Failed to fetch banners:', error);
        setBanners(mockBannersData);
      }
    };

    fetchData();

    // Also fetch data when page becomes visible (e.g., after navigation back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setBanners]);

  // Fetch active party count
  useEffect(() => {
    const fetchPartyCount = async () => {
      try {
        const response = await fetch('/api/parties');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Count only active parties
            const activeCount = result.data.filter((p: any) => p.is_active).length;
            setActivePartyCount(activeCount);
          }
        }
      } catch (error) {
        console.error('Failed to fetch party count:', error);
      }
    };

    fetchPartyCount();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">현수막 관리 시스템</h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">정당별 현수막 설치 현황 관리</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {isAuthenticated && user ? (
              <>
                {/* User Info - clickable to go to profile */}
                <Link href="/profile" className="flex-shrink-0">
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                    <div className="text-xs sm:text-sm">
                      <p className="font-medium text-gray-900 max-w-[120px] sm:max-w-none truncate">{user.email}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {user.role === 'admin' ? '관리자' : '일반 사용자'}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Admin-only buttons */}
                {hasPermission('parties', 'update') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 sm:gap-2 text-xs sm:text-sm"
                    onClick={() => setIsPartyManagementOpen(true)}
                  >
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">정당 관리</span>
                    <span className="sm:hidden">정당</span>
                  </Button>
                )}

                {hasPermission('banners', 'create') && (
                  <Button asChild size="sm" className="gap-1 sm:gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm">
                    <Link href="/register">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">현수막 등록</span>
                      <span className="sm:hidden">등록</span>
                    </Link>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                  onClick={() => signOut()}
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">로그아웃</span>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="gap-1 sm:gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm"
                onClick={() => setIsLoginDialogOpen(true)}
              >
                <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                로그인
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="총 현수막"
            value={summary.total}
            change={12}
            icon={<MapPin className="w-6 h-6 text-indigo-600" />}
            color="bg-indigo-100"
          />
          <StatsCard
            title="활성 정당"
            value={activePartyCount}
            change={0}
            icon={<Users className="w-6 h-6 text-red-600" />}
            color="bg-red-100"
          />
          <StatsCard
            title="이번 달 등록"
            value={summary.active}
            change={8}
            icon={<Calendar className="w-6 h-6 text-teal-600" />}
            color="bg-teal-100"
          />
          <StatsCard
            title="만료 예정"
            value={summary.expired}
            change={3}
            icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
            color="bg-red-100"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6">
          {['지도', '목록', '통계', '만료'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === '지도' && <MapPin className="w-4 h-4 inline mr-2" />}
              {tab === '목록' && <Filter className="w-4 h-4 inline mr-2" />}
              {tab === '통계' && <Calendar className="w-4 h-4 inline mr-2" />}
              {tab === '만료' && <AlertTriangle className="w-4 h-4 inline mr-2" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <Card>
          <CardContent className="p-6">
            {activeTab === '지도' && <MapView />}
            {activeTab === '목록' && <ListView banners={banners} />}
            {activeTab === '통계' && <StatsView />}
            {activeTab === '만료' && <ExpiredView banners={expiredBanners} />}
          </CardContent>
        </Card>
      </div>

      {/* Party Management Dialog */}
      <PartyManagement
        open={isPartyManagementOpen}
        onOpenChange={setIsPartyManagementOpen}
      />

      {/* Login Dialog */}
      <LoginDialog
        open={isLoginDialogOpen}
        onOpenChange={setIsLoginDialogOpen}
      />
    </div>
  );
}

function StatsCard({ title, value, change, icon, color }: {
  title: string;
  value: number;
  change: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <Badge
                variant={change > 0 ? "default" : "secondary"}
                className={`text-xs ${change > 0 ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                {change > 0 ? '+' : ''}{change}
              </Badge>
            </div>
          </div>
          <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MapView() {
  const allBanners = useBanners();
  // Only show active banners on the map
  const banners = allBanners.filter(b => b.is_active);
  const [selectedBanner, setSelectedBanner] = useState<BannerWithParty | null>(null);

  return (
    <div className="space-y-4">
      {/* Kakao Map */}
      <div className="h-[500px] bg-gray-100 rounded-lg overflow-hidden">
        <KakaoMap
          banners={banners}
          onMarkerClick={(banner) => setSelectedBanner(banner)}
        />
      </div>

      {/* Selected banner details */}
      {selectedBanner && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <img
                src={selectedBanner.image_url || PLACEHOLDER_IMAGES.bannerSmall}
                alt={selectedBanner.text}
                className="w-20 h-16 rounded-lg object-cover bg-gray-100"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">{selectedBanner.text}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <MapPin className="w-4 h-4" />
                  {selectedBanner.address}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    style={{ backgroundColor: selectedBanner.party.color, color: 'white' }}
                    className="text-xs"
                  >
                    {selectedBanner.party.name}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {selectedBanner.start_date} ~ {selectedBanner.end_date}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBanner(null)}
              >
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">범례</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from(new Set(banners.map(b => b.party.name))).map(partyName => {
              const party = banners.find(b => b.party.name === partyName)?.party;
              if (!party) return null;

              return (
                <div key={partyName} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: party.color }}
                  />
                  <span className="text-sm">{partyName}</span>
                  <span className="text-xs text-gray-500">
                    ({banners.filter(b => b.party.name === partyName).length})
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ListView({ banners }: { banners: BannerWithParty[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParty, setSelectedParty] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filteredBanners, setFilteredBanners] = useState<BannerWithParty[]>(banners);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<BannerWithParty | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBannerIds, setSelectedBannerIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Store hooks
  const { setBanners } = useBannerActions();

  // Auth hooks
  const { isAuthenticated, hasPermission } = useAuth();

  // Get unique parties from banners
  const uniqueParties = Array.from(new Set(banners.map(b => b.party.name))).sort();

  // Get unique districts from banners
  const uniqueDistricts = Array.from(new Set(banners.map(b => b.administrative_district).filter(Boolean))).sort();

  // Update filtered banners when original banners change
  // Default: show only active banners
  useEffect(() => {
    const activeBanners = banners.filter(banner => banner.is_active);
    setFilteredBanners(activeBanners);
  }, [banners]);

  // Handle search/filter logic
  const handleSearch = () => {
    setIsSearching(true);

    let result = [...banners];

    // Filter by search query (address or text)
    if (searchQuery.trim()) {
      result = result.filter(banner =>
        banner.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banner.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by party
    if (selectedParty) {
      result = result.filter(banner => banner.party.name === selectedParty);
    }

    // Filter by district
    if (selectedDistrict) {
      result = result.filter(banner => banner.administrative_district === selectedDistrict);
    }

    // Always filter out inactive banners by default unless specifically requested
    if (selectedStatus !== 'inactive') {
      result = result.filter(banner => banner.is_active);
    }

    // Filter by status
    if (selectedStatus) {
      const now = new Date();
      if (selectedStatus === 'active') {
        result = result.filter(banner =>
          banner.is_active && new Date(banner.end_date) >= now
        );
      } else if (selectedStatus === 'expired') {
        result = result.filter(banner =>
          new Date(banner.end_date) < now
        );
      } else if (selectedStatus === 'inactive') {
        result = result.filter(banner => !banner.is_active);
      }
    }

    setFilteredBanners(result);
    setIsSearching(false);
  };

  // Reset filters
  const handleReset = () => {
    setSearchQuery('');
    setSelectedParty('');
    setSelectedDistrict('');
    setSelectedStatus('');
    setFilteredBanners(banners);
  };

  // Handle checkbox toggle
  const handleToggleSelect = (bannerId: string) => {
    setSelectedBannerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bannerId)) {
        newSet.delete(bannerId);
      } else {
        newSet.add(bannerId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedBannerIds.size === filteredBanners.length) {
      setSelectedBannerIds(new Set());
    } else {
      setSelectedBannerIds(new Set(filteredBanners.map(b => b.id)));
    }
  };

  // Bulk activate
  const handleBulkActivate = async () => {
    if (selectedBannerIds.size === 0) return;

    if (!confirm(`선택한 ${selectedBannerIds.size}개의 현수막을 활성화하시겠습니까?`)) return;

    setIsBulkProcessing(true);
    try {
      const promises = Array.from(selectedBannerIds).map(id =>
        fetch(`/api/banners/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: true }),
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      alert(`${successCount}개의 현수막이 활성화되었습니다.`);

      // Refresh data
      const response = await fetch('/api/banners?limit=1000');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setBanners(result.data);
        }
      }

      setSelectedBannerIds(new Set());
    } catch (error) {
      console.error('Bulk activate error:', error);
      alert('일괄 활성화 중 오류가 발생했습니다.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk deactivate
  const handleBulkDeactivate = async () => {
    if (selectedBannerIds.size === 0) return;

    if (!confirm(`선택한 ${selectedBannerIds.size}개의 현수막을 비활성화하시겠습니까?`)) return;

    setIsBulkProcessing(true);
    try {
      const promises = Array.from(selectedBannerIds).map(id =>
        fetch(`/api/banners/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: false }),
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      alert(`${successCount}개의 현수막이 비활성화되었습니다.`);

      // Refresh data
      const response = await fetch('/api/banners?limit=1000');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setBanners(result.data);
        }
      }

      setSelectedBannerIds(new Set());
    } catch (error) {
      console.error('Bulk deactivate error:', error);
      alert('일괄 비활성화 중 오류가 발생했습니다.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedBannerIds.size === 0) return;

    if (!confirm(`선택한 ${selectedBannerIds.size}개의 현수막을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    setIsBulkProcessing(true);
    try {
      const promises = Array.from(selectedBannerIds).map(id =>
        fetch(`/api/banners/${id}?hardDelete=true`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      alert(`${successCount}개의 현수막이 삭제되었습니다.`);

      // Refresh data
      const response = await fetch('/api/banners?limit=1000');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setBanners(result.data);
        }
      }

      setSelectedBannerIds(new Set());
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('일괄 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const filters: any = {};

      // Apply current filters to export
      if (searchQuery.trim()) {
        filters.search = searchQuery;
      }
      if (selectedParty) {
        filters.party = selectedParty;
      }
      if (selectedDistrict) {
        filters.district = selectedDistrict;
      }
      if (selectedStatus) {
        filters.status = selectedStatus;
      }

      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error('엑셀 다운로드에 실패했습니다.');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `banners_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('엑셀 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">필터 및 검색</h3>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportExcel}
            disabled={isExporting || filteredBanners.length === 0}
          >
            <Download className="w-4 h-4" />
            {isExporting ? '다운로드 중...' : '엑셀 다운로드'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="주소 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Select value={selectedParty} onValueChange={setSelectedParty}>
            <SelectTrigger>
              <SelectValue placeholder="정당 선택" />
            </SelectTrigger>
            <SelectContent>
              {uniqueParties.map(partyName => (
                <SelectItem key={partyName} value={partyName}>
                  {partyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger>
              <SelectValue placeholder="행정동 선택" />
            </SelectTrigger>
            <SelectContent>
              {uniqueDistricts.map(district => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="expired">만료</SelectItem>
              <SelectItem value="inactive">비활성</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Search className="w-4 h-4 mr-2" />
            검색
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={!searchQuery && !selectedParty && !selectedDistrict && !selectedStatus}
          >
            초기화
          </Button>
        </div>
      </div>

      {/* Bulk Actions - Only show when authenticated and has permission */}
      {isAuthenticated && hasPermission('banners', 'update') && selectedBannerIds.size > 0 && (
        <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-indigo-900">
                {selectedBannerIds.size}개 선택됨
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBannerIds(new Set())}
              >
                선택 해제
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkActivate}
                disabled={isBulkProcessing}
              >
                일괄 활성화
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDeactivate}
                disabled={isBulkProcessing}
              >
                일괄 비활성화
              </Button>
              {hasPermission('banners', 'delete') && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkProcessing}
                >
                  일괄 삭제
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">현수막 목록 ({filteredBanners.length}개)</h3>
          {isAuthenticated && hasPermission('banners', 'update') && filteredBanners.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedBannerIds.size === filteredBanners.length ? '전체 해제' : '전체 선택'}
            </Button>
          )}
        </div>
        {filteredBanners.length > 0 ? (
          filteredBanners.map((banner) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              isSelected={selectedBannerIds.has(banner.id)}
              onToggleSelect={isAuthenticated && hasPermission('banners', 'update') ? () => handleToggleSelect(banner.id) : undefined}
              onClick={() => {
                setSelectedBanner(banner);
                setIsDetailDialogOpen(true);
              }}
            />
          ))
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">검색 결과가 없습니다.</p>
            <Button
              onClick={handleReset}
              variant="outline"
              className="mt-4"
            >
              필터 초기화
            </Button>
          </div>
        )}
      </div>

      {/* Banner Detail Dialog */}
      <BannerDetailDialog
        banner={selectedBanner}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />
    </div>
  );
}

function BannerCard({
  banner,
  onClick,
  isSelected,
  onToggleSelect
}: {
  banner: BannerWithParty;
  onClick?: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const isExpired = new Date(banner.end_date) < new Date();
  const { updateBanner } = useBannerActions();
  const { hasPermission } = useAuth();
  const deleteBanner = useDeleteBanner();

  return (
    <div
      className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
    >
      {/* Checkbox */}
      {onToggleSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Banner Image and Content - clickable area */}
      <div
        className="flex items-center gap-4 flex-1 cursor-pointer min-w-0"
        onClick={onClick}
      >
        <img
          src={banner.image_url || PLACEHOLDER_IMAGES.banner}
          alt={banner.text}
          className="w-20 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 mb-1 truncate">{banner.text}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 min-w-0">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{banner.address}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              style={{ backgroundColor: banner.party.color, color: 'white' }}
              className="text-xs whitespace-nowrap"
            >
              {banner.party.name}
            </Badge>
            {isExpired && (
              <Badge variant="destructive" className="text-xs whitespace-nowrap">
                만료됨
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">
          {banner.start_date} ~ {banner.end_date}
        </p>
        {hasPermission('banners', 'update') && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                const newStatus = !banner.is_active;
                const confirmMessage = newStatus
                  ? '현수막을 활성화하시겠습니까?'
                  : '현수막을 비활성화하시겠습니까?\n비활성화된 현수막은 지도와 목록에 표시되지 않습니다.';

                if (!confirm(confirmMessage)) return;

                try {
                  const response = await fetch(`/api/banners/${banner.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_active: newStatus }),
                  });

                  if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                      updateBanner(banner.id, result.data);
                      alert(newStatus ? '현수막이 활성화되었습니다.' : '현수막이 비활성화되었습니다.');
                    }
                  } else {
                    const error = await response.json();
                    alert(error.error || '상태 변경에 실패했습니다.');
                  }
                } catch (error) {
                  console.error('Toggle active status error:', error);
                  alert('상태 변경 중 오류가 발생했습니다.');
                }
              }}
            >
              {banner.is_active ? '비활성화' : '활성화'}
            </Button>
            {hasPermission('banners', 'delete') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('정말 삭제하시겠습니까?')) {
                    deleteBanner.mutate({ id: banner.id, hardDelete: true });
                  }
                }}
                disabled={deleteBanner.isPending}
              >
                {deleteBanner.isPending ? '삭제 중...' : '삭제'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsView() {
  const allBanners = useBanners();
  const summary = useBannerSummary();

  // Filter only active banners for statistics
  const banners = allBanners.filter(banner => banner.is_active);

  // Calculate statistics (only active banners)
  const partyStats = banners.reduce((acc, banner) => {
    const partyName = banner.party.name;
    if (!acc[partyName]) {
      acc[partyName] = { count: 0, active: 0, expired: 0, color: banner.party.color };
    }
    acc[partyName].count++;
    if (banner.is_active) acc[partyName].active++;
    if (new Date(banner.end_date) < new Date()) acc[partyName].expired++;
    return acc;
  }, {} as Record<string, { count: number; active: number; expired: number; color: string }>);

  const districtStats = banners.reduce((acc, banner) => {
    const district = banner.administrative_district || '미분류';
    acc[district] = (acc[district] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
            <div className="text-sm text-gray-600">전체 현수막</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.active}</div>
            <div className="text-sm text-gray-600">활성 현수막</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{summary.expired}</div>
            <div className="text-sm text-gray-600">만료된 현수막</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.upcoming}</div>
            <div className="text-sm text-gray-600">예정된 현수막</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Party Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>정당별 현수막 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(partyStats).map(([party, stats]) => (
                <div key={party} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: stats.color }}
                      />
                      <span className="font-medium">{party}</span>
                    </div>
                    <span className="text-sm text-gray-600">{stats.count}개</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="text-green-600">
                      활성: {stats.active}
                    </Badge>
                    <Badge variant="outline" className="text-red-600">
                      만료: {stats.expired}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* District Statistics - Banner count by party per district */}
        <Card>
          <CardHeader>
            <CardTitle>행정동별 정당 현수막 현황</CardTitle>
            <CardDescription>각 행정동별 정당의 현수막 개수 (2개 초과 여부 확인)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Calculate banner count by district and party
                const districtPartyStats = banners.reduce((acc, banner) => {
                  const district = banner.administrative_district || '미분류';
                  const partyName = banner.party.name;

                  if (!acc[district]) {
                    acc[district] = {};
                  }
                  if (!acc[district][partyName]) {
                    acc[district][partyName] = {
                      count: 0,
                      color: banner.party.color
                    };
                  }
                  acc[district][partyName].count++;
                  return acc;
                }, {} as Record<string, Record<string, { count: number; color: string }>>);

                return Object.entries(districtPartyStats)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([district, partyData]) => {
                    const totalBanners = Object.values(partyData).reduce((sum, p) => sum + p.count, 0);
                    const hasViolation = Object.values(partyData).some(p => p.count > 2);

                    return (
                      <div key={district} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{district}</span>
                            <span className="text-sm text-gray-500">총 {totalBanners}개</span>
                          </div>
                          {hasViolation && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              2개 초과
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(partyData)
                            .sort(([, a], [, b]) => b.count - a.count)
                            .map(([party, stats]) => (
                              <div
                                key={party}
                                className={`flex items-center justify-between p-2 rounded-md ${
                                  stats.count > 2 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: stats.color }}
                                  />
                                  <span className="text-sm font-medium truncate">{party}</span>
                                </div>
                                <span
                                  className={`text-sm font-bold ${
                                    stats.count > 2 ? 'text-red-600' : 'text-gray-700'
                                  }`}
                                >
                                  {stats.count}개
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>최근 등록 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {banners
              .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
              .slice(0, 5)
              .map((banner) => (
                <div key={banner.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: banner.party.color }}
                    />
                    <div>
                      <div className="font-medium">{banner.text}</div>
                      <div className="text-sm text-gray-500">{banner.address}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {banner.created_at ? new Date(banner.created_at).toLocaleDateString() : ''}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpiredView({ banners }: { banners: BannerWithParty[] }) {
  const [selectedBanner, setSelectedBanner] = useState<BannerWithParty | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-semibold text-red-600">만료된 현수막</h3>
      </div>
      <p className="text-gray-600 mb-6">만료된 현수막 목록이 여기에 표시됩니다.</p>

      {banners.length > 0 ? (
        <div className="space-y-4">
          {banners.map((banner) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              onClick={() => {
                setSelectedBanner(banner);
                setIsDetailDialogOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">만료된 현수막이 없습니다.</p>
        </div>
      )}

      {/* Banner Detail Dialog */}
      <BannerDetailDialog
        banner={selectedBanner}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />
    </div>
  );
}