const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware to verify user token (assuming you have this or use your existing one)
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = user;
  next();
};

// POST /api/profile/deactivate
router.post('/deactivate', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Purge user inventory records
    await supabase.from('inventory').delete().eq('user_id', userId);

    // 2. Soft-delete / deactivate profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        is_active: false, 
        deleted_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;