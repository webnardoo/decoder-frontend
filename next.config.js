/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "picture-in-picture=*, fullscreen=*, autoplay=*, encrypted-media=*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;