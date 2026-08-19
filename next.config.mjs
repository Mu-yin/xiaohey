const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "xiaohey";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  ...(isGitHubPages
    ? {
        output: "export",
        basePath: `/${repositoryName}`,
        assetPrefix: `/${repositoryName}/`,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
