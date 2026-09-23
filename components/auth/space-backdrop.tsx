/**
 * 인증 화면 배경: Blender(Cycles)로 렌더링한 궤도 일출 장면.
 * 지구 텍스처와 별 지도는 NASA 공개 자료(Blue Marble, Black Marble, SVS Deep Star Maps).
 */
export function SpaceBackdrop() {
  return (
    <div aria-hidden="true" className="space-backdrop">
      <div className="space-image" />
      <div className="space-shade" />
    </div>
  );
}
