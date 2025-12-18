
import React, { useState } from 'react';
import { 
  Search, 
  Settings, 
  History, 
  Globe, 
  Cpu, 
  LogOut, 
  CreditCard,
  ChevronRight,
  Database,
  Languages,
  Trash2,
  ExternalLink,
  Plus,
  Zap,
  Clock,
  LayoutGrid,
  SunMoon,
  Workflow
} from 'lucide-react';
import { User, HistoryItem, MiningStep, Task } from './types';

// Mock Data
const MOCK_USER: User = {
  id: 'u1',
  name: '本地开发用户',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop',
  credits: 12450,
  role: 'Professional Plan',
  isLoggedIn: true
};

const MOCK_TASKS: Task[] = [
  { id: 't1', name: '挖掘 #2', status: 'running', progress: 65 },
  { id: 't2', name: '挖掘 #1', status: 'completed', progress: 100 },
];

const MOCK_HISTORY: HistoryItem[] = [
  { id: 'h1', keyword: '云顶s16诺克萨斯', language: 'JA', timestamp: '2025/12/18 07:14:40', count: 20 },
  { id: 'h2', keyword: 'sustainable coffee packaging', language: 'EN', timestamp: '2025/12/17 14:22:10', count: 25 },
];

const App: React.FC = () => {
  const [user] = useState<User>(MOCK_USER);
  const [currentStep] = useState<MiningStep>(MiningStep.INPUT);
  const [tasks] = useState<Task[]>(MOCK_TASKS);
  const [history] = useState<HistoryItem[]>(MOCK_HISTORY);
  const [activeTaskId, setActiveTaskId] = useState('t1');
  const [activeMode, setActiveMode] = useState('mining');

  return (
    <div className="flex h-screen bg-[#050505] text-[#e5e5e5] overflow-hidden">
      
      {/* Sidebar: Task List & Options */}
      <aside className="w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center">
              <Database className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-widest text-white leading-none">NICHE MINING</h1>
              <p className="text-[9px] text-emerald-500 font-bold tracking-tight uppercase mt-1">Google SEO Agent</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
          {/* Active Tasks Section */}
          <div>
            <div className="flex items-center justify-between px-3 mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">进行中的任务</span>
              <button className="text-emerald-500 hover:text-emerald-400 p-1">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {tasks.map(task => (
                <button 
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`w-full group flex items-center justify-between p-3 rounded transition-all border ${
                    activeTaskId === task.id 
                    ? 'bg-white/5 border-white/10' 
                    : 'border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Search size={14} className={activeTaskId === task.id ? 'text-emerald-500' : 'text-neutral-600'} />
                    <span className={`text-xs font-bold ${activeTaskId === task.id ? 'text-white' : 'text-neutral-400'}`}>
                      {task.name}
                    </span>
                  </div>
                  {activeTaskId === task.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Options Section */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 px-3 block mb-4">配置选项</span>
            <div className="space-y-1">
              <SidebarLink icon={<Workflow size={14}/>} label="工作流编排" />
              <SidebarLink icon={<Languages size={14}/>} label="中英切换" />
              <SidebarLink icon={<SunMoon size={14}/>} label="日夜间主题" />
            </div>
          </div>
        </div>

        {/* Bottom Status */}
        <div className="p-4 border-t border-white/5 text-[10px] font-bold text-neutral-600 uppercase tracking-widest text-center">
          V2.8.5 System Online
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header: Process Indicators & User Info */}
        <header className="h-16 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
          {/* 3-Step Process Indicator */}
          <div className="flex items-center space-x-8">
            <StepItem number={1} label="输入" active={currentStep === MiningStep.INPUT} />
            <ChevronRight size={14} className="text-neutral-800" />
            <StepItem number={2} label="挖掘循环" active={currentStep === MiningStep.MINING} />
            <ChevronRight size={14} className="text-neutral-800" />
            <StepItem number={3} label="结果" active={currentStep === MiningStep.RESULTS} />
          </div>

          <div className="flex items-center space-x-6">
            {/* Credit Points */}
            <div className="flex items-center space-x-3 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded">
               <div className="p-1 bg-emerald-500/10 rounded">
                 <CreditCard size={14} className="text-emerald-500" />
               </div>
               <div className="flex flex-col">
                 <span className="text-xs font-black mono text-white leading-none tracking-tight">{user.credits.toLocaleString()}</span>
                 <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter mt-0.5">可用点数</span>
               </div>
               <div className="w-[1px] h-6 bg-white/10 mx-2" />
               <button className="text-[9px] font-black text-neutral-400 hover:text-white uppercase tracking-widest">充值</button>
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-4 border-l border-white/5 pl-6">
               <div className="text-right">
                 <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                 <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest mt-1">已登录</p>
               </div>
               <img src={user.avatar} className="w-8 h-8 rounded border border-white/10" alt="avatar" />
               <button className="p-2 text-neutral-500 hover:text-white transition-colors">
                 <LogOut size={16} />
               </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-grid-40">
          <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
            
            {/* Hero Text */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black text-white tracking-tight">Define Your <span className="text-emerald-500">Niche</span></h2>
              <p className="text-neutral-400 text-sm max-w-xl mx-auto leading-relaxed">
                Enter a seed keyword. The Agent will iterate until it finds a HIGH probability "Blue Ocean" keyword or "Weak Competitor" gap.
              </p>
            </div>

            {/* Mode Switcher & Search Bar */}
            <div className="space-y-6">
              {/* Mode Selection Tabs */}
              <div className="flex items-center justify-center space-x-1 p-1 bg-white/5 border border-white/5 rounded-lg w-fit mx-auto">
                <TabButton label="关键词挖掘" active={activeMode === 'mining'} onClick={() => setActiveMode('mining')} />
                <TabButton label="翻译分析" active={activeMode === 'translation'} onClick={() => setActiveMode('translation')} />
                <TabButton label="深度策略" active={activeMode === 'strategy'} onClick={() => setActiveMode('strategy')} />
              </div>

              {/* Main Search Bar */}
              <div className="bg-[#0f0f0f] border border-white/10 p-1.5 rounded-xl shadow-2xl flex flex-col md:flex-row gap-2">
                 <div className="md:w-48 bg-white/5 rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-white/5">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <Globe size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-[11px] font-bold text-white truncate">Japanese (Jp)</span>
                    </div>
                    <ChevronRight size={14} className="text-neutral-700 shrink-0" />
                 </div>
                 <div className="flex-1 bg-white/5 rounded-lg flex items-center px-4 focus-within:bg-black border border-transparent focus-within:border-emerald-500/30 transition-all">
                    <Search className="text-neutral-600" size={18} />
                    <input 
                      type="text" 
                      placeholder="输入关键词 (例如: 拖拉机配件)"
                      className="bg-transparent border-none outline-none text-white w-full text-sm font-medium px-4 h-14 placeholder:text-neutral-700"
                    />
                 </div>
                 <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-10 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-emerald-900/10 active:scale-[0.98]">
                    开始挖掘
                 </button>
              </div>
            </div>

            {/* Mining Settings Section */}
            <section className="space-y-4">
               <div className="flex items-center space-x-2 px-2">
                 <Settings size={14} className="text-emerald-500" />
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">挖词设置</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingField 
                    title="每轮词语数" 
                    value="10" 
                    desc="范围: 5-20"
                    icon={<Cpu size={14}/>}
                  />
                  <SettingField 
                    title="挖掘策略" 
                    value="横向挖掘 (广泛主题)" 
                    desc="探索不同的平行主题"
                    icon={<LayoutGrid size={14}/>}
                    isSelect
                  />
               </div>
            </section>

            {/* History List */}
            <section className="space-y-4">
              <div className="flex items-center space-x-2 px-2">
                <History size={14} className="text-emerald-500" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">挖掘历史</h3>
              </div>
              <div className="space-y-2">
                {history.map(item => (
                  <div key={item.id} className="group flex items-center justify-between p-4 bg-[#0a0a0a] border border-white/5 rounded-lg hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded bg-neutral-900 border border-white/10 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-all">
                        <Search size={16} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                           <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{item.keyword}</span>
                           <span className="px-1.5 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase">{item.language}</span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-[10px] text-neutral-600 mono">{item.timestamp}</span>
                          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{item.count} keywords discovered</span>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

// --- Helper Components ---

const SidebarLink: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <button className="w-full flex items-center space-x-3 px-3 py-2 rounded text-neutral-500 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider">
    <span className="shrink-0 opacity-60 group-hover:opacity-100">{icon}</span>
    <span>{label}</span>
  </button>
);

const StepItem: React.FC<{ number: number; label: string; active: boolean }> = ({ number, label, active }) => (
  <div className={`flex items-center space-x-3 transition-all ${active ? 'opacity-100' : 'opacity-30'}`}>
    <div className={`text-xs font-black ${active ? 'text-emerald-500' : 'text-neutral-500'}`}>{number}.</div>
    <span className={`text-xs font-bold tracking-widest uppercase ${active ? 'text-white' : 'text-neutral-600'}`}>{label}</span>
  </div>
);

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2 text-[11px] font-black uppercase tracking-widest rounded-md transition-all ${
      active 
      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
      : 'text-neutral-500 hover:text-white'
    }`}
  >
    {label}
  </button>
);

const SettingField: React.FC<{ title: string; value: string; desc: string; icon: React.ReactNode; isSelect?: boolean }> = ({ title, value, desc, icon, isSelect }) => (
  <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-lg hover:border-white/10 transition-all">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2">
        <span className="text-emerald-500 opacity-70">{icon}</span>
        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{title}</span>
      </div>
    </div>
    <div className={`w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 flex items-center justify-between transition-all ${isSelect ? 'cursor-pointer hover:bg-white/10' : ''}`}>
       <span className="text-xs font-bold text-white tracking-wider">{value}</span>
       {isSelect && <ChevronRight size={14} className="rotate-90 text-neutral-600" />}
    </div>
    <p className="mt-2 text-[10px] text-neutral-600 font-medium">{desc}</p>
  </div>
);

export default App;
