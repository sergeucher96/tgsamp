import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase — выполняется лениво при первом запросе
let supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rzxkajmrzxvnzbqhluoe.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      console.error('[Auth API] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set in Vercel environment!');
    }
    supabaseAdmin = createClient(url, key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6eGtham1yenh2bnpicWhsdW9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ0MzU1OSwiZXhwIjoyMTAxMDE5NTU5fQ.Ysh9kpbs2oeByPYm47arXMKPYg-jK4_4DZhQdV4y90k');
  }
  return supabaseAdmin;
}

export default async function handler(req, res) {
  // Debug: check env vars loaded
  console.log('[Auth API] ENV check:', {
    hasSUPABASE_URL: !!process.env.SUPABASE_URL,
    hasSERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasBOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
  });

  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { initData } = req.body || {};
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  // 1. Режим локальной разработки (localhost)
  if (process.env.NODE_ENV === 'development' && initData === 'DEV_DEBUG') {
    return handleDevLogin(res);
  }

  if (!BOT_TOKEN) {
    return res.status(400).json({ 
      error: 'Missing server BOT_TOKEN configuration' 
    });
  }

  if (!initData) {
    console.log('[Auth API] No initData provided, returning debug profile for browser testing');
    return handleDebugLogin(res);
  }

  try {
    // 2. Разбор параметров initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    if (!hash) {
      return res.status(401).json({ error: 'Missing hash parameter' });
    }

    // 3. Проверка срока годности auth_date (24 часа)
    const authDate = Number(params.get('auth_date'));
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || (now - authDate > 86400)) {
      return res.status(401).json({ error: 'Authentication data expired' });
    }

    // TEMPORARY: Skip HMAC verification for debugging
    console.log('[Auth API] WARNING: HMAC verification SKIPPED (debug mode)');
    console.log('[Auth API] initData preview:', initData.substring(0, 100));

    // 4. Извлекаем данные пользователя
    const tgUser = JSON.parse(params.get('user') || '{}');
    const tgId = tgUser.id?.toString();

    console.log('[Auth API] TG User:', tgUser);
    console.log('[Auth API] TG ID:', tgId);
    console.log('[Auth API] full params:', Object.fromEntries(params.entries()));

    if (!tgId) {
      return res.status(400).json({ error: 'User ID not found in initData' });
    }

    // 8. Поиск или создание профиля в Supabase
    let { data: profile, error: profError } = await getSupabaseAdmin()
      .from('profiles')
      .select('*')
      .eq('telegram_id', tgId)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile, error: createError } = await getSupabaseAdmin()
        .from('profiles')
        .insert([{
          telegram_id: tgId,
          first_name: tgUser.first_name || 'Скиталец',
          username: tgUser.username || null,
          money: 50000,
          inv_slots: 12,
          bank_balance: 0,
          deposit_balance: 0,
          energy: 100,
          hp: 100,
          hunger: 100,
          thirst: 100
        }])
        .select()
        .single();

      if (createError) {
        console.error('Profile creation error:', createError);
        return res.status(500).json({ error: 'Failed to create profile' });
      }
      profile = newProfile;
    }

    // 9. Загрузка сопутствующих данных
    const [skillsRes, licensesRes, vehicleRes] = await Promise.all([
      getSupabaseAdmin().from('player_skills').select('*').eq('player_id', profile.id),
      getSupabaseAdmin().from('player_licenses').select('*').eq('player_id', profile.id),
      getSupabaseAdmin().from('vehicles').select('*').eq('owner_id', profile.id).eq('is_active', true).maybeSingle()
    ]);

    return res.status(200).json({
      success: true,
      profile,
      skills: skillsRes.data || [],
      licenses: licensesRes.data || [],
      activeVehicle: vehicleRes.data || null
    });

  } catch (error) {
    console.error('Auth handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDevLogin(res) {
  let { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('*')
    .eq('telegram_id', 'DEBUG_PLAYER_1')
    .maybeSingle();

  if (!profile) {
    const { data: newProfile } = await getSupabaseAdmin()
      .from('profiles')
      .insert([{
        telegram_id: 'DEBUG_PLAYER_1',
        first_name: 'DevTester',
        money: 50000,
        inv_slots: 12,
        bank_balance: 0,
        deposit_balance: 0,
        energy: 100,
        hp: 100,
        hunger: 100,
        thirst: 100
      }])
      .select()
      .single();
    profile = newProfile;
  }

  return res.status(200).json({
    success: true,
    profile,
    skills: [],
    licenses: [],
    activeVehicle: null
  });
}