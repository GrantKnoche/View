
import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { Language } from '../types';
import { t } from '../utils/i18n';
import { playClickSound, playActionSound, playCancelSound } from '../utils/soundUtils';
import { UserIcon, CheckCircleIcon, XIcon } from './Icons';

interface UserPageProps {
  user: User | null;
  lang: Language;
}

type DiagStatus = 'idle' | 'pending' | 'success' | 'error' | 'skipped';

const TIMEOUT_MS = 15000; // Increased to 15 seconds for slower networks

// The CORRECT SQL schema that matches App.tsx types
const CORRECT_SQL = `-- 1. Reset Table
drop table if exists pomodoro_logs;

-- 2. Create Table (Matches App Code)
create table pomodoro_logs (
  id uuid primary key,
  user_id uuid references auth.users not null,
  timestamp bigint not null,
  type text not null,
  duration_minutes int not null,
  completed boolean not null
);

-- 3. Security (RLS)
alter table pomodoro_logs enable row level security;

-- 4. Policies
create policy "Users can insert own logs" on pomodoro_logs 
for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can view own logs" on pomodoro_logs 
for select to authenticated using (auth.uid() = user_id);

create policy "Users can delete own logs" on pomodoro_logs 
for delete to authenticated using (auth.uid() = user_id);

-- 5. Refresh Cache
NOTIFY pgrst, 'reload schema';`;

// Helper: UUID Generator Fallback
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Helper: Promise Timeout Wrapper
function withTimeout<T>(promise: PromiseLike<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
}

