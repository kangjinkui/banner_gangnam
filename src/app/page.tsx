'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Calendar, AlertTriangle, Download, Search, Filter } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useBanners, useBannerActions, useBannerSummary, useExpiredBanners } from '@/store/banner.store';
import { BannerWithParty } from '@/types/banner';
import { KakaoMap } from '@/features/map/components/KakaoMap';
import { PartyManagement } from '@/features/parties/components/PartyManagement';

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
    image_url: 'https://via.placeholder.com/150x100?text=Banner',
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
    image_url: 'https://via.placeholder.com/150x100?text=Banner',
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
    image_url: 'https://via.placeholder.com/150x100?text=Banner',
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

  // Store hooks
  const banners = useBanners();
  const summary = useBannerSummary();
  const expiredBanners = useExpiredBanners();
  const { setBanners } = useBannerActions();

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/banners');
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
  }, [setBanners]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">현수막 관리 시스템</h1>
              <p className="text-sm text-gray-500">정당별 현수막 설치 현황 관리</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsPartyManagementOpen(true)}
            >
              <Users className="w-4 h-4" />
              정당 관리
            </Button>
            <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Link href="/register">
                <MapPin className="w-4 h-4" />
                현수막 등록
              </Link>
            </Button>
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
            value={8}
            change={1}
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
  const banners = useBanners();
  const [selectedBanner, setSelectedBanner] = useState<BannerWithParty | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    // Kakao Map API 로드 확인
    const checkKakaoMap = setInterval(() => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          setIsMapLoaded(true);
        });
        clearInterval(checkKakaoMap);
      }
    }, 100);

    return () => clearInterval(checkKakaoMap);
  }, []);

  return (
    <div className="space-y-4">
      {/* Kakao Map */}
      <div className="h-96 bg-gray-100 rounded-lg overflow-hidden">
        {isMapLoaded ? (
          <KakaoMap
            banners={banners}
            onMarkerClick={(banner) => setSelectedBanner(banner)}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600 font-medium">카카오 지도 로딩 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected banner details */}
      {selectedBanner && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <img
                src={selectedBanner.image_url || 'https://via.placeholder.com/100x80'}
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
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filteredBanners, setFilteredBanners] = useState<BannerWithParty[]>(banners);
  const [isSearching, setIsSearching] = useState(false);

  // Update filtered banners when original banners change
  useEffect(() => {
    setFilteredBanners(banners);
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
      }
    }

    setFilteredBanners(result);
    setIsSearching(false);
  };

  // Reset filters
  const handleReset = () => {
    setSearchQuery('');
    setSelectedParty('');
    setSelectedStatus('');
    setFilteredBanners(banners);
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">필터 및 검색</h3>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            엑셀 다운로드
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <SelectItem value="더불어민주당">더불어민주당</SelectItem>
              <SelectItem value="국민의힘">국민의힘</SelectItem>
              <SelectItem value="정의당">정의당</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="expired">만료</SelectItem>
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
            disabled={!searchQuery && !selectedParty && !selectedStatus}
          >
            초기화
          </Button>
        </div>
      </div>

      {/* Banner List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">현수막 목록 ({filteredBanners.length}개)</h3>
        {filteredBanners.length > 0 ? (
          filteredBanners.map((banner) => (
            <BannerCard key={banner.id} banner={banner} />
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
    </div>
  );
}

function BannerCard({ banner }: { banner: BannerWithParty }) {
  const isExpired = new Date(banner.end_date) < new Date();
  const { updateBanner, removeBanner } = useBannerActions();

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      <img
        src={banner.image_url || 'https://via.placeholder.com/150x100?text=No+Image'}
        alt={banner.text}
        className="w-20 h-16 rounded-lg object-cover bg-gray-100"
      />
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 mb-1">{banner.text}</h4>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <MapPin className="w-4 h-4" />
          {banner.address}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            style={{ backgroundColor: banner.party.color, color: 'white' }}
            className="text-xs"
          >
            {banner.party.name}
          </Badge>
          {isExpired && (
            <Badge variant="destructive" className="text-xs">
              만료됨
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-600 mb-1">
          {banner.start_date} ~ {banner.end_date}
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Simple edit - toggle active status for demo
              updateBanner(banner.id, {
                is_active: !banner.is_active,
                updated_at: new Date().toISOString()
              });
            }}
          >
            {banner.is_active ? '비활성화' : '활성화'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              if (confirm('정말 삭제하시겠습니까?')) {
                removeBanner(banner.id);
              }
            }}
          >
            삭제
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatsView() {
  const banners = useBanners();
  const summary = useBannerSummary();

  // Calculate statistics
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

        {/* District Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>지역별 현수막 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(districtStats)
                .sort(([, a], [, b]) => b - a)
                .map(([district, count]) => (
                  <div key={district} className="flex items-center justify-between">
                    <span className="font-medium">{district}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / summary.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 min-w-[2rem]">{count}개</span>
                    </div>
                  </div>
                ))}
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
            <BannerCard key={banner.id} banner={banner} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">만료된 현수막이 없습니다.</p>
        </div>
      )}
    </div>
  );
}