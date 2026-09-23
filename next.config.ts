import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 모드 배지가 헤더와 하단 작업 바 버튼을 가려서 끈다 (빌드/런타임 오류 오버레이는 그대로 뜬다)
  devIndicators: false,
};

export default nextConfig;
