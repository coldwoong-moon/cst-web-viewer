> **한국어** | [English](README.md)

# cst-web-viewer

Tekla Structures 스타일 네비게이션 컨트롤을 갖춘 Three.js 기반 IFC/BIM 웹 3D 뷰어입니다.

## 주요 기능

- **프로덕션급 성능**: 브라우저에서 28.7M 삼각형, 276K+ 메시 렌더링 테스트 완료
- **Tekla 스타일 네비게이션**: 업계 표준 BIM 네비게이션 패러다임 (궤도/팬/줌/피팅)
- **지오메트리 인스턴싱**: 반복 구성요소(창문, 기둥 등)의 효율적 처리
- **Gzip 스트리밍**: 스트리밍 압축으로 전송 크기 40-50% 감소
- **터치 지원**: 직관적 제스처를 통한 모바일/태블릿 완벽 지원
- **뷰큐브**: 표준 뷰(상면, 전면, 우측, 아이소메트릭 등) 빠른 전환
- **바이너리 메시 포맷**: 하위 호환성을 갖춘 v1/v2/v3 포맷 지원

## 성능

**실제 프로덕션 IFC 데이터로 테스트:**

| 항목 | 수치 |
|------|------|
| 렌더링 삼각형 | **28,716,826개** |
| 일반 메시 | **276,577개** |
| 인스턴스 그룹 | **8개** |
| 바이너리 메시 파일 | **848.5 MB** (원본) |
| Gzip 압축 후 | **~400-500 MB** (레벨 6) |
| 뷰 전환 애니메이션 | **300ms** (ease-in-out) |

**파일 전송:**
- Gzip 스트리밍 압축으로 네트워크 전송량 40-50% 감소
- 브라우저 자동 압축 해제
- 로딩 중 진행률 표시

## 타 웹 BIM 뷰어와 비교

| 항목 | cst-web-viewer | web-ifc (IFC.js) | xeokit | Speckle |
|------|---------------|-----------------|--------|---------|
| **최대 삼각형** | 28.7M (테스트 완료) | ~1M (WASM 제한) | ~5M | ~10M |
| **데이터 전송** | 바이너리+Gzip | WASM 직접 파싱 | XKT 포맷 | Speckle 서버 |
| **네비게이션** | Tekla Structures 스타일 | 기본 OrbitControls | 커스텀 | 커스텀 |
| **인스턴싱** | 지원 (v3 포맷) | 부분 지원 | 지원 | 지원 |
| **모바일 터치** | 완벽 지원 | 부분 지원 | 지원 | 지원 |
| **서버 요구** | Node.js (정적 파일) | 없음 (클라이언트 전용) | 없음 | Speckle 서버 |
| **라이선스** | MIT | MPL-2.0 | AGPL-3.0 | Apache-2.0 |

## 네비게이션 컨트롤

### 마우스
| 동작 | 조작법 |
|------|--------|
| 궤도 회전 (Orbit) | 마우스 중앙 버튼 (MMB) 드래그 |
| 이동 (Pan) | Shift + MMB 드래그 **또는** 우클릭 드래그 |
| 줌 | 스크롤 휠 |
| 줌 드래그 | Ctrl + MMB 드래그 |
| 전체 보기 | MMB 더블클릭 |

### 키보드
| 키 | 동작 |
|----|------|
| **H** | 홈 뷰 (초기 위치로 리셋) |
| **F** | 전체 보기 (모델 전체 프레이밍) |
| **1** | 전면 뷰 (+Z축) |
| **2** | 후면 뷰 (-Z축) |
| **3** | 좌측 뷰 (-X축) |
| **4** | 우측 뷰 (+X축) |
| **5** | 상면 뷰 (+Y축) |
| **6** | 하면 뷰 (-Y축) |
| **7** | 아이소메트릭 뷰 (SW 시점) |

### 터치 (모바일/태블릿)
| 동작 | 제스처 |
|------|--------|
| 궤도 회전 | 1손가락 드래그 |
| 이동 | 2손가락 드래그 |
| 줌 | 2손가락 핀치 |

