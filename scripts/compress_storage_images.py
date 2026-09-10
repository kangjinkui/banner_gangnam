#!/usr/bin/env python3
"""
Supabase Storage 'banners' 버킷의 이미지를 일괄 압축하여 같은 경로에 덮어쓴다.

같은 경로에 upsert 하므로 DB의 image_url / thumbnail_url 은 그대로 유효하다.
(DB 쓰기가 전혀 없어 롤백 위험이 낮다.)

사용법:
    python scripts/compress_storage_images.py                     # 드라이런 (기본, 아무것도 안 바꿈)
    python scripts/compress_storage_images.py --apply             # 실제 적용
    python scripts/compress_storage_images.py --apply --limit 20  # 20개만 시범 적용

원본은 --apply 시 backup/storage-originals/ 에 먼저 저장된다.
"""
from __future__ import annotations

import argparse
import io
import json
import sys
import time
from pathlib import Path

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "banners"
BACKUP_DIR = ROOT / "backup" / "storage-originals"
REPORT_PATH = ROOT / "backup" / "compress-report.json"

# 원본 이미지 목표 규격 (앱의 ImageService.DEFAULT_MAX_SIZE 와 동일)
MAX_W, MAX_H = 1920, 1080
# 썸네일 목표 규격 (앱의 DEFAULT_THUMBNAIL_SIZE 와 동일)
THUMB_W, THUMB_H = 300, 200

JPEG_QUALITY = 72
THUMB_QUALITY = 65
# 재업로드 시 CDN 캐시 수명(초). 현재 코드값 3600(1시간)은 cached egress 를 크게 늘린다.
CACHE_CONTROL = "31536000"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def load_env() -> tuple[str, str]:
    """.env.local 에서 URL 과 service role key 를 읽는다."""
    env_path = ROOT / ".env.local"
    if not env_path.exists():
        sys.exit("[중단] {} 가 없습니다.".format(env_path))

    env: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not url:
        sys.exit("[중단] NEXT_PUBLIC_SUPABASE_URL 이 비어 있습니다.")
    if not key or key.startswith("your_"):
        sys.exit(
            "[중단] SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.\n"
            "       Supabase 대시보드 -> Settings -> API -> service_role 값을\n"
            "       .env.local 에 채운 뒤 다시 실행하세요.\n"
            "       (Storage 목록 조회/덮어쓰기는 anon key 로는 불가능합니다.)"
        )
    return url.rstrip("/"), key


