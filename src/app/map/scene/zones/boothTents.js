// 부스 하나가 쓰는 천막 목록 펴기 — 2026-09-24 추가.
//
// 왜 있나: Booth 테이블은 부스 1행에 좌표를 map_x/map_y/map_elevation/rotation 한 세트만 들고 있어서
// "한 부스가 천막을 여러 동 쓰는" 경우를 담지 못했다. 실제 배치는 142동 중 66동이 그런 경우라
// (문과대학 9/29 2동, 사범대학 4동, 디프 10/1 7동 …) 지도에 천막이 절반만 그려지고 있었다.
// 백엔드 Booth에 placements(JSON 배열) 필드를 추가해 천막 전체를 내려받기로 하면서(재원 결정,
// 문서: campus-map/booth-placements-backend-guide.md) 이 파일이 "부스 1개 → 천막 n동"으로 펴는 자리가 됐다.
//
// 데이터 계약(GET /api/booths/):
//   - placements: 그 요청의 날짜·시간대에 해당하는 천막만. 백엔드가 이미 걸러서 내려주므로
//     프론트에서 날짜를 다시 거르지 않는다.
//   - 항목의 map_x/map_y/map_elevation/rotation/booth_size는 Booth의 같은 이름 필드와 의미·단위가 같다.
//     그래서 아래에서 "천막 항목"과 "부스 자신"을 같은 코드로 읽을 수 있다.
//   - placements가 null이거나 빈 배열이면 대표 좌표(부스 자신의 map_*)로 천막 1동만 그린다.
//     → 백엔드에 필드만 배포되고 데이터가 아직 안 들어간 상태에서도 화면이 지금과 똑같다.
//       배포 순서를 프론트·백엔드가 맞출 필요가 없다는 뜻이다.
//
// 축제 후 BoothPlacement 테이블로 옮겨도(관련 논의는 위 문서 8장) related_name을 "placements"로 두면
// 응답 모양이 같아서 이 파일은 그대로 둘 수 있다.

import { HAS_STRUCTURE_PREVIEW, STRUCTURE_PREVIEW } from './structurePreview'

// 좌표 세 축이 모두 있어야 씬에 놓을 수 있다. 백엔드 컬럼이 nullable이라 정보 미수령 부스는
// null로 내려오는데, 그대로 두면 전부 원점(0,0,0)에 겹쳐 그려진다(카드 목록 등 2D 리스트는 그대로 노출).
function hasCoordinates(source) {
  return source?.map_x != null && source?.map_y != null && source?.map_elevation != null
}

// rotation은 nullable이고 명세상 "도" 단위다. null은 0으로 치지만 undefined는 NaN이 되므로
// (NaN이 rotation에 들어가면 천막이 통째로 사라진다) Number로 한 번 걸러서 라디안으로 바꾼다.
function toRadians(degrees) {
  const value = Number(degrees)
  return (Number.isFinite(value) ? value : 0) * (Math.PI / 180)
}

// 부스 1개 → 천막 배열. 좌표가 없는 천막(과 부스)은 빠지므로 빈 배열이 나올 수 있다.
//   - unitNo:   그 날 그 부스의 몇 번째 천막인지(1부터). React key와 디버깅용
//   - position: BoothMarker/BoothLantern에 그대로 넘기는 [x, y, z] (map_x=씬 x, map_elevation=씬 y, map_y=씬 z)
//   - rotationY: Y축 회전(라디안)
//   - size:     천막 규격. 천막별 값이 우선이고, 없으면 부스 단위 값으로 떨어진다.
//               둘 다 없으면 BoothMarker 안의 normalizeBoothSize가 "BIG"으로 본다.
//               ※ 만화얼처럼 날짜에 따라 크기가 다른 부스가 있어서(9/29·9/30 SMALL, 10/1 BIG)
//                 부스 단위 booth_size보다 천막별 값이 진실이다.
//   - spec:     천막이 아닌 구조물용 { structure, width, depth } (2026-09-26 추가).
//               placements에 structure가 없으면 undefined가 되고, 받는 쪽(constants/boothSizes.js)이
//               "TENT"로 보기 때문에 기존 부스는 동작이 그대로다. 값 정리·범위 제한도 그쪽에서 한다.
//               ?truck= / ?market= 쿼리가 있으면 그 booth_id는 쿼리 값으로 덮어쓴다(structurePreview.js).
//               데이터가 DB에 들어가기 전에 푸드트럭·차양막을 눈으로 확인하려고 둔 개발용 스위치다.
export function getBoothTents(booth) {
  const placements = Array.isArray(booth?.placements) ? booth.placements : []
  // 천막 정보가 없으면 부스 자신을 천막 1동으로 취급한다(위 계약 3번).
  const sources = placements.length > 0 ? placements : [booth]
  // 쿼리가 없으면 STRUCTURE_PREVIEW가 빈 객체라 항상 undefined다 → 평소 동작에는 영향이 없다.
  const preview = HAS_STRUCTURE_PREVIEW ? STRUCTURE_PREVIEW[booth?.booth_id] : undefined

  return sources.filter(hasCoordinates).map((tent, index) => ({
    unitNo: tent.unit_no ?? index + 1,
    position: [tent.map_x, tent.map_elevation, tent.map_y],
    rotationY: toRadians(tent.rotation),
    size: tent.booth_size ?? booth?.booth_size,
    // 미리보기 항목은 구조물을 통째로 지정하는 값이라(structure + 크기) 섞지 않고 그대로 대체한다.
    spec: preview ?? {
      structure: tent.structure,
      width: tent.width,
      depth: tent.depth,
    },
  }))
}