모든 뷰 변경은 **부드러운 애니메이션 전환**을 사용합니다.

## 빠른 시작

### 1. 바이너리 메시 데이터 생성

**[cst-ifc-rs](https://github.com/coldwoong-moon/cst-ifc-rs)** 를 사용하여 IFC 파일 변환:

```bash
cargo run --example cst_viewer -- --web model.ifc
```

`web_viewer/` 디렉토리에 `mesh.bin`이 생성됩니다.

### 2. 뷰어 서버 시작

```bash
cd cst-web-viewer
npm start
```

서버가 다음 작업을 수행합니다:
- 포트 3000에서 시작 (사용 중이면 자동 해제)
- CORS 활성화
- Gzip 압축 메시 데이터 자동 제공

### 3. 브라우저에서 열기

**http://localhost:3000** 으로 이동

뷰어가 다음을 수행합니다:
- 바이너리 메시 로드 및 압축 해제
- 로딩 진행률 표시
- 기본 조명으로 모델 렌더링
- 네비게이션 컨트롤 즉시 활성화

## 바이너리 메시 포맷

하위 호환성을 갖춘 3가지 포맷 버전을 지원합니다:

### v1 (레거시, 노말 포함)
```
[u8 version=1]
[u32 mesh_count]
메시별:
  [u32 name_len][name_bytes]
  [f32 r][f32 g][f32 b]
  [u32 vertex_count][u32 index_count]
  [vertex_count × 3 × f32 positions]
  [vertex_count × 3 × f32 normals]
  [index_count × u32 indices]
```

### v2 (노말 제거, FlatShading)
v1 대비 **33% 작음** - 브라우저에서 면별 노말 계산

### v3 (지오메트리 인스턴싱)
**프로덕션 권장** - 반복 지오메트리의 효율적 처리

```
[u8 version=3]
[u32 regular_mesh_count]
[u32 instanced_group_count]

일반 메시 (v2 포맷)...

인스턴스 그룹 (각각):
  [u32 name_len][name_bytes]
  [f32 r][f32 g][f32 b]
  [u32 vertex_count][u32 index_count][u32 instance_count]
  [vertex_count × 3 × f32 positions]
  [index_count × u32 indices]
  [instance_count × 16 × f32 transform_matrices (4×4 column-major)]
```

## API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|----------|--------|------|
| `/` | GET | Three.js 렌더러가 포함된 뷰어 HTML 페이지 |
| `/api/mesh` | GET | 바이너리 메시 데이터 (Gzip 압축 스트림) |
| `/api/info` | GET | 모델 메타데이터 (메시 수, 파일 크기) |

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3000` | 서버 포트 |

## 관련 프로젝트

- **[cst-ifc-rs](https://github.com/coldwoong-moon/cst-ifc-rs)** - Rust IFC 파서 및 메시 생성기 (바이너리 메시 데이터 생성용)

## 브라우저 호환성

| 브라우저 | 버전 | 상태 |
|---------|------|------|
| Chrome | 90+ | 테스트 완료 |
| Firefox | 88+ | 테스트 완료 |
| Safari | 14+ | 호환 |
| Edge | 90+ | 호환 |

## 기술 상세

**렌더링 파이프라인:**
1. 서버에서 Gzip 압축 바이너리 메시를 `/api/mesh`로 스트리밍
2. 브라우저 자동 압축 해제 (Content-Encoding: gzip)
3. ArrayBuffer를 포맷 버전에 따라 디코딩
4. 각 메시/인스턴스에 대해 Three.js BufferGeometry 생성
5. 바이너리의 RGB 색상으로 MeshStandardMaterial 적용
6. PerspectiveCamera + DirectionalLight로 씬 렌더링

**메모리 관리:**
- 인스턴싱 시 BufferGeometry 정점 데이터 공유
- 위치 데이터에 Float32Array 사용
- 인덱스에 Uint32Array 사용

## 라이선스

MIT License
