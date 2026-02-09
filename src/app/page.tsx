'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Users, Calendar, AlertTriangle, Download, Search, Filter, Shield } from 'lucide-react';
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

// Mock data - fallback when API is unavailable
const mockBannersData: BannerWithParty[] = [
  {
    id: '1',
    banner_type: 'political',
    party_id: '1',
    text: 'Clean streets, brighter future',
    address: 'Seoul Gangnam-gu Teheran-ro 123-45',
    lat: 37.5665,
    lng: 126.978,
    administrative_district: 'Gangnam-gu',
    start_date: '2024-01-15',
    end_date: '2024-03-15',
    image_url: PLACEHOLDER_IMAGES.banner,
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    party: {
      id: '1',
      name: 'Blue Party',
      color: '#1D4ED8',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  },
  {
    id: '2',
    banner_type: 'political',
    party_id: '2',
    text: 'Neighborhood-first renewal',
    address: 'Seoul Seocho-gu Seocho-daero 678-90',
    lat: 37.4835,
    lng: 127.0321,
    administrative_district: 'Seocho-gu',
    start_date: '2024-02-01',
    end_date: '2024-02-28',
    image_url: PLACEHOLDER_IMAGES.banner,
    is_active: true,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    party: {
      id: '2',
      name: 'Red Party',
      color: '#DC2626',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  },
  {
    id: '3',
    banner_type: 'political',
    party_id: '3',
    text: 'Youth-forward policy',
    address: 'Seoul Gangnam-gu Yeoksam-ro 456-78',
    lat: 37.5133,
    lng: 127.0384,
    administrative_district: 'Gangnam-gu',
    start_date: '2024-01-20',
    end_date: '2024-04-20',
    image_url: PLACEHOLDER_IMAGES.banner,
    is_active: true,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
    party: {
      id: '3',
      name: 'Justice Party',
      color: '#F59E0B',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Map');
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
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-sm sm:text-xl font-semibold text-gray-900 whitespace-nowrap">Banner Management</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isAuthenticated && user ? (
              <>
                {/* User Info - icon only on mobile */}
                <Link href="/profile" className="flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3">
                    <UserIcon className="w-4 h-4 sm:w-4 sm:h-4 text-gray-600" />
                    <span className="hidden sm:inline ml-2 text-sm">{user.email}</span>
                  </Button>
                </Link>

                {/* Admin buttons - icon only */}
                {hasPermission('parties', 'update') && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3"
                      onClick={() => setIsPartyManagementOpen(true)}
                    >
                      <Users className="w-4 h-4 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline ml-1">Parties</span>
                    </Button>

                    <Button asChild variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3">
                      <Link href="/admin/users">
                        <Shield className="w-4 h-4 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline ml-1">Users</span>
                      </Link>
                    </Button>
                  </>
                )}

                {hasPermission('banners', 'create') && (
                  <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3">
                    <Link href="/register">
                      <MapPin className="w-4 h-4 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline ml-1">Register</span>
                    </Link>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3"
                  onClick={() => signOut()}
                >
                  <LogOut className="w-4 h-4 sm:w-4 sm:h-4" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 h-8 sm:h-9 px-3 sm:px-4 text-sm"
                onClick={() => setIsLoginDialogOpen(true)}
              >
                <UserIcon className="w-4 h-4 sm:w-4 sm:h-4" />
                <span className="ml-1.5">Login</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-[1400px] mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 mb-4 sm:mb-8">
          <StatsCard
            title="Total Banners"
            value={summary.total}
            change={12}
            icon={<MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />}
            color="bg-indigo-100"
          />
          <StatsCard
            title="Active Parties"
            value={activePartyCount}
            change={0}
            icon={<Users className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />}
            color="bg-red-100"
          />
          <StatsCard
            title="Active Banners"
            value={summary.active}
            change={8}
            icon={<Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-teal-600" />}
            color="bg-teal-100"
          />
          <StatsCard
            title="Expired"
            value={summary.expired}
            change={3}
            icon={<AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />}
            color="bg-red-100"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto">
          {['Map', 'List', 'Stats', 'Expired'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-base flex-shrink-0 ${
                activeTab === tab
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'Map' && <MapPin className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />}
              {tab === 'List' && <Filter className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />}
              {tab === 'Stats' && <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />}
              {tab === 'Expired' && <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            {activeTab === 'Map' && <MapView />}
            {activeTab === 'List' && <ListView banners={banners} />}
            {activeTab === 'Stats' && <StatsView />}
            {activeTab === 'Expired' && <ExpiredView banners={expiredBanners} />}
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
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-sm font-medium text-gray-600 truncate">{title}</p>
            <div className="flex items-center gap-1 sm:gap-2">
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
              <Badge
                variant={change > 0 ? "default" : "secondary"}
                className={`text-[9px] sm:text-xs ${change > 0 ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                {change > 0 ? '+' : ''}{change}
              </Badge>
            </div>
          </div>
          <div className={`w-8 h-8 sm:w-12 sm:h-12 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
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
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legend</CardTitle>
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

    if (!confirm(`?좏깮??${selectedBannerIds.size}媛쒖쓽 ?꾩닔留됱쓣 ?쒖꽦?뷀븯?쒓쿋?듬땲源?`)) return;

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

      alert(`${successCount}媛쒖쓽 ?꾩닔留됱씠 ?쒖꽦?붾릺?덉뒿?덈떎.`);

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
      alert('?쇨큵 ?쒖꽦??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk deactivate
  const handleBulkDeactivate = async () => {
    if (selectedBannerIds.size === 0) return;

    if (!confirm(`?좏깮??${selectedBannerIds.size}媛쒖쓽 ?꾩닔留됱쓣 鍮꾪솢?깊솕?섏떆寃좎뒿?덇퉴?`)) return;

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

      alert(`${successCount}媛쒖쓽 ?꾩닔留됱씠 鍮꾪솢?깊솕?섏뿀?듬땲??`);

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
      alert('?쇨큵 鍮꾪솢?깊솕 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedBannerIds.size === 0) return;

    if (!confirm(`?좏깮??${selectedBannerIds.size}媛쒖쓽 ?꾩닔留됱쓣 ?곴뎄 ??젣?섏떆寃좎뒿?덇퉴?\n???묒뾽? ?섎룎由????놁뒿?덈떎.`)) return;

    setIsBulkProcessing(true);
    try {
      const promises = Array.from(selectedBannerIds).map(id =>
        fetch(`/api/banners/${id}?hardDelete=true`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      alert(`${successCount}媛쒖쓽 ?꾩닔留됱씠 ??젣?섏뿀?듬땲??`);

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
      alert('?쇨큵 ??젣 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
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
        throw new Error('?묒? ?ㅼ슫濡쒕뱶???ㅽ뙣?덉뒿?덈떎.');
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
      alert('?묒? ?ㅼ슫濡쒕뱶 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-sm sm:text-lg font-semibold">Filters & Search</h3>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 sm:gap-2 text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-4"
            onClick={handleExportExcel}
            disabled={isExporting || filteredBanners.length === 0}
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{isExporting ? 'Downloading...' : 'Export Excel'}</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 sm:gap-4">
          <div className="relative sm:col-span-2 md:col-span-1">
            <Search className="w-3 h-3 sm:w-4 sm:h-4 absolute left-2 sm:left-3 top-2 sm:top-3 text-gray-400" />
            <Input
              placeholder="Search address or text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-7 sm:pl-10 text-xs sm:text-sm h-8 sm:h-10"
            />
          </div>
          <Select value={selectedParty} onValueChange={setSelectedParty}>
            <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue placeholder="Party" />
            </SelectTrigger>
            <SelectContent>
              {uniqueParties.map(partyName => (
                <SelectItem key={partyName} value={partyName} className="text-xs sm:text-sm">
                  {partyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent>
              {uniqueDistricts.map(district => (
                <SelectItem key={district} value={district} className="text-xs sm:text-sm">
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active" className="text-xs sm:text-sm">Active</SelectItem>
              <SelectItem value="expired" className="text-xs sm:text-sm">Expired</SelectItem>
              <SelectItem value="inactive" className="text-xs sm:text-sm">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm h-8 sm:h-10"
          >
            <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Search
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm h-8 sm:h-10"
            disabled={!searchQuery && !selectedParty && !selectedDistrict && !selectedStatus}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Bulk Actions - Only show when authenticated and has permission */}
      {isAuthenticated && hasPermission('banners', 'update') && selectedBannerIds.size > 0 && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-indigo-900">
                {selectedBannerIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm h-6 sm:h-8 px-2 sm:px-3"
                onClick={() => setSelectedBannerIds(new Set())}
              >
                Clear
              </Button>
            </div>
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm h-6 sm:h-8 px-2 sm:px-3"
                onClick={handleBulkActivate}
                disabled={isBulkProcessing}
              >
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm h-6 sm:h-8 px-2 sm:px-3"
                onClick={handleBulkDeactivate}
                disabled={isBulkProcessing}
              >
                Deactivate
              </Button>
              {hasPermission('banners', 'delete') && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs sm:text-sm h-6 sm:h-8 px-2 sm:px-3"
                  onClick={handleBulkDelete}
                  disabled={isBulkProcessing}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner List */}
      <div className="space-y-2 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-lg font-semibold">List ({filteredBanners.length})</h3>
          {isAuthenticated && hasPermission('banners', 'update') && filteredBanners.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-6 sm:h-8 px-2 sm:px-3"
              onClick={handleSelectAll}
            >
              {selectedBannerIds.size === filteredBanners.length ? 'Clear All' : 'Select All'}
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
            <p className="text-gray-500">No results found.</p>
            <Button
              onClick={handleReset}
              variant="outline"
              className="mt-4"
            >
              Reset Filters
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
  const isExpired = banner.banner_type !== 'rally' && !!banner.end_date && new Date(banner.end_date) < new Date();
  const { updateBanner } = useBannerActions();
  const { hasPermission } = useAuth();
  const deleteBanner = useDeleteBanner();
  const bannerTypeLabel = banner.banner_type === 'political'
    ? 'Political'
    : banner.banner_type === 'public'
      ? 'Public'
      : 'Rally';

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2 sm:p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {/* Checkbox */}
        {onToggleSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          />
        )}

        {/* Banner Image and Content - clickable area */}
        <div
          className="flex items-center gap-2 sm:gap-4 flex-1 cursor-pointer min-w-0"
          onClick={onClick}
        >
          <img
            src={banner.image_url || PLACEHOLDER_IMAGES.banner}
            alt={banner.text}
            className="w-16 h-12 sm:w-20 sm:h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-xs sm:text-base mb-0.5 sm:mb-1 truncate">{banner.text}</h4>
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-gray-500 mb-1 sm:mb-2 min-w-0">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">{banner.address}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {banner.party ? (
                <Badge
                  style={{ backgroundColor: banner.party.color, color: 'white' }}
                  className="text-[9px] sm:text-xs whitespace-nowrap px-1 sm:px-2"
                >
                  {banner.party.name}
                </Badge>
              ) : (
                <Badge className="text-[9px] sm:text-xs whitespace-nowrap px-1 sm:px-2">
                  {bannerTypeLabel}
                </Badge>
              )}
              {banner.banner_type === 'public' && banner.department && (
                <Badge variant="secondary" className="text-[9px] sm:text-xs whitespace-nowrap px-1 sm:px-2">
                  {banner.department}
                </Badge>
              )}
              {isExpired && (
                <Badge variant="destructive" className="text-[9px] sm:text-xs whitespace-nowrap px-1 sm:px-2">
                  Expired
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0 pl-8 sm:pl-0">
        <p className="text-[10px] sm:text-sm text-gray-600 whitespace-nowrap">
          {banner.start_date || '-'} ~ {banner.end_date || '-'}
        </p>
        {hasPermission('banners', 'update') && (
          <div className="flex gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] sm:text-sm h-6 sm:h-8 px-1.5 sm:px-3"
              onClick={async (e) => {
                e.stopPropagation();
                const newStatus = !banner.is_active;
                const confirmMessage = newStatus
                  ? 'Activate this banner?'
                  : 'Deactivate this banner? Deactivated banners are hidden from the main list.';

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
                      alert(newStatus ? 'Banner activated.' : 'Banner deactivated.');
                    }
                  } else {
                    const error = await response.json();
                    alert(error.error || 'Failed to change status.');
                  }
                } catch (error) {
                  console.error('Toggle active status error:', error);
                  alert('Error while changing status.');
                }
              }}
            >
              {banner.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            {hasPermission('banners', 'delete') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 text-[10px] sm:text-sm h-6 sm:h-8 px-1.5 sm:px-3"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this banner permanently?')) {
                    deleteBanner.mutate({ id: banner.id, hardDelete: true });
                  }
                }}
                disabled={deleteBanner.isPending}
              >
                {deleteBanner.isPending ? '...' : 'Delete'}
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
    const district = banner.administrative_district || 'Unknown';
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
            <div className="text-sm text-gray-600">Total Banners</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.active}</div>
            <div className="text-sm text-gray-600">Active Banners</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{summary.expired}</div>
            <div className="text-sm text-gray-600">Expired Banners</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.upcoming}</div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Party Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Banner Count by Party</CardTitle>
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
                    <span className="text-sm text-gray-600">{stats.count}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="text-green-600">
                      Active: {stats.active}
                    </Badge>
                    <Badge variant="outline" className="text-red-600">
                      Expired: {stats.expired}
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
            <CardTitle>Party Counts by District</CardTitle>
            <CardDescription>Shows banners per party by district (highlighted when a party exceeds 2)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Calculate banner count by district and party
                const districtPartyStats = banners.reduce((acc, banner) => {
                  const district = banner.administrative_district || 'Unknown';
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
                            <span className="text-sm text-gray-500">Total {totalBanners}</span>
                          </div>
                          {hasViolation && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Exceeds 2
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
                                  {stats.count}
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
          <CardTitle>Recent Activity</CardTitle>
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
        <h3 className="text-lg font-semibold text-red-600">Expired Banners</h3>
      </div>
      <p className="text-gray-600 mb-6">List of banners that have expired.</p>

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
          <p className="text-gray-500">No expired banners.</p>
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



