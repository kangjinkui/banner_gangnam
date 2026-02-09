'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, AlertTriangle, Filter, User as UserIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useBanners, useBannerActions } from '@/store/banner.store';
import { BannerWithParty } from '@/types/banner';
import { KakaoMap } from '@/features/map/components/KakaoMap';
import { BannerDetailDialog } from '@/features/banners/components/BannerDetailDialog';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { PLACEHOLDER_IMAGES } from '@/lib/utils/placeholder';

export default function PublicRallyDashboard() {
  const [activeTab, setActiveTab] = useState('목록');
  const [bannerTypeFilter, setBannerTypeFilter] = useState<'all' | 'public' | 'rally'>('all');

  // Store hooks
  const allBanners = useBanners();
  const { setBanners } = useBannerActions();

  // Auth hooks
  const { user, isAuthenticated, signOut, hasPermission } = useAuth();

  // Filter banners by type
  const banners = allBanners.filter(banner => {
    // Only show public and rally banners
    if (banner.banner_type === 'political') return false;

    // Apply type filter
    if (bannerTypeFilter === 'all') return true;
    return banner.banner_type === bannerTypeFilter;
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/banners?limit=1000');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setBanners(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      }
    };

    fetchData();

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

  // Calculate stats
  const activeBanners = banners.filter(b => b.is_active);
  const expiredBanners = banners.filter(b => {
    if (b.banner_type === 'rally') return false; // Rally banners don't expire
    return b.is_active && b.end_date && new Date(b.end_date) < new Date();
  });
  const publicCount = banners.filter(b => b.banner_type === 'public' && b.is_active).length;
  const rallyCount = banners.filter(b => b.banner_type === 'rally' && b.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-sm sm:text-xl font-semibold text-gray-900 whitespace-nowrap">공공/집회 현수막</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-8 sm:h-9">
                정치
              </Button>
            </Link>
            {isAuthenticated && user ? (
              <>
                <Link href="/profile" className="flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3">
                    <UserIcon className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2 text-sm">{user.email}</span>
                  </Button>
                </Link>

                {hasPermission('banners', 'create') && (
                  <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3">
                    <Link href="/public-rally/register">
                      <MapPin className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">등록</span>
                    </Link>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3"
                  onClick={() => signOut()}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-[1400px] mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 mb-4 sm:mb-8">
          <StatsCard
            title="전체 현수막"
            value={activeBanners.length}
            icon={<MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />}
            color="bg-green-100"
          />
          <StatsCard
            title="공공 현수막"
            value={publicCount}
            icon={<Filter className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />}
            color="bg-blue-100"
          />
          <StatsCard
            title="집회 현수막"
            value={rallyCount}
            icon={<Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />}
            color="bg-purple-100"
          />
          <StatsCard
            title="만료 예정"
            value={expiredBanners.length}
            icon={<AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />}
            color="bg-red-100"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={bannerTypeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBannerTypeFilter('all')}
            className={bannerTypeFilter === 'all' ? 'bg-gray-900' : ''}
          >
            모두
          </Button>
          <Button
            variant={bannerTypeFilter === 'public' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBannerTypeFilter('public')}
            className={bannerTypeFilter === 'public' ? 'bg-green-600' : ''}
          >
            🟢 공공
          </Button>
          <Button
            variant={bannerTypeFilter === 'rally' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBannerTypeFilter('rally')}
            className={bannerTypeFilter === 'rally' ? 'bg-blue-600' : ''}
          >
            🔵 집회
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto">
          {['지도', '목록', '통계', '만료'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-base flex-shrink-0 ${
                activeTab === tab
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === '지도' && <MapPin className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />}
              {tab === '목록' && <Filter className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />}
              {tab === '통계' && <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />}
              {tab === '만료' && <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            {activeTab === '지도' && <MapView banners={activeBanners} />}
            {activeTab === '목록' && <ListView banners={activeBanners} />}
            {activeTab === '통계' && <StatsView banners={activeBanners} />}
            {activeTab === '만료' && <ExpiredView banners={expiredBanners} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, color }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-sm font-medium text-gray-600 truncate">{title}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`w-8 h-8 sm:w-12 sm:h-12 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MapView({ banners }: { banners: BannerWithParty[] }) {
  const [selectedBanner, setSelectedBanner] = useState<BannerWithParty | null>(null);

  return (
    <div className="space-y-4">
      <div className="h-[500px] bg-gray-100 rounded-lg overflow-hidden">
        <KakaoMap
          banners={banners}
          onMarkerClick={(banner) => setSelectedBanner(banner)}
        />
      </div>

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
                  <Badge className={selectedBanner.banner_type === 'public' ? 'bg-green-600' : 'bg-blue-600'}>
                    {selectedBanner.banner_type === 'public' ? '공공' : '집회'}
                  </Badge>
                  {selectedBanner.department && (
                    <Badge variant="secondary">{selectedBanner.department}</Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBanner(null)}
              >
                닫기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ListView({ banners }: { banners: BannerWithParty[] }) {
  const [selectedBanner, setSelectedBanner] = useState<BannerWithParty | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">목록 ({banners.length})</h3>
      {banners.length > 0 ? (
        <div className="space-y-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedBanner(banner);
                setIsDetailDialogOpen(true);
              }}
            >
              <img
                src={banner.image_url || PLACEHOLDER_IMAGES.banner}
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
                  <Badge className={banner.banner_type === 'public' ? 'bg-green-600' : 'bg-blue-600'}>
                    {banner.banner_type === 'public' ? '공공' : '집회'}
                  </Badge>
                  {banner.department && (
                    <Badge variant="secondary">{banner.department}</Badge>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {banner.start_date || '-'} ~ {banner.end_date || '-'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">현수막이 없습니다.</p>
        </div>
      )}

      <BannerDetailDialog
        banner={selectedBanner}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />
    </div>
  );
}

function StatsView({ banners }: { banners: BannerWithParty[] }) {
  const publicBanners = banners.filter(b => b.banner_type === 'public');
  const rallyBanners = banners.filter(b => b.banner_type === 'rally');

  // Department stats (public only)
  const departmentStats = publicBanners.reduce((acc, banner) => {
    const dept = banner.department || '미분류';
    if (!acc[dept]) {
      acc[dept] = { total: 0, active: 0, expired: 0 };
    }
    acc[dept].total++;
    if (banner.is_active) acc[dept].active++;
    if (banner.end_date && new Date(banner.end_date) < new Date()) acc[dept].expired++;
    return acc;
  }, {} as Record<string, { total: number; active: number; expired: number }>);

  // District stats
  const districtStats = banners.reduce((acc, banner) => {
    const district = banner.administrative_district || '미분류';
    if (!acc[district]) {
      acc[district] = { public: 0, rally: 0 };
    }
    if (banner.banner_type === 'public') acc[district].public++;
    if (banner.banner_type === 'rally') acc[district].rally++;
    return acc;
  }, {} as Record<string, { public: number; rally: number }>);

  return (
    <div className="space-y-6">
      {/* Type Stats */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">타입별 통계</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{publicBanners.length}</div>
              <div className="text-sm text-green-700">공공 현수막</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{rallyBanners.length}</div>
              <div className="text-sm text-blue-700">집회 현수막</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Stats (Public only) */}
      {Object.keys(departmentStats).length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">부서별 통계 (공공)</h3>
            <div className="space-y-3">
              {Object.entries(departmentStats).map(([dept, stats]) => (
                <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{dept}</span>
                  <div className="flex gap-4 text-sm">
                    <span>총 {stats.total}개</span>
                    <span className="text-green-600">활성 {stats.active}</span>
                    <span className="text-red-600">만료 {stats.expired}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* District Stats */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">행정동별 분포</h3>
          <div className="space-y-2">
            {Object.entries(districtStats).map(([district, stats]) => (
              <div key={district} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{district}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">공공: {stats.public}</span>
                  <span className="text-blue-600">집회: {stats.rally}</span>
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
        <h3 className="text-lg font-semibold text-red-600">만료된 공공 현수막</h3>
      </div>
      <p className="text-gray-600 mb-6">
        ℹ️ 집회 현수막은 만료 개념이 없습니다. 공공 현수막만 표시됩니다.
      </p>

      {banners.length > 0 ? (
        <div className="space-y-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex items-center gap-4 p-4 bg-white border border-red-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedBanner(banner);
                setIsDetailDialogOpen(true);
              }}
            >
              <img
                src={banner.image_url || PLACEHOLDER_IMAGES.banner}
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
                  <Badge className="bg-green-600">공공</Badge>
                  {banner.department && (
                    <Badge variant="secondary">{banner.department}</Badge>
                  )}
                  <Badge variant="destructive">만료됨</Badge>
                </div>
              </div>
              <div className="text-sm text-red-600">
                {banner.end_date && new Date(banner.end_date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">만료된 현수막이 없습니다.</p>
        </div>
      )}

      <BannerDetailDialog
        banner={selectedBanner}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />
    </div>
  );
}