// 부스가 쓰는 천막 전체의 가운데 자리 — 등불 마커(ZoneBooths)와 카메라 타깃(camera/getBoothFocus.js)이
// 같이 쓴다. 2026-09-26 추가(이슈 #287, 재원 요청 "등불을 첫 번째 부스가 아닌 부스 집합의 가운데에").
//
// 왜 필요한가: 지금까지 등불과 카메라는 첫 번째 천막(placements[0]) 위에 있었다. 한 동만 쓰는 부스는
// 그게 곧 가운데라 문제가 없었지만, 여러 동을 쓰는 부스(142동 중 66동)는 등불이 줄 맨 앞에 매달려서
// 부스가 어디부터 어디까지인지 알 수 없었다. 디프(7동, x 방향으로 약 24m)가 가장 심했다.
//
// 가운데를 잡는 방식 두 가지를 정했다.
//   - x·z는 천막 위치의 평균이다. 천막을 감싸는 상자의 중심(min·max의 중간)이 아닌 이유 —
//     천막이 한쪽에 몰린 부스(왼쪽 4동 + 오른쪽 1동 같은 배치)에서 상자 중심은 아무 천막도 없는
//     빈자리에 오는데, 평균은 천막이 많은 쪽으로 끌려가서 "부스의 몸통"에 더 가깝다.
//   - y(높이)는 평균이 아니라 가장 높은 천막의 지면 높이다. y는 "그 자리 땅의 높이"라서,
//     계단·경사에 걸친 부스에서 평균을 쓰면 등불이 높은 쪽 천막 안으로 파고든다.
//     제일 높은 지면에 맞추면 어느 천막과도 겹치지 않는다.
//
// 천막이 0동인 부스(좌표 정보 미수령)는 null이다 — 부르는 쪽이 그때 씬에서 빼면 된다.
// 그대로 [0,0,0]을 돌려주면 그런 부스들이 전부 원점에 겹쳐 그려진다.
export function getBoothCenter(tents) {
  if (!Array.isArray(tents) || tents.length === 0) return null

  let sumX = 0
  let sumZ = 0
  let maxY = -Infinity
  for (const { position } of tents) {
    sumX += position[0]
    sumZ += position[2]
    if (position[1] > maxY) maxY = position[1]
  }
  return [sumX / tents.length, maxY, sumZ / tents.length]
}

// 가운데에 가장 가까운 천막. "천막 하나에만" 붙어야 하는 것에 쓴다 — 지금은 <Html> 이름표(?marker=label)뿐이다.
// 등불은 천막과 상관없는 자리(getBoothCenter)에 띄울 수 있지만 이름표는 BoothMarker가 자기 천막 위에
// 다는 것이라 천막 중 하나를 골라야 한다. 첫 천막에 달면 여러 동 부스에서 이름표만 줄 맨 앞에 남아
// 등불(가운데)과 따로 놀기 때문에, 가운데에 가장 가까운 동을 고른다.
// 거리가 같은 천막이 여러 개면 앞선 것(= 천막 번호가 작은 쪽)이 이겨서 결과가 항상 같다.
export function getBoothCenterTent(tents, center = getBoothCenter(tents)) {
  if (!center || !Array.isArray(tents) || tents.length === 0) return null

  let closest = null
  let closestDistance = Infinity
  for (const tent of tents) {
    const dx = tent.position[0] - center[0]
    const dz = tent.position[2] - center[2]
    const distance = dx * dx + dz * dz // 제곱거리로 비교 — 순서만 필요해서 sqrt를 생략한다
    if (distance < closestDistance) {
      closestDistance = distance
      closest = tent
    }
  }
  return closest
}
