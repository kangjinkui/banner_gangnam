'use client';

import { useEffect, useRef } from 'react';
import { BannerWithParty } from '@/types/banner';

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

    // 새 마커 추가
    banners.forEach(banner => {
      if (!banner.lat || !banner.lng) return;

      const position = new window.kakao.maps.LatLng(banner.lat, banner.lng);

      // 커스텀 마커 이미지 생성
      const markerImageUrl = banner.party.marker_icon_url || createColoredMarkerSvg(banner.party.color);
      const imageSize = new window.kakao.maps.Size(32, 40);
      const imageOption = { offset: new window.kakao.maps.Point(16, 40) };

      const markerImage = new window.kakao.maps.MarkerImage(
        markerImageUrl,
        imageSize,
        imageOption
      );

      const marker = new window.kakao.maps.Marker({
        position: position,
        image: markerImage,
        map: kakaoMapRef.current
      });

      // 마커 클릭 이벤트
      if (onMarkerClick) {
        window.kakao.maps.event.addListener(marker, 'click', () => {
          onMarkerClick(banner);
        });
      }

      // 인포윈도우 생성
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `
          <div style="padding: 10px; min-width: 200px; font-family: sans-serif;">
            <div style="font-weight: 600; margin-bottom: 5px; color: ${banner.party.color};">
              ${banner.party.name}
            </div>
            <div style="font-size: 14px; margin-bottom: 3px;">
              ${banner.text}
            </div>
            <div style="font-size: 12px; color: #666;">
              ${banner.address}
            </div>
          </div>
        `
      });

      // 마커 호버 시 인포윈도우 표시
      window.kakao.maps.event.addListener(marker, 'mouseover', () => {
        infowindow.open(kakaoMapRef.current, marker);
      });

      window.kakao.maps.event.addListener(marker, 'mouseout', () => {
        infowindow.close();
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

// 색상으로 마커 SVG 생성 (Fallback용)
function createColoredMarkerSvg(color: string): string {
  const svg = `
    <svg width="32" height="40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24c0-8.836-7.164-16-16-16z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  `;

  return 'data:image/svg+xml;base64,' + btoa(svg);
}
