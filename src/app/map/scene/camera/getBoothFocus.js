import { BOOTH_MARKER_FRAME_HEIGHT, getBoothFootprint, getBoothTopHeight } from '../../../../constants/boothSizes'
import { getBoothCenter, getBoothTents } from '../zones/boothTents'

// 부스 하나를 화면에 담는 카메라 자리를 계산한다. three 의존 없는 순수 함수.
//
// 왜 MapCanvas 안이 아니라 별도 파일인가 —
// 각도·거리 계산은 3D 씬을 띄우지 않고 값만으로 검증할 수 있어야 한다. 카메라 연출을 손볼 때마다
// 지도를 전부 렌더해서 눈으로 확인해야 하면 조정이 느려진다. 또 "어디를 볼지 정하는 로직"과
// "실제로 카메라를 옮기는 로직"을 나눠두면(MapCanvas의 ZoneCamera가 후자), 나중에 연출이
// 바뀌어도 한쪽만 고치면 된다 — timeOfDay·부스 밝기에서 쓴 것과 같은 방식이다.
// boothTents.js·constants/boothSizes.js도 three에 의존하지 않으므로 이 파일은 여전히 값만으로 테스트할 수 있다.
//
// 좌표는 zones/boothTents.js의 getBoothTents / getBoothCenter로 읽는다 — ZoneBooths가 천막을 놓고
// 등불을 매달 때 쓰는 바로 그 함수다(map-booth-handling-rules.md 1번 규칙). 자세한 이유는 본문 주석 참고.
//
// ────────────────────────────────────────────────────────────────────────
// 2026-09-26 전면 수정(이슈 #287, 재원 요청 "부스 카메라 위치의 기준이 명확하지 않다"):
//
// 예전 방식은 세 가지를 고정값으로 들고 있었다 — 거리 25m, 내려보는 각 18°, 타깃 높이 1.6m.
// 그리고 방위각은 "천막 rotation의 ±z 중 지금 카메라와 가까운 쪽"으로 정했다. 문제가 네 가지였다.
//
//   1) 같은 부스를 눌러도 어디서 눌렀는지에 따라 카메라가 반대쪽에 섰다. "가까운 쪽"이 기준이라
//      손으로 조금 돌려놓고 다시 누르면 구도가 뒤집힌다 — 기준이 없다는 느낌의 가장 큰 원인.
//   2) 방위각이 천막 rotation을 따라가서 부스마다 방향이 달랐다. 옆 부스로 넘어갈 때마다
//      화면이 통째로 회전한다(rotation 값이 0·90·180·270이 섞여 있다).
//   3) 내려보는 각 18°는 구역 기본 시점(48.8°)과 30° 차이라, 부스를 고르면 시점이 확 눕는다.
//      그 낮은 각도에서는 앞에 있는 건물·천막·나무에 부스가 가려지는 일이 잦았다(21곳 중 8곳).
//   4) 거리 25m가 부스 크기와 무관한 고정값이라, 한 동만 쓰는 부스는 멀어 보이고
//      여러 동을 쓰는 부스(디프 7동 등)는 화면에 다 들어오지도 않았다.
//
// 새 방식은 셋 다 "그 구역 기본 시점"에서 가져온다.
//
//   - 방위각: 구역 기본 시점의 방위각(MapCanvas의 ZONE_CAMERAS에서 역산) + 구역별 오프셋.
//     즉 부스를 고르면 "지금 보던 방향 그대로 가까이 가는" 그림이 된다. 부스마다, 누른 위치마다
//     방향이 달라지지 않으니 기준이 생긴다. 구역별 오프셋은 그 구역에서만 정면이 뒤쪽인 경우를
//     180으로 뒤집는 장치다(만해광장 한 곳 — 자세한 건 MapCanvas의 ZONE_CAMERAS 주석).
//   - 내려보는 각: 구역 기본 시점 그대로(네 구역 모두 48.8°). 시점이 눕지 않으니 가려짐이 줄고,
//     "확대만 됐다"는 느낌이 들어서 위치 감각을 잃지 않는다.
//   - 거리: 고정값을 버리고 부스 크기에서 역산한다(아래 fit 계산). 한 동 부스는 16m까지 들어오고
//     여러 동 부스는 상한(25m)에서 멈춘다 — 예전보다 가까워지기만 하고 멀어지는 부스는 없다.
//
// ────────────────────────────────────────────────────────────────────────
// 거리를 역산하는 방법(fit)
//
// "부스가 차지하는 상자의 꼭짓점이 전부 화면 안에 들어오는 가장 가까운 거리"를 구한다.
// 카메라 방향이 정해져 있으므로 점 하나가 요구하는 최소 거리는 닫힌 식으로 나온다.
//
//   타깃 T에서 카메라로 가는 단위벡터를 b, 화면의 오른쪽을 r, 위쪽을 u라고 하면
//   카메라는 T + d·b 에 있고, 점 p에 대해 v = p - T 일 때 카메라 기준 좌표는
//     가로 a = v·r,  세로 c = v·u,  앞쪽 거리 = d - v·b
//   화면 안에 있으려면  |a| ≤ (d - v·b)·tanH,  |c| ≤ (d - v·b)·tanV  이므로
//     d ≥ v·b + |a|/tanH,   d ≥ v·b + |c|/tanV
//   모든 점에 대해 이 값의 최댓값을 취하면 "다 들어오는 가장 가까운 거리"다.
//   (tanV = tan(fov/2), tanH = tanV × 화면비. three의 fov는 세로 기준이다.)
//
// 여기 넣는 점은 두 종류다.
//   - 천막(구조물) 한 동마다 발자국 네 귀퉁이 × (바닥, 꼭대기) = 8점. 발자국·높이는
//     constants/boothSizes.js가 유일한 출처라 푸드트럭·차양막도 자동으로 맞는다.
//   - 등불 마커 꼭대기 1점(부스 가운데 위). 등불은 화면상 크기가 고정이라 월드 높이가
//     거리에 따라 변해서 이 계산에 그대로 넣을 수 없다 — 그래서 초점 거리 범위에서 가장 높은 값
//     하나를 상수로 쓴다(constants/boothSizes.js의 BOOTH_MARKER_FRAME_HEIGHT).
//
// 최소 거리는 MapCanvas의 MIN_DISTANCE(14)와 같아야 한다 — 더 가까우면 OrbitControls가
// 첫 update()에서 밀어내서 의도한 구도가 깨진다. 최대 거리 25는 예전 고정 거리와 같은 값이라,
// 이 수정으로 어떤 부스도 예전보다 멀어지지 않는다.

