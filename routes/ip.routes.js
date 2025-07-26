import  express from 'express';
const router = express.Router();
router.get('/', (req, res) => {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0] || // For reverse proxy/CDN
    req.connection?.remoteAddress ||                 // For older Node versions
    req.socket?.remoteAddress ||                     // Modern
    req.ip;                                          // Express wrapper

  res.json({ ip });
});
export default router;
