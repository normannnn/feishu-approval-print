/**
 * Supabase连接调试工具
 */

// 直接从环境变量读取配置
const supabaseUrl = 'https://ljoalggzmclyxjftjyhg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqb2FsZ2d6bWNseXhqZnRqeWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODAyMjAsImV4cCI6MjA3ODM1NjIyMH0.LXNhDu5UkcFIT5dhdlZny9dWucBodbqpjDQzAoK23Zk';

console.log('=== Supabase 调试信息 ===');
console.log('Supabase URL:', supabaseUrl);
console.log('环境变量 REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('环境变量 REACT_APP_SUPABASE_ANON_KEY 存在:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);

// 动态导入Supabase客户端来测试连接
const testSupabaseConnection = async () => {
  try {
    // 尝试导入Supabase客户端
    const { supabase } = await import('./supabaseClient');
    console.log('✅ Supabase客户端导入成功');

    // 测试基本连接
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Supabase连接错误:', error);
      return false;
    }

    console.log('✅ Supabase连接成功!', data);
    return true;
  } catch (err) {
    console.error('❌ Supabase客户端导入失败:', err);
    return false;
  }
};

// 测试认证状态
const testAuthState = async () => {
  try {
    const { supabase, supabaseHelpers } = await import('./supabaseClient');

    console.log('🔍 开始检查认证状态...');

    // 1. 检查session
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ 获取认证状态失败:', error);
      return { authenticated: false, error: error.message };
    }

    console.log('✅ Session检查:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      expiresAt: session?.expires_at
    });

    // 2. 使用helper检查认证状态
    const isAuth = await supabaseHelpers.isAuthenticated();
    console.log('✅ Helper认证检查:', isAuth);

    // 3. 获取当前用户
    const user = await supabaseHelpers.getCurrentUser();
    console.log('✅ 当前用户:', user ? {
      id: user.id,
      email: user.email,
      aud: user.aud
    } : null);

    // 4. 测试数据库连接
    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (dbError) {
        console.error('❌ 数据库连接测试失败:', dbError);
      } else {
        console.log('✅ 数据库连接正常:', data);
      }
    } catch (dbErr) {
      console.error('❌ 数据库连接异常:', dbErr);
    }

    return {
      authenticated: !!session,
      session,
      user,
      helperAuthenticated: isAuth
    };
  } catch (err) {
    console.error('❌ 认证状态检查失败:', err);
    return { authenticated: false, error: err };
  }
};

// 导出调试函数
export const debugSupabase = {
  testConnection: testSupabaseConnection,
  testAuthState: testAuthState,
  config: {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    keyPreview: supabaseAnonKey?.substring(0, 20) + '...'
  }
};

// 将调试函数添加到window对象，方便在浏览器控制台调用
if (typeof window !== 'undefined') {
  window.debugSupabase = debugSupabase;
  console.log('🔧 调试工具已加载，可在控制台使用:');
  console.log('  await window.debugSupabase.testConnection()');
  console.log('  await window.debugSupabase.testAuthState()');
}