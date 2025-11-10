/**
 * Supabase连接测试工具
 */

import { supabase } from './supabaseClient';

export const testSupabaseConnection = async () => {
  console.log('开始测试Supabase连接...');
  console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
  console.log('环境变量存在:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);

  try {
    // 测试基本连接
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase连接错误:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }

    console.log('Supabase连接成功!', data);
    return {
      success: true,
      data
    };
  } catch (err) {
    console.error('Supabase连接异常:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : '未知错误',
      details: err
    };
  }
};

// 在浏览器控制台中运行测试
if (typeof window !== 'undefined') {
  window.testSupabaseConnection = testSupabaseConnection;
  console.log('在控制台中运行: await window.testSupabaseConnection()');
}