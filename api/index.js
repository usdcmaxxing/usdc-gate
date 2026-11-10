let app;
module.exports = async (req, res) => {
  if (!app) {
    const mod = await import("../server.js");
    app = mod.default || mod;
  }
  return app(req, res);
};