// 초점 거리의 아래·위 한계(m). MapCanvas의 MIN_DISTANCE와 짝이다(위 설명).
export const BOOTH_FOCUS_MIN_DISTANCE = 14
export const BOOTH_FOCUS_MAX_DISTANCE = 25

// 화면 가장자리에 남겨둘 여백. 1.18이면 가장 바깥 점이 화면 절반의 85% 위치에 온다(양옆 약 7.6%씩 여백).
// 1.0(딱 맞게)으로 두면 천막 귀퉁이가 화면 테두리에 붙어서 잘린 것처럼 보이고,
// 1.3 이상은 부스가 작아져서 "확대했다"는 느낌이 사라진다. 640×1000·600×1000 렌더로 비교해 고른 값.
export const BOOTH_FOCUS_MARGIN = 1.18

// 카메라가 바라보는 지점의 높이(m, 부스 지면 기준).
// 화면에 담는 것이 지면 0m ~ 등불 꼭대기 6.5m라 그 절반쯤을 본다 — 이러면 위아래 여백이 비슷해져서
// 같은 여백으로 더 가까이 당길 수 있다(타깃을 바닥에 두면 아래쪽 화면 절반이 그냥 빈 땅이 된다).
// 결과적으로 천막(높이 3.3m)은 화면 아래 절반, 등불은 위 절반에 오는 그림이 된다.
export const BOOTH_FOCUS_TARGET_HEIGHT = 3.2

// 구역 기본 시점의 내려보는 각(도). 네 구역 모두 48.8°로 같아서 기본값으로 둔다 —
// MapCanvas는 프리셋에서 역산한 실제 값을 넘기므로, 구역 시점을 다시 튜닝하면 초점도 따라온다.
export const BOOTH_FOCUS_ELEVATION_DEG = 48.8

const toRadians = (deg) => (deg * Math.PI) / 180

// 천막(구조물) 한 동이 차지하는 상자의 꼭짓점 8개. 발자국은 처마·어닝까지 포함한 크기다.
function getStructureCorners(tent) {
  const { width, depth } = getBoothFootprint(tent.size, tent.spec)
  const topHeight = getBoothTopHeight(tent.size, tent.spec)
  const [x, y, z] = tent.position
  const cos = Math.cos(tent.rotationY)
  const sin = Math.sin(tent.rotationY)
  const corners = []

  for (const localX of [-width / 2, width / 2]) {
    for (const localZ of [-depth / 2, depth / 2]) {
      // three의 rotation.y = θ는 로컬 +x를 (cos θ, 0, -sin θ)로, 로컬 +z를 (sin θ, 0, cos θ)로 보낸다.
      // BoothMarker도 같은 회전을 쓰므로 여기 계산과 화면에 그려지는 자리가 일치한다.
      const worldX = x + localX * cos + localZ * sin
      const worldZ = z - localX * sin + localZ * cos
      corners.push([worldX, y, worldZ], [worldX, y + topHeight, worldZ])
    }
  }
  return corners
}