def make_session(key: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({"apikey": key, "Authorization": "Bearer " + key})
    return s


def list_objects(s: requests.Session, base: str, prefix: str = "") -> list[dict]:
    """버킷 안의 모든 파일을 재귀적으로 나열한다."""
    found: list[dict] = []
    offset = 0
    page = 100

    while True:
        r = s.post(
            "{}/storage/v1/object/list/{}".format(base, BUCKET),
            json={
                "prefix": prefix,
                "limit": page,
                "offset": offset,
                "sortBy": {"column": "name", "order": "asc"},
            },
            timeout=60,
        )
        if r.status_code == 402:
            sys.exit(
                "[중단] Supabase 프로젝트가 할당량 초과로 잠겨 있습니다 (HTTP 402).\n"
                "       이 스크립트는 이미지를 내려받아야 하므로 egress 가 필요합니다.\n"
                "       대시보드에서 프로젝트를 먼저 복구한 뒤 실행하세요."
            )
        r.raise_for_status()
        items = r.json()
        if not items:
            break

        for it in items:
            name = it.get("name", "")
            path = name if not prefix else "{}/{}".format(prefix, name)
            # id 가 없으면 폴더 -> 재귀
            if it.get("id") is None:
                found.extend(list_objects(s, base, path))
            else:
                it["_path"] = path
                found.append(it)

        if len(items) < page:
            break
        offset += page

    return found


def compress(raw: bytes, is_thumb: bool):
    """이미지를 리사이즈·재인코딩한다. 실패하거나 이득이 없으면 None."""
    try:
        im = Image.open(io.BytesIO(raw))
        im = ImageOps.exif_transpose(im)  # 회전 정보 반영 후 제거
    except Exception as e:
        print("    ! 디코딩 실패: {}".format(e))
        return None

    has_alpha = im.mode in ("RGBA", "LA") or (
        im.mode == "P" and "transparency" in im.info
    )

    box = (THUMB_W, THUMB_H) if is_thumb else (MAX_W, MAX_H)
    quality = THUMB_QUALITY if is_thumb else JPEG_QUALITY

    im.thumbnail(box, Image.LANCZOS)  # 비율 유지, 확대는 하지 않음

    out = io.BytesIO()
    if has_alpha:
        # 투명도가 있으면 WebP 로 (PNG 보다 훨씬 작다)
        im.save(out, format="WEBP", quality=quality, method=6)
        ctype = "image/webp"
    else:
        im.convert("RGB").save(
            out, format="JPEG", quality=quality, optimize=True, progressive=True
        )
        ctype = "image/jpeg"

    data = out.getvalue()
    if len(data) >= len(raw):
        return None  # 오히려 커지면 건드리지 않는다
    return data, ctype


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024:
            return "{:.1f}{}".format(n, unit)
        n /= 1024
    return "{:.1f}TB".format(n)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="실제로 덮어쓴다 (기본은 드라이런)")
    ap.add_argument("--limit", type=int, default=0, help="처리할 파일 수 제한 (0=전체)")
    args = ap.parse_args()

    base, key = load_env()
    s = make_session(key)

    mode = "적용" if args.apply else "드라이런"
    print("=== Supabase Storage 이미지 압축 [{}] ===".format(mode))
    print("버킷: {}\n".format(BUCKET))

    objects = list_objects(s, base)
    images = [o for o in objects if Path(o["_path"]).suffix.lower() in IMAGE_EXTS]
    if args.limit:
        images = images[: args.limit]

    print("이미지 {}개 발견\n".format(len(images)))
    if not images:
        return

    if args.apply:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    total_before = 0
    total_after = 0
    changed = 0
    skipped = 0
    failed = 0
    report: list[dict] = []

    for i, obj in enumerate(images, 1):
        path = obj["_path"]
        is_thumb = "_thumb" in Path(path).stem
        print("[{}/{}] {}".format(i, len(images), path))

        try:
            r = s.get(
                "{}/storage/v1/object/{}/{}".format(base, BUCKET, path), timeout=120
            )
            r.raise_for_status()
            raw = r.content
        except Exception as e:
            print("    ! 다운로드 실패: {}".format(e))
            failed += 1
            continue

        result = compress(raw, is_thumb)
        if result is None:
            print("    - 건너뜀 (이득 없음, {})".format(human(len(raw))))
            total_before += len(raw)
            total_after += len(raw)
            skipped += 1
            continue

        new_data, ctype = result
        saved = len(raw) - len(new_data)
        pct = saved / len(raw) * 100
        print(
            "    {} -> {}  (-{:.0f}%)".format(human(len(raw)), human(len(new_data)), pct)
        )

        total_before += len(raw)
        total_after += len(new_data)
        report.append(
            {
                "path": path,
                "before": len(raw),
                "after": len(new_data),
                "content_type": ctype,
            }
        )

        if args.apply:
            # 1) 원본 백업
            dest = BACKUP_DIR / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(raw)

            # 2) 같은 경로에 덮어쓰기 (DB의 image_url 불변)
            try:
                up = s.put(
                    "{}/storage/v1/object/{}/{}".format(base, BUCKET, path),
                    data=new_data,
                    headers={
                        "Content-Type": ctype,
                        "Cache-Control": "max-age=" + CACHE_CONTROL,
                        "x-upsert": "true",
                    },
                    timeout=120,
                )
                up.raise_for_status()
            except Exception as e:
                print("    ! 업로드 실패: {}  (원본은 {} 에 보관됨)".format(e, dest))
                failed += 1
                continue
            time.sleep(0.05)  # 레이트리밋 여유

        changed += 1

    print("\n=== 요약 ===")
    print("압축 대상 : {}개".format(changed))
    print("건너뜀    : {}개".format(skipped))
    print("실패      : {}개".format(failed))
    print("용량      : {} -> {}".format(human(total_before), human(total_after)))
    if total_before:
        print(
            "절감      : {} ({:.1f}%)".format(
                human(total_before - total_after),
                (total_before - total_after) / total_before * 100,
            )
        )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        json.dumps(
            {
                "mode": mode,
                "before": total_before,
                "after": total_after,
                "files": report,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print("\n리포트: {}".format(REPORT_PATH))

    if not args.apply:
        print("\n※ 드라이런이었습니다. 실제 적용하려면 --apply 를 붙이세요.")


if __name__ == "__main__":
    main()
