'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, MapPin, Upload, ArrowLeft, Locate } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useBannerActions } from '@/store/banner.store';
import { BannerWithParty } from '@/types/banner';
import { useToast } from '@/hooks/use-toast';

// Validation schema
const bannerFormSchema = z.object({
  text: z.string().min(1, '현수막 문구를 입력해주세요'),
  address: z.string().min(1, '주소를 입력해주세요'),
  party: z.string().min(1, '정당을 선택해주세요'),
  startDate: z.string().min(1, '시작일을 선택해주세요'),
  endDate: z.string().min(1, '종료일을 선택해주세요'),
  memo: z.string().optional(),
  image: z.any().optional(),
});

type BannerFormData = z.infer<typeof bannerFormSchema>;

interface Party {
  id: string;
  name: string;
  color: string;
}

export default function BannerRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { addBanner } = useBannerActions();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    district?: string;
    coordinates?: { lat: number; lng: number };
    error?: string;
  } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const form = useForm<BannerFormData>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: {
      text: '',
      address: '',
      party: '',
      startDate: '',
      endDate: '',
      memo: '',
    },
  });

  // Fetch parties on component mount
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const response = await fetch('/api/parties');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setParties(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch parties:', error);
        // Fallback to mock data
        setParties([
          { id: 'a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d', name: '민주당', color: '#004EA2' },
          { id: 'b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e', name: '국민의힘', color: '#E61E2B' },
          { id: 'c3d4e5f6-a7b8-6c7d-0e1f-3a4b5c6d7e8f', name: '정의당', color: '#FFCC00' },
          { id: 'd4e5f6a7-b8c9-7d8e-1f2a-4b5c6d7e8f9a', name: '진보당', color: '#00A651' },
        ]);
      }
    };

    fetchParties();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB for mobile)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: '파일 크기 초과',
          description: '이미지 크기는 10MB 이하여야 합니다.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: '잘못된 파일 형식',
          description: '이미지 파일만 업로드할 수 있습니다.',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.onerror = () => {
        toast({
          title: '파일 읽기 실패',
          description: '이미지를 읽는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      };
      reader.readAsDataURL(file);
      form.setValue('image', file);
    }
  };

  // Validate address and extract administrative district
  const validateAddress = async (address: string) => {
    if (!address || address.length < 5) {
      setAddressValidation(null);
      return;
    }

    setIsValidatingAddress(true);
    try {
      const response = await fetch(`/api/banners/validate-address?address=${encodeURIComponent(address)}`);
      const result = await response.json();

      if (result.success) {
        setAddressValidation({
          isValid: result.data.isValid,
          district: result.data.administrative_district,
          coordinates: result.data.coordinates,
          error: result.data.error,
        });
      }
    } catch (error) {
      console.error('Address validation error:', error);
      setAddressValidation({
        isValid: false,
        error: '주소 검증 중 오류가 발생했습니다.',
      });
    } finally {
      setIsValidatingAddress(false);
    }
  };

  // Debounce address validation
  const [addressDebounceTimer, setAddressDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const handleAddressChange = (address: string) => {
    if (addressDebounceTimer) {
      clearTimeout(addressDebounceTimer);
    }

    const timer = setTimeout(() => {
      validateAddress(address);
    }, 800);

    setAddressDebounceTimer(timer);
  };

  // Get current location and reverse geocode to address
  const handleGetCurrentLocation = () => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      toast({
        title: '위치 정보를 사용할 수 없습니다',
        description: '브라우저에서 위치 정보를 지원하지 않습니다.',
        variant: 'destructive',
      });
      return;
    }

    // Check if the page is loaded over HTTPS (required for geolocation on mobile)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      toast({
        title: '보안 연결이 필요합니다',
        description: '위치 정보는 HTTPS 연결에서만 사용할 수 있습니다. 안전한 연결로 접속해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Use Kakao Maps API to reverse geocode
          const response = await fetch(
            `/api/banners/reverse-geocode?lat=${latitude}&lng=${longitude}`,
            {
              signal: AbortSignal.timeout(15000), // 15 second timeout for mobile
            }
          );
          const result = await response.json();

          if (result.success && result.data) {
            // Set address in form
            form.setValue('address', result.data.address);

            // Also validate the address
            setAddressValidation({
              isValid: true,
              district: result.data.administrative_district,
              coordinates: { lat: latitude, lng: longitude },
            });

            toast({
              title: '위치 정보를 가져왔습니다',
              description: result.data.address,
            });
          } else {
            throw new Error(result.error || '주소를 가져올 수 없습니다');
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          toast({
            title: '주소 변환 실패',
            description: '좌표를 주소로 변환하는 중 오류가 발생했습니다.',
            variant: 'destructive',
          });
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = '위치 정보를 가져올 수 없습니다.';
        let errorTitle = '위치 정보 가져오기 실패';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorTitle = '위치 권한이 거부되었습니다';
            errorMessage = '설정 > 사이트 설정 > 위치에서 권한을 허용해주세요.\n\n' +
              '모바일: 브라우저 설정에서 위치 권한을 허용해야 합니다.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다. GPS가 꺼져있거나 실내에 있을 수 있습니다.';
            break;
          case error.TIMEOUT:
            errorMessage = '위치 정보 요청 시간이 초과되었습니다. 다시 시도해주세요.';
            break;
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased to 15 seconds for mobile
        maximumAge: 0,
      }
    );
  };

  const onSubmit = async (data: BannerFormData) => {
    setIsSubmitting(true);

    // Show loading toast for mobile users
    const loadingToast = toast({
      title: '현수막 등록 중...',
      description: '잠시만 기다려주세요.',
    });

    try {
      // Find selected party
      const selectedParty = parties.find(p => p.name === data.party);
      if (!selectedParty) {
        throw new Error('선택된 정당을 찾을 수 없습니다.');
      }

      // Prepare form data for API
      const formData = new FormData();
      formData.append('party_id', selectedParty.id);
      formData.append('address', data.address);
      formData.append('text', data.text);
      formData.append('start_date', data.startDate);
      formData.append('end_date', data.endDate);
      formData.append('memo', data.memo || '');
      formData.append('is_active', 'true');

      // Add image if present
      if (data.image) {
        formData.append('image', data.image);
      }

      // Send to API with longer timeout for mobile
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds for mobile

      try {
        const response = await fetch('/api/banners', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const result = await response.json();

        if (response.ok && result.success) {
          // Show success message with administrative district info
          const districtInfo = result.data.administrative_district
            ? ` (${result.data.administrative_district})`
            : '';

          toast({
            title: '현수막이 등록되었습니다',
            description: `${data.text} - ${data.address}${districtInfo}`,
          });

          // Redirect to dashboard (page will fetch fresh data from API)
          router.push('/');
        } else {
          throw new Error(result.error || '현수막 등록에 실패했습니다.');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('등록 시간이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: '등록 실패',
        description: error instanceof Error ? error.message : '현수막 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">뒤로가기</span>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">현수막 등록</h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">새로운 현수막 정보를 등록합니다</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-4xl mx-auto pb-24 sm:pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Form Fields */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">기본 정보</CardTitle>
                    <CardDescription>현수막의 기본 정보를 입력해주세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>현수막 문구</FormLabel>
                          <FormControl>
                            <Input placeholder="예: 함께 만드는 더 나은 미래" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="party"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>정당 선택</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="정당을 선택해주세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {parties.map((party) => (
                                <SelectItem key={party.id} value={party.name}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: party.color }}
                                    />
                                    {party.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>설치 주소</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <Input
                                  placeholder="예: 서울시 강남구 역삼동 123-45"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleAddressChange(e.target.value);
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={handleGetCurrentLocation}
                                  disabled={isGettingLocation}
                                  title="현재 위치 가져오기"
                                >
                                  {isGettingLocation ? (
                                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Locate className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              {isValidatingAddress && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                  주소 확인 중...
                                </div>
                              )}
                              {addressValidation && !isValidatingAddress && (
                                <div
                                  className={`p-3 rounded-lg text-sm ${
                                    addressValidation.isValid
                                      ? 'bg-green-50 border border-green-200'
                                      : 'bg-red-50 border border-red-200'
                                  }`}
                                >
                                  {addressValidation.isValid ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-green-700 font-medium">
                                        <svg
                                          className="w-5 h-5"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                        유효한 주소입니다
                                      </div>
                                      {addressValidation.district && (
                                        <div className="text-green-600 flex items-center gap-2">
                                          <MapPin className="w-4 h-4" />
                                          <span>
                                            행정동: <strong>{addressValidation.district}</strong>
                                          </span>
                                        </div>
                                      )}
                                      {addressValidation.coordinates && (
                                        <div className="text-green-600 text-xs">
                                          좌표: {addressValidation.coordinates.lat.toFixed(6)}, {addressValidation.coordinates.lng.toFixed(6)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-red-700">
                                      {addressValidation.error || '주소를 확인할 수 없습니다.'}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormDescription>
                            정확한 주소를 입력하면 자동으로 좌표와 행정동이 추출됩니다
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">설치 기간</CardTitle>
                    <CardDescription>현수막 설치 시작일과 종료일을 선택해주세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>시작일</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>종료일</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">추가 정보</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="memo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>메모</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="추가적인 메모나 특이사항을 입력해주세요"
                              className="resize-none"
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Image Upload */}
              <div>
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">현수막 사진</CardTitle>
                    <CardDescription>현수막 사진을 업로드해주세요</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {previewImage ? (
                        <div className="space-y-4">
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={previewImage}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPreviewImage(null);
                              form.setValue('image', undefined);
                            }}
                            className="w-full"
                          >
                            사진 다시 선택
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <label
                            htmlFor="image-upload"
                            className="aspect-video bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                          >
                            <Upload className="w-12 h-12 text-gray-400 mb-4" />
                            <p className="text-gray-600 font-medium mb-2">사진을 업로드하세요</p>
                            <p className="text-sm text-gray-500 mb-4">JPG, PNG 파일만 가능합니다</p>
                            <Button type="button" variant="outline" className="pointer-events-none">
                              파일 선택
                            </Button>
                            <input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-center text-gray-500">
                            모바일에서는 카메라로 직접 촬영할 수 있습니다
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="mt-8">
                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        등록 중...
                      </div>
                    ) : (
                      '현수막 등록하기'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}