/**
 * 부스를 화면에 담는 카메라 위치와 타깃을 구한다.
 *
 * @param booth   GET /api/booths/ 부스 항목(placements 또는 map_x / map_y / map_elevation / rotation)
 * @param options 구역 시점과 화면 정보. MapCanvas의 ZoneCamera가 구역 프리셋·카메라에서 꺼내 넘긴다.
 *   - azimuthDeg   방위각(도). atan2(카메라x - 타깃x, 카메라z - 타깃z) 기준 — 0°는 카메라가 +z 쪽
 *   - elevationDeg 내려보는 각(도). 기본 48.8(구역 기본 시점)
 *   - fovDeg       카메라 세로 화각(도). three PerspectiveCamera의 fov
 *   - aspect       화면비(가로/세로). 기본 0.6은 폰 지도 영역 비율(약 600×1000)
 *   - minDistance / maxDistance / margin / targetHeight  위 상수들의 override
 * @returns { position, target, distance } 또는 좌표가 없는 부스면 null
 */
export function getBoothFocus(booth, options = {}) {
  if (!booth) return null

  // 천막이 그려지는 자리와 카메라가 날아가는 자리는 반드시 같은 곳에서 읽어야 한다 —
  // ZoneBooths도 getBoothTents로 천막을 놓고 getBoothCenter로 등불을 매달므로, 여기서 booth.map_*를
  // 따로 읽으면 두 값이 갈라진다. 대표 좌표(booth.map_*)의 정의는 "첫 운영일 첫 천막"인데 placements는
  // 요청한 날짜·시간대의 천막만 내려오기 때문에, 날짜마다 자리가 바뀌는 부스(디프·축기단·인캐쳐·
  // FC 엘레펜테·행정학전공 등 7곳)는 10/1 탭에서 천막은 10/1 자리에 있는데 카메라만 9/29 자리로 날아간다.
  // (campus-map/booth-placements-backend-guide.md 3장·5장)
  //
  // 좌표가 없는 부스(정보 미수령 — 컬럼이 nullable이다)는 천막이 0동으로 나와 getBoothCenter가 null을
  // 준다. 그대로 계산하면 카메라가 원점으로 날아간다. 이 판정도 boothTents.js 안에 한 번만 있으면 된다.
  const tents = getBoothTents(booth)
  const center = getBoothCenter(tents)
  if (!center) return null

  const {
    azimuthDeg = 0,
    elevationDeg = BOOTH_FOCUS_ELEVATION_DEG,
    fovDeg = 45,
    aspect = 0.6,
    minDistance = BOOTH_FOCUS_MIN_DISTANCE,
    maxDistance = BOOTH_FOCUS_MAX_DISTANCE,
    margin = BOOTH_FOCUS_MARGIN,
    targetHeight = BOOTH_FOCUS_TARGET_HEIGHT,
  } = options

  // 바라보는 지점 = 부스가 쓰는 천막 전체의 가운데(한 동이면 그 천막) + 눈높이
  const target = [center[0], center[1] + targetHeight, center[2]]

  const azimuth = toRadians(azimuthDeg)
  const elevation = toRadians(elevationDeg)
  const sinAz = Math.sin(azimuth)
  const cosAz = Math.cos(azimuth)
  const sinEl = Math.sin(elevation)
  const cosEl = Math.cos(elevation)

  // 타깃 → 카메라(단위벡터), 그 방향에서 본 화면의 오른쪽·위쪽. three 카메라 기준(right × up = back)이다.
  const back = [sinAz * cosEl, sinEl, cosAz * cosEl]
  const right = [cosAz, 0, -sinAz]
  const up = [-sinEl * sinAz, cosEl, -sinEl * cosAz]

  const tanV = Math.tan(toRadians(fovDeg) / 2)
  const tanH = tanV * aspect

  // 화면에 들어와야 하는 점들: 천막마다 상자 8점 + 부스 가운데 등불 꼭대기 1점
  const points = tents.flatMap(getStructureCorners)
  points.push([center[0], center[1] + BOOTH_MARKER_FRAME_HEIGHT, center[2]])

  let distance = minDistance
  for (const [px, py, pz] of points) {
    const vx = px - target[0]
    const vy = py - target[1]
    const vz = pz - target[2]
    const depth = vx * back[0] + vy * back[1] + vz * back[2]
    const across = Math.abs(vx * right[0] + vy * right[1] + vz * right[2])
    const along = Math.abs(vx * up[0] + vy * up[1] + vz * up[2])
    distance = Math.max(distance, depth + (across * margin) / tanH, depth + (along * margin) / tanV)
  }
  distance = Math.min(distance, maxDistance)

  return {
    position: [
      target[0] + back[0] * distance,
      target[1] + back[1] * distance,
      target[2] + back[2] * distance,
    ],
    target,
    distance,
  }
}
