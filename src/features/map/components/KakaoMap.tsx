'use client';

import { useEffect, useRef } from 'react';
import { BannerWithParty } from '@/types/banner';
import { PLACEHOLDER_IMAGES } from '@/lib/utils/placeholder';

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapProps {
  banners: BannerWithParty[];
  onMarkerClick?: (banner: BannerWithParty) => void;
  center?: { lat: number; lng: number };
  level?: number;
}

export function KakaoMap({
  banners,
  onMarkerClick,
  center = { lat: 37.4979, lng: 127.0276 }, // 강남역 기본 좌표
  level = 5
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Kakao Map API가 로드되지 않았으면 초기화하지 않음
    if (!window.kakao || !window.kakao.maps) {
      console.error('Kakao Maps API is not loaded');
      return;
    }

    // 지도 초기화
    if (mapRef.current && !kakaoMapRef.current) {
      const options = {
        center: new window.kakao.maps.LatLng(center.lat, center.lng),
        level: level
      };

      kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, options);
    }
  }, [center.lat, center.lng, level]);

  useEffect(() => {
    if (!kakaoMapRef.current || !window.kakao) return;

    // 기존 마커 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // 새 마커 추가 (활성화된 현수막만)
    banners.forEach(banner => {
      if (!banner.lat || !banner.lng || !banner.is_active) return;

      const position = new window.kakao.maps.LatLng(banner.lat, banner.lng);

      // CustomOverlay를 사용하여 안정적인 마커 생성
      const markerContent = document.createElement('div');
      markerContent.innerHTML = `
        <div style="position: relative; cursor: pointer; transform: translate(-20px, -50px);">
          <!-- 그림자 -->
          <div style="
            position: absolute;
            bottom: -2px;
            left: 50%;
            transform: translateX(-50%);
            width: 16px;
            height: 4px;
            background: radial-gradient(ellipse, rgba(0,0,0,0.3), transparent);
            border-radius: 50%;
          "></div>
          <!-- 마커 핀 -->
          <div style="
            width: 32px;
            height: 40px;
            background: ${banner.party.color};
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            position: relative;
          ">
            <!-- 내부 점 -->
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(45deg);
              width: 10px;
              height: 10px;
              background: white;
              border-radius: 50%;
            "></div>
          </div>
        </div>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: markerContent,
        map: kakaoMapRef.current,
        zIndex: 3
      });

      // 마커처럼 사용하기 위한 객체 생성
      const marker = {
        overlay: overlay,
        position: position,
        setMap: (map: any) => overlay.setMap(map),
        getPosition: () => position
      };

      // 인포윈도우도 CustomOverlay로 생성
      const imageUrl = banner.image_url || banner.thumbnail_url || PLACEHOLDER_IMAGES.mapPopup;
      const isExpired = new Date(banner.end_date) < new Date();

      const infoContent = document.createElement('div');
      infoContent.style.display = 'none'; // 기본적으로 숨김
      infoContent.innerHTML = `
        <div style="padding: 12px; min-width: 280px; max-width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 10px;">
          <div style="margin-bottom: 10px; border-radius: 6px; overflow: hidden; position: relative;">
            <img src="${imageUrl}" alt="${banner.text}"
                 style="width: 100%; height: 120px; object-fit: cover; display: block; background: #f3f4f6;"
                 onerror="this.src='${PLACEHOLDER_IMAGES.mapPopup}'"/>
            ${isExpired ? `
              <div style="position: absolute; top: 6px; right: 6px; background: #ef4444; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                만료됨
              </div>
            ` : ''}
          </div>
          <div style="background-color: ${banner.party.color}; color: white; padding: 6px 10px; border-radius: 4px; font-weight: 600; font-size: 13px; margin-bottom: 8px; display: inline-block;">
            ${banner.party.name}
          </div>
          <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px; color: #1a1a1a; line-height: 1.4;">
            ${banner.text}
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 4px; display: flex; align-items: start; gap: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span style="line-height: 1.4;">${banner.address}</span>
          </div>
          ${banner.administrative_district ? `
            <div style="font-size: 12px; color: #888; margin-top: 4px;">
              📍 행정동: ${banner.administrative_district}
            </div>
          ` : ''}
          <div style="font-size: 11px; color: #999; margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${banner.start_date} ~ ${banner.end_date}
          </div>
          ${banner.memo ? `
            <div style="font-size: 12px; color: #666; margin-top: 6px; padding-top: 6px; border-top: 1px solid #f0f0f0; font-style: italic;">
              💬 ${banner.memo.substring(0, 50)}${banner.memo.length > 50 ? '...' : ''}
            </div>
          ` : ''}
        </div>
      `;

      const infoOverlay = new window.kakao.maps.CustomOverlay({
        content: infoContent,
        position: position,
        xAnchor: 0.5,
        yAnchor: 1.8,
        zIndex: 999
      });

      // CustomOverlay에 이벤트 리스너 추가
      let isInfoVisible = false;

      markerContent.addEventListener('mouseover', () => {
        infoContent.style.display = 'block';
        infoOverlay.setMap(kakaoMapRef.current);
        isInfoVisible = true;
      });

      markerContent.addEventListener('mouseout', () => {
        infoContent.style.display = 'none';
        infoOverlay.setMap(null);
        isInfoVisible = false;
      });

      markerContent.addEventListener('click', () => {
        // 클릭 시 인포윈도우 토글
        if (isInfoVisible) {
          infoContent.style.display = 'none';
          infoOverlay.setMap(null);
          isInfoVisible = false;
        } else {
          infoContent.style.display = 'block';
          infoOverlay.setMap(kakaoMapRef.current);
          isInfoVisible = true;
        }

        // 상세 정보 다이얼로그도 열기
        if (onMarkerClick) {
          onMarkerClick(banner);
        }
      });

      markersRef.current.push(marker);
    });

    // 마커가 있으면 모든 마커가 보이도록 지도 범위 조정
    if (banners.length > 0) {
      const bounds = new window.kakao.maps.LatLngBounds();
      banners.forEach(banner => {
        if (banner.lat && banner.lng) {
          bounds.extend(new window.kakao.maps.LatLng(banner.lat, banner.lng));
        }
      });
      kakaoMapRef.current.setBounds(bounds);
    }
  }, [banners, onMarkerClick]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: '400px' }}
    />
  );
}

// 색상으로 마커 SVG 생성 (정당별 구분 가능한 핀 모양)
function createColoredMarkerSvg(color: string): string {
  // 간단하고 안정적인 SVG 마커 (그림자 효과 포함)
  const svg = `
    <svg width="40" height="50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50">
      <!-- 그림자 -->
      <ellipse cx="20" cy="48" rx="8" ry="2" fill="rgba(0,0,0,0.2)"/>
      <!-- 외곽선 (검은색 테두리) -->
      <path d="M20 1C11.716 1 5 7.716 5 16c0 11 15 32 15 32s15-21 15-32c0-8.284-6.716-15-15-15z"
            fill="#333"
            stroke="none"/>
      <!-- 메인 핀 -->
      <path d="M20 3C12.82 3 7 8.82 7 16c0 10 13 29 13 29s13-19 13-29c0-7.18-5.82-13-13-13z"
            fill="${color}"
            stroke="white"
            stroke-width="2"/>
      <!-- 내부 하얀 원 -->
      <circle cx="20" cy="16" r="6" fill="white"/>
      <!-- 중앙 점 (정당 색상) -->
      <circle cx="20" cy="16" r="3.5" fill="${color}"/>
    </svg>
  `.trim();

  // SVG를 data URL로 변환
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

// HTML 기반 커스텀 마커 생성 (대안)
function createCustomMarkerContent(color: string, partyName: string): string {
  return `
    <div style="position: relative; width: 40px; height: 50px; cursor: pointer;">
      <div style="
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 32px;
        height: 40px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: translateX(-50%) rotate(-45deg);
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      "></div>
      <div style="
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 14px;
        height: 14px;
        background: white;
        border-radius: 50%;
        border: 2px solid ${color};
        z-index: 1;
      "></div>
    </div>
  `;
}
