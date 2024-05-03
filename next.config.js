module.exports = {
  // Only *.page.* files under pages/ become routes, so co-located component.jsx /
  // hooks / interfaces files are not published as pages. Applies to _app too.
  pageExtensions: ['page.js', 'page.jsx', 'page.ts', 'page.tsx'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  compiler: {
    styledComponents: true,
  }
};
