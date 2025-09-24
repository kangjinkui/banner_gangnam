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
    image_url: '/api/placeholder/150/100',
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
    image_url: '/api/placeholder/150/100',
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
    image_url: '/api/placeholder/150/100',
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

  // Store hooks
  const banners = useBanners();
  const summary = useBannerSummary();
  const expiredBanners = useExpiredBanners();
  const { setBanners } = useBannerActions();

  // Initialize mock data on component mount
  useEffect(() => {
    setBanners(mockBannersData);
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
            <Button variant="outline" className="gap-2">
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
  return (
    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">지도를 불러오는 중...</p>
        <p className="text-sm text-gray-500 mt-2">카카오 지도 API를 로딩하고 있습니다</p>
      </div>
    </div>
  );
}

function ListView({ banners }: { banners: BannerWithParty[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParty, setSelectedParty] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="주소 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
        </div>
      </div>

      {/* Banner List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">현수막 목록 ({banners.length}개)</h3>
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} />
        ))}
      </div>
    </div>
  );
}

function BannerCard({ banner }: { banner: BannerWithParty }) {
  const isExpired = new Date(banner.end_date) < new Date();

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      <img
        src={banner.image_url || '/api/placeholder/150/100'}
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
          <Button variant="ghost" size="sm">
            수정
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
            삭제
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatsView() {
  return (
    <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">상세 통계</p>
        <p className="text-sm text-gray-500 mt-2">통계 차트가 여기에 표시됩니다</p>
      </div>
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