export const UserPage: React.FC<UserPageProps> = ({ user, lang }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Diagnostic State
  const [diagSteps, setDiagSteps] = useState<{ auth: DiagStatus, read: DiagStatus, write: DiagStatus }>({
      auth: 'idle', read: 'idle', write: 'idle'
  });
  const [diagError, setDiagError] = useState<string | null>(null);
  const [showSqlHelp, setShowSqlHelp] = useState(false);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000); 
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleLogin = async () => {
    playClickSound();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      playCancelSound();
      setMessage({ type: 'error', text: error.message });
    } else {
      playActionSound();
      setMessage({ type: 'success', text: t('auth_success', lang) });
    }
  };

  const handleSignUp = async () => {
    playClickSound();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      playCancelSound();
      setMessage({ type: 'error', text: error.message });
    } else {
      playActionSound();
      setMessage({ type: 'success', text: 'Registration successful! Check your email.' });
    }
  };

  const handleLogout = async () => {
    playClickSound();
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  // --- NEW DIAGNOSTIC TOOL ---
  const runDiagnostics = async () => {
      playClickSound();
      setLoading(true);
      setDiagError(null);
      setShowSqlHelp(false);
      // Reset to initial progressive state
      setDiagSteps({ auth: 'pending', read: 'idle', write: 'idle' });

      try {
        // 1. Auth Check
        const authRes = await withTimeout(
            supabase.auth.getUser(), 
            TIMEOUT_MS, 
            lang === 'zh' ? '验证超时 (请检查网络/VPN)' : 'Auth check timed out (Check Network)'
        ) as any;
        const { data: { user: currentUser }, error: authError } = authRes;
        
        if (authError || !currentUser) {
            setDiagSteps({ auth: 'error', read: 'skipped', write: 'skipped' });
            throw new Error(lang === 'zh' ? '用户未登录' : 'User not logged in');
        }
        setDiagSteps({ auth: 'success', read: 'pending', write: 'idle' });

        // 2. Read Check
        const readRes = await withTimeout(
            supabase.from('pomodoro_logs').select('count', { count: 'exact', head: true }),
            TIMEOUT_MS,
            lang === 'zh' ? '读取超时 (Supabase 连接慢)' : 'Read check timed out (Slow Connection)'
        ) as any;
        const { error: readError } = readRes;

        if (readError) {
            setDiagSteps(prev => ({ ...prev, read: 'error', write: 'skipped' }));
            throw readError;
        }
        setDiagSteps(prev => ({ ...prev, read: 'success', write: 'pending' }));

        // 3. Write Check (The real test)
        const testId = generateUUID();
        const writeRes = await withTimeout(
            supabase.from('pomodoro_logs').insert({
                id: testId,
                user_id: currentUser.id,
                timestamp: Date.now(),
                type: 'TOMATO', // Use standard type to avoid constraint issues
                duration_minutes: 0,
                completed: false
            }),
            TIMEOUT_MS,
            lang === 'zh' ? '写入超时 (可能被 RLS 阻止)' : 'Write check timed out (Likely RLS Block)'
        ) as any;
        const { error: writeError } = writeRes;

        if (writeError) {
            setDiagSteps(prev => ({ ...prev, write: 'error' }));
            throw writeError;
        }
        
        setDiagSteps(prev => ({ ...prev, write: 'success' }));
        playActionSound();

        // Cleanup: Delete the test record (Don't await/block on this, fire and forget)
        supabase.from('pomodoro_logs').delete().eq('id', testId);

      } catch (err: any) {
          playCancelSound();
          console.error("Diagnostic failed", err);
          
          let msg = 'Unknown Error';

          // Robust Error Extraction
          if (typeof err === 'string') {
              msg = err;
          } else if (err?.message) {
              msg = err.message;
          } else if (err?.error_description) {
              msg = err.error_description;
          } else if (err?.details) {
              msg = err.details;
          } else {
              try {
                  msg = JSON.stringify(err);
                  if (msg === '{}') msg = 'Empty Error Object';
              } catch {
                  msg = 'Unreadable Error format';
              }
          }

          // Specific Handling for Network/Fetch errors
          if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
              msg = lang === 'zh' ? '网络连接失败 (请检查 VPN)' : 'Network Error (Check VPN)';
          }

          // Translate Specific Supabase Errors & Detect Schema Issues
          const schemaKeywords = ['schema cache', 'completed', 'column', 'relation', 'does not exist', 'invalid input syntax', 'uuid', 'bigint'];
          
          if (schemaKeywords.some(k => msg.toLowerCase().includes(k))) {
              msg = lang === 'zh' 
                  ? "数据库结构不匹配：请运行修复 SQL。" 
                  : "Schema Mismatch: Please run the fix SQL.";
              setShowSqlHelp(true);
          }
          else if (msg.includes('row-level security') || msg.includes('policy')) {
              msg = lang === 'zh' ? '写入失败: RLS 策略拒绝 (请运行 SQL)' : 'Write Failed: RLS Policy blocked insert';
              setShowSqlHelp(true);
          }
          
          setDiagError(msg);
      } finally {
          setLoading(false);
      }
  };

  // Helper for Status Icon
  const StatusIcon = ({ status }: { status: DiagStatus }) => {
      if (status === 'idle') return <div className="w-4 h-4 rounded-full border-2 border-gray-200"></div>;
      if (status === 'pending') return <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>;
      if (status === 'success') return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
      if (status === 'error') return <XIcon className="w-5 h-5 text-red-500" />;
      return <div className="w-4 h-4 rounded-full bg-gray-100 opacity-50"></div>; // skipped
  };

  return (
    <div className="w-full h-full flex flex-col p-6 animate-fade-in items-center justify-center font-nunito">
      
      {/* 3D Card */}
      <div className="w-full max-w-sm bg-white rounded-[40px] shadow-clay-card p-8 flex flex-col items-center border border-white/60 relative overflow-hidden">
        
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-transparent pointer-events-none"></div>

        {/* Icon */}
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 shadow-inner mb-6 relative z-10 border border-indigo-200">
          <UserIcon className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-black text-gray-800 mb-1 relative z-10">{t('auth_title', lang)}</h2>
        <p className="text-xs text-gray-400 font-bold mb-8 text-center relative z-10 max-w-[200px]">
          {user ? t('auth_desc_profile', lang) : t('auth_desc_login', lang)}
        </p>

        {user ? (
          // LOGGED IN STATE
          <div className="w-full flex flex-col gap-4 relative z-10 animate-fade-in">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-lg">
                 {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                 <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Signed in as</span>
                 <span className="text-sm font-bold text-gray-700 truncate">{user.email}</span>
              </div>
            </div>

            {/* DIAGNOSTIC PANEL */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-wide">
                        {lang === 'zh' ? '云端诊断' : 'Cloud Diagnostic'}
                    </span>
                    <button 
                        onClick={runDiagnostics} 
                        disabled={loading}
                        className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
                    >
                        {loading ? (lang === 'zh' ? '运行中...' : 'Running...') : (lang === 'zh' ? '运行诊断' : 'Run Check')}
                    </button>
                </div>
                
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white rounded-xl shadow-sm">
                        <span className="text-xs font-bold text-gray-600">Auth Token</span>
                        <StatusIcon status={diagSteps.auth} />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded-xl shadow-sm">
                        <span className={`text-xs font-bold ${diagSteps.read === 'skipped' ? 'text-gray-300' : 'text-gray-600'}`}>Read Access</span>
                        <StatusIcon status={diagSteps.read} />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded-xl shadow-sm">
                        <span className={`text-xs font-bold ${diagSteps.write === 'skipped' ? 'text-gray-300' : 'text-gray-600'}`}>Write Access (Insert)</span>
                        <StatusIcon status={diagSteps.write} />
                    </div>
                </div>

                {diagError && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded-lg text-[10px] font-bold text-red-500 text-center animate-bounce-in select-text break-all">
                        ❌ {diagError}
                    </div>
                )}
                
                {/* AUTO SQL HELPER */}
                {(showSqlHelp || diagError) && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left shadow-sm">
                      <p className="text-[10px] font-bold text-amber-800 mb-2 flex items-center gap-1">
                         ⚠️ {lang === 'zh' ? '数据库修复 SQL (复制并在 Supabase 运行)' : 'Database Fix SQL (Run in Supabase)'}
                      </p>
                      
                      <div className="bg-white border border-amber-100 p-2 rounded-lg relative group">
                          <textarea 
                            readOnly
                            value={CORRECT_SQL}
                            className="w-full h-24 text-[9px] font-mono text-gray-600 resize-none outline-none"
                          />
                          <button 
                            onClick={() => {
                                navigator.clipboard.writeText(CORRECT_SQL);
                                playActionSound();
                            }}
                            className="absolute top-2 right-2 bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-[9px] font-bold hover:bg-amber-300 active:scale-95 transition-all shadow-sm"
                          >
                              COPY SQL
                          </button>
                      </div>
                  </div>
                )}
            </div>

            <button 
                onClick={handleLogout}
                disabled={loading}
                className="w-full py-3 bg-white hover:bg-gray-100 text-gray-500 text-xs font-black rounded-2xl shadow-sm transition-all active:scale-95 border border-gray-200 mt-2"
            >
                {t('auth_logout', lang)}
            </button>
          </div>
        ) : (
          // LOGGED OUT STATE
          <div className="w-full flex flex-col gap-3 relative z-10 animate-fade-in">
             <div className="space-y-3">
                <input 
                  type="email" 
                  placeholder={t('auth_email', lang)}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-indigo-300 focus:shadow-sm transition-all placeholder:text-gray-300"
                />
                <input 
                  type="password" 
                  placeholder={t('auth_password', lang)}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-indigo-300 focus:shadow-sm transition-all placeholder:text-gray-300"
                />
             </div>

             <div className="grid grid-cols-2 gap-3 mt-2">
                <button 
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-2xl shadow-clay-btn transition-all active:scale-95 active:shadow-clay-btn-active border-t border-white/20"
                >
                   {loading ? '...' : t('auth_login', lang)}
                </button>
                <button 
                  onClick={handleSignUp}
                  disabled={loading}
                  className="w-full py-3 bg-white hover:bg-gray-50 text-indigo-500 font-black rounded-2xl shadow-sm border border-indigo-100 transition-all active:scale-95"
                >
                   {loading ? '...' : t('auth_signup', lang)}
                </button>
             </div>
          </div>
        )}

        {/* Feedback Toast */}
        {message && (
           <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl text-xs font-bold shadow-xl animate-bounce-in whitespace-nowrap z-50 border border-white/20 flex items-center justify-center ${
             message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
           }`}>
              {message.text}
           </div>
        )}

      </div>
    </div>
  );
};
