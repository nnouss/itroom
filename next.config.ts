import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 모드 배지가 헤더와 하단 작업 바 버튼을 가려서 끈다 (빌드/런타임 오류 오버레이는 그대로 뜬다)
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // 다른 사이트가 iframe으로 감싸 클릭을 유도하지 못하게 한다 (클릭재킹).
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
