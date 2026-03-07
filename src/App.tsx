import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Calendar,
  TrendingUp,
  CreditCard,
  MessageSquare,
  Users,
  ClipboardCheck,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  ArrowUpRight,
  Menu,
  X,
  Send,
  Eye,
  EyeOff,
  Loader2,
  BellRing,
  Gift,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Auth Helpers ---
const TOKEN_KEY = 'wolves_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.reload();
  }
  return res;
}

// --- Push Notification Helpers ---
async function subscribeToPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const vapidRes = await authFetch('/api/push/vapid-key');
    const { publicKey } = await vapidRes.json();
    if (!publicKey) return;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await authFetch('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    });
  } catch (err) {
    console.warn('Push subscription failed:', err);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// --- Types ---
type Role = 'admin' | 'coach' | 'player';

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface Player extends User {
  group_name: string;
  sessions_remaining: number;
  balance: number;
  loyalty_points: number;
}

interface Session {
  id: number;
  group_name: string;
  coach_name: string;
  start_time: string;
  capacity: number;
}

// --- Components ---

const Card = ({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void, key?: any }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className} ${onClick ? 'cursor-pointer' : ''}`}
  >
    {children}
  </div>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = "" 
}: { 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost',
  onClick?: () => void,
  className?: string
}) => {
  const variants = {
    primary: 'bg-wolves-plum text-white hover:bg-wolves-plum-dark',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100'
  };

  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, color = 'blue' }: { children: React.ReactNode, color?: 'blue' | 'green' | 'red' | 'orange' }) => {
  const colors = {
    blue: 'bg-wolves-plum-light text-wolves-plum',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-wolves-gold-light text-wolves-gold'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
};

// --- Views ---

const ScheduleView = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  useEffect(() => {
    authFetch('/api/sessions').then(res => res.json()).then(setSessions);
  }, []);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); };

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const getSessionsForDay = (day: number, month: number, year: number) =>
    sessions.filter(s => {
      const d = new Date(s.start_time);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });

  const calendarDays: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < startOffset) {
      const day = daysInPrevMonth - startOffset + i + 1;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      calendarDays.push({ day, month: m, year: y, isCurrentMonth: false });
    } else if (i >= startOffset + daysInMonth) {
      const day = i - startOffset - daysInMonth + 1;
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      calendarDays.push({ day, month: m, year: y, isCurrentMonth: false });
    } else {
      calendarDays.push({ day: i - startOffset + 1, month: currentMonth, year: currentYear, isCurrentMonth: true });
    }
  }

  const isToday = (day: number, month: number, year: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const groupColor = (group: string) => {
    if (group.includes('1')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (group.includes('2')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const monthSessions = sessions
    .filter(s => {
      const d = new Date(s.start_time);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Academy Schedule</h1>
          <p className="text-gray-500 mt-1">Manage and view all basketball sessions</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Filter</Button>
          <Button><Plus size={18} /> Add Session</Button>
        </div>
      </header>

      <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{monthNames[currentMonth]} {currentYear}</h2>
          {(currentMonth !== today.getMonth() || currentYear !== today.getFullYear()) && (
            <button onClick={goToday} className="text-xs px-3 py-1 bg-wolves-plum text-white rounded-full hover:opacity-90 transition-opacity">
              Today
            </button>
          )}
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Desktop Calendar Grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center py-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{day}</span>
            </div>
          ))}
          {calendarDays.map((cd, i) => {
            const daySessions = getSessionsForDay(cd.day, cd.month, cd.year);
            const todayHighlight = isToday(cd.day, cd.month, cd.year);
            return (
              <div
                key={i}
                className={`min-h-[130px] rounded-xl p-2.5 transition-shadow border ${
                  cd.isCurrentMonth ? 'bg-white border-gray-100 hover:shadow-md' : 'bg-gray-50/50 border-transparent'
                } ${todayHighlight ? 'ring-2 ring-wolves-plum/30 border-wolves-plum/20' : ''}`}
              >
                <span className={`text-sm font-semibold inline-flex items-center justify-center ${
                  todayHighlight ? 'bg-wolves-plum text-white w-7 h-7 rounded-full' :
                  cd.isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  {cd.day}
                </span>
                <div className="mt-1.5 space-y-1">
                  {daySessions.map(s => (
                    <div key={s.id} className={`text-xs p-1.5 rounded-lg border font-medium ${groupColor(s.group_name)}`}>
                      <div className="font-bold">{formatTime(s.start_time)}</div>
                      <div className="truncate">{s.group_name} &bull; {s.coach_name || 'TBA'}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Agenda View */}
      <div className="md:hidden space-y-3">
        {monthSessions.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-gray-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">No sessions this month</p>
            </div>
          </Card>
        ) : (
          monthSessions.map(s => {
            const d = new Date(s.start_time);
            return (
              <Card key={s.id}>
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[50px]">
                    <div className="text-2xl font-bold text-gray-900">{d.getDate()}</div>
                    <div className="text-xs text-gray-400 uppercase">{d.toLocaleDateString('en', { weekday: 'short' })}</div>
                  </div>
                  <div className="h-12 w-px bg-gray-200" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${groupColor(s.group_name)}`}>{s.group_name}</span>
                      <span className="text-sm font-bold text-gray-900">{formatTime(s.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{s.coach_name || 'Coach TBA'}</span>
                      <span>&bull;</span>
                      <span>Capacity: {s.capacity}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

const PlayersView = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    authFetch('/api/players').then(res => res.json()).then(setPlayers);
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Player Directory</h1>
          <p className="text-gray-500 mt-1">Manage all 240+ academy members</p>
        </div>
        <Button className="whitespace-nowrap text-sm sm:text-base"><Plus size={18} /> <span className="hidden sm:inline">Register</span> Player</Button>
      </header>

      <Card>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div className="flex gap-2 sm:gap-4 overflow-x-auto">
            <Button variant="secondary" className="text-sm whitespace-nowrap">All Players</Button>
            <Button variant="ghost" className="text-sm whitespace-nowrap">Trial Requests</Button>
            <Button variant="ghost" className="text-sm whitespace-nowrap">Inactive</Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, or group..."
              className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-wolves-plum outline-none w-full sm:w-80"
            />
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-4 pr-4 whitespace-nowrap">Player</th>
                <th className="pb-4 pr-4 whitespace-nowrap">Group</th>
                <th className="pb-4 pr-4 whitespace-nowrap">Sessions</th>
                <th className="pb-4 pr-4 whitespace-nowrap">Balance</th>
                <th className="pb-4 pr-4 whitespace-nowrap">Loyalty</th>
                <th className="pb-4 pr-4 whitespace-nowrap">Status</th>
                <th className="pb-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {players.map(player => (
                <tr key={player.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-wolves-plum-light flex items-center justify-center text-wolves-plum font-bold">
                        {player.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{player.name}</p>
                        <p className="text-xs text-gray-500">{player.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4"><Badge color="blue">{player.group_name}</Badge></td>
                  <td className="py-4 font-medium">{player.sessions_remaining} left</td>
                  <td className="py-4 font-medium">JOD {player.balance}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-1 text-wolves-gold font-bold">
                      <Trophy size={14} /> {player.loyalty_points}
                    </div>
                  </td>
                  <td className="py-4">
                    <Badge color={player.sessions_remaining > 0 ? 'green' : 'red'}>
                      {player.sessions_remaining > 0 ? 'Active' : 'Expired'}
                    </Badge>
                  </td>
                  <td className="py-4 text-right">
                    <Button variant="ghost" className="p-2"><ChevronRight size={18} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const AttendanceView = ({ role }: { role: Role }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    authFetch('/api/sessions').then(res => res.json()).then(setSessions);
    authFetch('/api/players').then(res => res.json()).then(setPlayers);
  }, []);

  const markAttendance = async (playerId: number, status: 'present' | 'absent') => {
    if (!selectedSession) return;
    await authFetch('/api/attendance', {
      method: 'POST',
      body: JSON.stringify({ sessionId: selectedSession.id, playerId, status }),
    });
    // Refresh players to see session deduction
    authFetch('/api/players').then(res => res.json()).then(setPlayers);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Attendance Tracking</h1>
        <p className="text-gray-500 mt-1">Mark attendance for today's sessions</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Select Session</h2>
          {sessions.map(s => (
            <Card 
              key={s.id} 
              onClick={() => setSelectedSession(s)}
              className={`${selectedSession?.id === s.id ? 'border-wolves-plum ring-2 ring-wolves-plum/10' : ''}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">Group {s.group_name}</p>
                  <p className="text-sm text-gray-500">{new Date(s.start_time).toLocaleTimeString()}</p>
                </div>
                <Badge color="blue">{s.coach_name}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedSession ? (
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Roster: Group {selectedSession.group_name}</h2>
                <Button variant="outline" className="text-sm">Bulk Mark Present</Button>
              </div>
              <div className="space-y-4">
                {players.filter(p => p.group_name === selectedSession.group_name).map(player => (
                  <div key={player.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-wolves-plum-light flex items-center justify-center text-wolves-plum font-bold">
                        {player.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold">{player.name}</p>
                        <p className="text-xs text-gray-500">{player.sessions_remaining} sessions left</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="bg-white hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                        onClick={() => markAttendance(player.id, 'present')}
                      >
                        <CheckCircle2 size={18} /> Present
                      </Button>
                      <Button 
                        variant="outline" 
                        className="bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        onClick={() => markAttendance(player.id, 'absent')}
                      >
                        <XCircle size={18} /> Absent
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <ClipboardCheck size={48} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No Session Selected</h3>
              <p className="text-gray-500 max-w-xs">Select a session from the left to start marking attendance.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PerformanceView = ({ role, user }: { role: Role, user: User }) => {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Performance Analytics</h1>
        <p className="text-gray-500 mt-1">Track progress across all basketball metrics</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-6">Improvement Trends</h2>
          <div className="h-64 flex items-end gap-4 px-4">
            {[45, 60, 55, 80, 75, 90, 85].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  className="w-full bg-wolves-plum rounded-t-lg"
                />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Week {i+1}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold mb-6">Skill Breakdown</h2>
          <div className="space-y-6">
            {[
              { label: 'Shooting', value: 82 },
              { label: 'Dribbling', value: 75 },
              { label: 'Defense', value: 90 },
              { label: 'Court IQ', value: 68 },
              { label: 'Handles', value: 77 }
            ].map(skill => (
              <div key={skill.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{skill.label}</span>
                  <span className="font-bold">{skill.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-wolves-plum" style={{ width: `${skill.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Attendance Streak', value: '12 Days', icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Total Badges', value: '8 Earned', icon: Trophy, color: 'text-wolves-gold' },
          { label: 'Coach Rating', value: '4.8/5.0', icon: MessageSquare, color: 'text-wolves-plum' },
          { label: 'Rank in Group', value: '#3 of 24', icon: TrendingUp, color: 'text-wolves-rose' }
        ].map(stat => (
          <Card key={stat.label}>
            <stat.icon className={`${stat.color} mb-4`} size={24} />
            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

const PaymentsView = ({ role, user }: { role: Role, user: User }) => {
  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Financial Management</h1>
          <p className="text-gray-500 mt-1">Track payments, invoices, and academy revenue</p>
        </div>
        <Button><Plus size={18} /> New Payment</Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-6">Transaction History</h2>
          <div className="space-y-4">
            {[
              { id: 'TXN-9021', user: 'Zaid K.', amount: '45.00', method: 'CliQ', status: 'Completed', date: 'Today, 10:45' },
              { id: 'TXN-9020', user: 'Omar H.', amount: '45.00', method: 'Apple Pay', status: 'Completed', date: 'Yesterday, 16:20' },
              { id: 'TXN-9019', user: 'Laila S.', amount: '120.00', method: 'Credit Card', status: 'Pending', date: 'Yesterday, 09:15' },
              { id: 'TXN-9018', user: 'Ahmad J.', amount: '45.00', method: 'Cash', status: 'Completed', date: 'Mar 04, 18:00' }
            ].map(txn => (
              <div key={txn.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${txn.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-wolves-gold-light text-wolves-gold'}`}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{txn.user}</p>
                    <p className="text-xs text-gray-500">{txn.id} • {txn.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">JOD {txn.amount}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{txn.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="bg-wolves-plum text-white border-none">
            <h3 className="font-bold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button variant="secondary" className="w-full">Generate Invoice</Button>
              <Button variant="ghost" className="w-full text-white hover:bg-white/10">Export Report (CSV)</Button>
              <Button variant="ghost" className="w-full text-white hover:bg-white/10">Payment Reminders</Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold mb-4">Revenue by Method</h3>
            <div className="space-y-4">
              {[
                { label: 'CliQ', value: 45, color: 'bg-wolves-plum' },
                { label: 'Credit Card', value: 30, color: 'bg-wolves-rose' },
                { label: 'Apple Pay', value: 15, color: 'bg-wolves-plum-dark' },
                { label: 'Cash', value: 10, color: 'bg-wolves-copper' }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                  <span className="text-sm font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const SettingsView = ({ user }: { user: User }) => {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and academy preferences</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-24 h-24 rounded-3xl bg-wolves-plum-light flex items-center justify-center text-wolves-plum text-3xl font-bold mb-4">
                {user.name.charAt(0)}
              </div>
              <h3 className="text-xl font-bold">{user.name}</h3>
              <p className="text-gray-500 text-sm mb-6">{user.email}</p>
              <Button variant="outline" className="w-full">Edit Profile</Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold mb-4">Security</h3>
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start">Change Password</Button>
              <Button variant="ghost" className="w-full justify-start">Two-Factor Auth</Button>
              <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50">Deactivate Account</Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-lg font-bold mb-6">Academy Preferences</h3>
            <div className="space-y-6">
              {[
                { label: 'Push Notifications', desc: 'Receive alerts for upcoming sessions', enabled: true },
                { label: 'Email Reports', desc: 'Monthly performance and financial summaries', enabled: true },
                { label: 'WhatsApp Integration', desc: 'Receive schedule updates via WhatsApp', enabled: false },
                { label: 'Public Profile', desc: 'Allow other academy members to see your stats', enabled: true }
              ].map(pref => (
                <div key={pref.label} className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-900">{pref.label}</p>
                    <p className="text-sm text-gray-500">{pref.desc}</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${pref.enabled ? 'bg-wolves-plum' : 'bg-gray-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${pref.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline">Cancel</Button>
              <Button>Save Changes</Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold mb-4">Academy Info</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Location</p>
                <p className="text-sm font-medium">Amman, Jordan (Main Court)</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Timezone</p>
                <p className="text-sm font-medium">GMT+3 (Arabian Standard Time)</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Support Email</p>
                <p className="text-sm font-medium">support@wolves.jo</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Version</p>
                <p className="text-sm font-medium">v1.2.4 (Stable)</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    authFetch('/api/stats').then(res => res.json()).then(setStats);
    authFetch('/api/players').then(res => res.json()).then(setPlayers);
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Academy Overview</h1>
          <p className="text-gray-500 mt-1">Real-time performance metrics</p>
        </div>
        <Button><Plus size={18} /> New Session</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-wolves-plum-light rounded-lg text-wolves-plum">
              <Users size={20} />
            </div>
            <Badge color="green">+12%</Badge>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Total Players</h3>
          <p className="text-2xl font-bold mt-1">{stats?.totalPlayers?.count || 240}</p>
        </Card>
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <CreditCard size={20} />
            </div>
            <Badge color="blue">On Track</Badge>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Monthly Revenue</h3>
          <p className="text-2xl font-bold mt-1">JOD {stats?.totalRevenue?.total || '4,250'}</p>
        </Card>
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-wolves-gold-light rounded-lg text-wolves-gold">
              <Calendar size={20} />
            </div>
            <Badge color="orange">Busy</Badge>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Upcoming Sessions</h3>
          <p className="text-2xl font-bold mt-1">{stats?.upcomingSessions?.count || 18}</p>
        </Card>
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-wolves-rose/10 rounded-lg text-wolves-rose">
              <ClipboardCheck size={20} />
            </div>
            <Badge color="green">94%</Badge>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Avg Attendance</h3>
          <p className="text-2xl font-bold mt-1">94.2%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Player Management</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search players..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-wolves-plum outline-none w-full sm:w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-4 pr-4 whitespace-nowrap">Player</th>
                  <th className="pb-4 pr-4 whitespace-nowrap">Group</th>
                  <th className="pb-4 pr-4 whitespace-nowrap">Sessions</th>
                  <th className="pb-4 pr-4 whitespace-nowrap">Status</th>
                  <th className="pb-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {players.map(player => (
                  <tr key={player.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-wolves-plum-light flex items-center justify-center text-wolves-plum font-bold text-xs">
                          {player.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{player.name}</p>
                          <p className="text-xs text-gray-500">{player.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge color="blue">{player.group_name}</Badge>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{player.sessions_remaining}</span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-wolves-plum" 
                            style={{ width: `${(player.sessions_remaining / 12) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge color={player.sessions_remaining > 3 ? 'green' : 'red'}>
                        {player.sessions_remaining > 3 ? 'Active' : 'Low Balance'}
                      </Badge>
                    </td>
                    <td className="py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
          <div className="space-y-6">
            {[
              { type: 'payment', user: 'Zaid K.', msg: 'Renewed membership (JOD 45)', time: '2m ago' },
              { type: 'attendance', user: 'Coach Sam', msg: 'Marked attendance for G1', time: '15m ago' },
              { type: 'trial', user: 'Omar H.', msg: 'New trial request approved', time: '1h ago' },
              { type: 'performance', user: 'Coach Mike', msg: 'Updated ratings for G2', time: '3h ago' }
            ].map((activity, i) => (
              <div key={i} className="flex gap-4">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'payment' ? 'bg-wolves-copper' :
                  activity.type === 'attendance' ? 'bg-wolves-plum' : 'bg-wolves-gold'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.msg}</p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="w-full mt-8 text-sm">View All Activity</Button>
        </Card>
      </div>

      {/* Send Notification Panel */}
      <SendNotificationPanel players={players} />
    </div>
  );
};

const SendNotificationPanel = ({ players }: { players: Player[] }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'group' | 'user'>('all');
  const [targetGroup, setTargetGroup] = useState('G1');
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSend = async () => {
    if (!title.trim()) return;
    setSending(true);
    setResult(null);

    const payload: any = { title: title.trim(), body: body.trim() };
    if (target === 'group') payload.targetGroup = targetGroup;
    if (target === 'user' && targetUserId) payload.targetUserIds = [targetUserId];

    try {
      const res = await authFetch('/api/push/send', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Sent to ${data.sent} device(s)${data.failed ? `, ${data.failed} failed` : ''}`);
        setTitle('');
        setBody('');
      } else {
        setResult(data.error || 'Failed to send');
      }
    } catch {
      setResult('Network error');
    } finally {
      setSending(false);
    }
  };

  const groups = [...new Set(players.map(p => p.group_name).filter(Boolean))];

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-wolves-plum-light rounded-lg text-wolves-plum">
          <BellRing size={20} />
        </div>
        <h2 className="text-xl font-bold">Send Notification</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Send To</label>
          <div className="flex gap-2">
            {(['all', 'group', 'user'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  target === t
                    ? 'bg-wolves-plum text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'all' ? 'Everyone' : t === 'group' ? 'Group' : 'Player'}
              </button>
            ))}
          </div>
        </div>

        {target === 'group' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Group</label>
            <select
              value={targetGroup}
              onChange={e => setTargetGroup(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl"
            >
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}

        {target === 'user' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Player</label>
            <select
              value={targetUserId || ''}
              onChange={e => setTargetUserId(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl"
            >
              <option value="">Choose a player...</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Session Reminder"
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-wolves-plum outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
          <input
            type="text"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="e.g. Don't forget your session at 5 PM!"
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-wolves-plum outline-none"
          />
        </div>

        {result && (
          <div className={`text-sm p-3 rounded-xl ${result.startsWith('Sent') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {result}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim()}
          className="w-full bg-wolves-plum text-white hover:bg-wolves-plum-dark rounded-xl px-6 py-3 font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {sending ? 'Sending...' : 'Send Notification'}
        </button>
      </div>
    </Card>
  );
};

const CoachView = ({ user }: { user: User }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    authFetch('/api/sessions').then(res => res.json()).then(setSessions);
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Coach Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user.name}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold">Today's Sessions</h2>
          {sessions.map(session => (
            <Card key={session.id} className="hover:border-wolves-peach transition-colors cursor-pointer" onClick={() => setSelectedSession(session)}>
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="p-3 bg-wolves-plum-light rounded-xl text-wolves-plum">
                    <Clock size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">Group {session.group_name}</h3>
                      <Badge color="blue">Basketball</Badge>
                    </div>
                    <p className="text-gray-500 text-sm">
                      {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {session.capacity} Players
                    </p>
                  </div>
                </div>
                <Button variant="outline">Mark Attendance</Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold">Quick Performance Entry</h2>
          <Card>
            <p className="text-sm text-gray-500 mb-4">Select a session to start rating players</p>
            <div className="space-y-4 opacity-50 pointer-events-none">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
          </Card>
          
          <Card className="bg-wolves-plum text-white border-none">
            <h3 className="font-bold mb-2">My Payouts</h3>
            <p className="text-wolves-plum-light text-sm mb-4">You have 12 unclaimed sessions this month.</p>
            <div className="text-2xl font-bold mb-4">JOD 180.00</div>
            <Button variant="secondary" className="w-full">Claim All Sessions</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

const PlayerView = ({ user }: { user: User }) => {
  const [playerData, setPlayerData] = useState<Player | null>(null);

  useEffect(() => {
    authFetch('/api/players').then(res => res.json()).then(players => {
      const p = players.find((pl: any) => pl.id === user.id || pl.user_id === user.id);
      setPlayerData(p);
    });
  }, [user.id]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Welcome, {user.name}</h1>
          <p className="text-gray-500 mt-1">Group {playerData?.group_name || 'G1'} • Wolves Academy</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loyalty Points</p>
          <p className="text-xl font-bold text-wolves-plum">{playerData?.loyalty_points || 0}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-gradient-to-br from-wolves-copper to-wolves-plum text-white border-none relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-lg font-medium text-wolves-plum-light mb-1">Sessions Remaining</h2>
            <div className="text-4xl sm:text-5xl font-bold mb-6">{playerData?.sessions_remaining || 0}</div>
            <div className="flex gap-3">
              <Button variant="secondary">Renew Package</Button>
              <Button variant="ghost" className="text-white hover:bg-white/10">Freeze Account</Button>
            </div>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
            <LayoutDashboard size={200} />
          </div>
        </Card>

        <Card>
          <h3 className="font-bold mb-4">Upcoming Session</h3>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Calendar size={18} className="text-wolves-plum" />
              </div>
              <div>
                <p className="text-sm font-bold">Tomorrow, 17:00</p>
                <p className="text-xs text-gray-500">Main Court • Amman</p>
              </div>
            </div>
            <Button variant="outline" className="w-full text-sm">Request Swap</Button>
          </div>
          <p className="text-xs text-gray-400 text-center">Next session in 22 hours</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Performance Stats</h2>
            <Button variant="ghost" className="text-sm">View History <ChevronRight size={14} /></Button>
          </div>
          <div className="space-y-6">
            {[
              { label: 'Shooting', value: 85, color: 'bg-wolves-plum' },
              { label: 'Dribbling', value: 72, color: 'bg-wolves-copper' },
              { label: 'Footwork', value: 90, color: 'bg-wolves-gold' },
              { label: 'IQ', value: 65, color: 'bg-wolves-rose' }
            ].map(stat => (
              <div key={stat.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{stat.label}</span>
                  <span className="font-bold">{stat.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.value}%` }}
                    className={`h-full ${stat.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold mb-6">Recent Payments</h2>
          <div className="space-y-4">
            {[
              { id: '#INV-2024-001', date: 'Mar 01, 2024', amount: '45.00', status: 'Paid' },
              { id: '#INV-2024-002', date: 'Feb 01, 2024', amount: '45.00', status: 'Paid' },
              { id: '#INV-2024-003', date: 'Jan 01, 2024', amount: '45.00', status: 'Paid' }
            ].map(inv => (
              <div key={inv.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div>
                  <p className="text-sm font-bold">{inv.id}</p>
                  <p className="text-xs text-gray-500">{inv.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">JOD {inv.amount}</p>
                  <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">{inv.status}</p>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-6">Download Full History</Button>
        </Card>
      </div>

      {/* Refer a Friend */}
      <ReferFriendCard />
    </div>
  );
};

// --- Refer a Friend Card (for Players) ---

const ReferFriendCard = () => {
  const [referralData, setReferralData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    authFetch('/api/referral/code').then(r => r.json()).then(setReferralData);
    authFetch('/api/referral/stats').then(r => r.json()).then(setStats);
  }, []);

  const copyLink = () => {
    if (referralData?.shareUrl) {
      navigator.clipboard.writeText(referralData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!referralData) return null;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-wolves-gold-light rounded-lg text-wolves-gold">
          <Users size={20} />
        </div>
        <h2 className="text-xl font-bold">Refer a Friend</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Share your code and earn <strong>+2 free sessions</strong> for every friend who joins!</p>

      <div className="bg-gray-50 rounded-2xl p-4 text-center mb-4">
        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Your Referral Code</p>
        <p className="text-3xl font-bold text-wolves-plum tracking-widest">{referralData.code}</p>
      </div>

      <div className="flex gap-2 mb-6">
        <a
          href={referralData.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-[#25D366] text-white rounded-xl px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <MessageSquare size={16} /> WhatsApp
        </a>
        <button
          onClick={copyLink}
          className="flex-1 bg-gray-100 text-gray-700 rounded-xl px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
        >
          {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <ChevronRight size={16} />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      {stats && (
        <div className="flex gap-4 text-center">
          <div className="flex-1 bg-wolves-plum-light rounded-xl p-3">
            <p className="text-2xl font-bold text-wolves-plum">{stats.totalReferred}</p>
            <p className="text-xs text-gray-500">Friends Referred</p>
          </div>
          <div className="flex-1 bg-wolves-gold-light rounded-xl p-3">
            <p className="text-2xl font-bold text-wolves-gold">{stats.totalSessionsEarned}</p>
            <p className="text-xs text-gray-500">Sessions Earned</p>
          </div>
        </div>
      )}

      {stats?.referrals?.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Referrals</p>
          {stats.referrals.map((r: any) => (
            <div key={r.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium">{r.referred_name}</p>
                <p className="text-xs text-gray-400">{r.referred_email}</p>
              </div>
              <Badge color={r.status === 'rewarded' ? 'green' : r.status === 'pending' ? 'orange' : 'blue'}>
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// --- Admin Referrals View ---

const ReferralsView = () => {
  const [data, setData] = useState<any>(null);
  const [approving, setApproving] = useState<number | null>(null);

  const loadData = () => {
    authFetch('/api/referral/list').then(r => r.json()).then(setData);
  };

  useEffect(() => { loadData(); }, []);

  const approveReferral = async (referralId: number) => {
    setApproving(referralId);
    try {
      const res = await authFetch('/api/referral/approve', {
        method: 'POST',
        body: JSON.stringify({ referralId }),
      });
      if (res.ok) loadData();
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Referral Management</h1>
        <p className="text-gray-500 mt-1">Track referrals and approve rewards</p>
      </header>

      {data?.stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">Total Referrals</h3>
            <p className="text-2xl font-bold mt-1">{data.stats.total}</p>
          </Card>
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">Pending</h3>
                <p className="text-2xl font-bold mt-1">{data.stats.pending}</p>
              </div>
              <Badge color="orange">Needs Action</Badge>
            </div>
          </Card>
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">Rewarded</h3>
            <p className="text-2xl font-bold mt-1">{data.stats.rewarded}</p>
          </Card>
        </div>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-6">All Referrals</h2>
        {!data?.referrals?.length ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium">No referrals yet</p>
            <p className="text-sm mt-1">Players can share their referral codes to invite new members</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.referrals.map((r: any) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-wolves-plum-light flex items-center justify-center text-wolves-plum font-bold text-xs">
                      {r.referrer_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.referrer_name}</p>
                      <p className="text-xs text-gray-400">Referrer</p>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="text-gray-300" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-wolves-gold-light flex items-center justify-center text-wolves-copper font-bold text-xs">
                      {r.referred_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.referred_name}</p>
                      <p className="text-xs text-gray-400">{r.referred_email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={r.status === 'rewarded' ? 'green' : 'orange'}>
                    {r.status === 'rewarded' ? 'Rewarded' : 'Pending'}
                  </Badge>
                  {r.status === 'pending' && (
                    <button
                      onClick={() => approveReferral(r.id)}
                      disabled={approving === r.id}
                      className="bg-wolves-plum text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-wolves-plum-dark transition-all disabled:opacity-60 flex items-center gap-1"
                    >
                      {approving === r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// --- Chatbot ---

const Chatbot = ({ userId }: { userId: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string, isBot: boolean }[]>([
    { text: "Hi! I'm the Wolves AI assistant. How can I help you today?", isBot: true }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { text: userMsg, isBot: false }]);
    setIsTyping(true);

    try {
      const res = await authFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { text: data.text, isBot: true }]);
    } catch (err) {
      setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting right now.", isBot: true }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-4 md:bottom-8 md:right-8 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-[calc(100vw-2rem)] sm:w-96 h-[70vh] sm:h-[500px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-wolves-plum text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm">Wolves AI</p>
                  <p className="text-[10px] text-wolves-plum-light">Online • Amman, Jordan</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.isBot ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-wolves-plum text-white rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none flex gap-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your balance, schedule..."
                className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-wolves-plum"
              />
              <button 
                onClick={handleSend}
                className="p-2 bg-wolves-plum text-white rounded-xl hover:bg-wolves-plum-dark transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-wolves-plum text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-wolves-plum-dark transition-all active:scale-90"
      >
        <MessageSquare size={24} />
      </button>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && !isSidebarOpen) setIsSidebarOpen(true);
      if (mobile) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handler);
    handler();
    return () => window.removeEventListener('resize', handler);
  }, []);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Referral registration state
  const [showRegister, setShowRegister] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Detect ?ref=CODE in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setRefCode(ref.toUpperCase());
      setShowRegister(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    setRegLoading(true);
    try {
      const res = await fetch('/api/referral/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName.trim(), email: regEmail.trim(), phone: regPhone.trim() || undefined, password: regPassword, referralCode: refCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setRegError(data.error || 'Registration failed'); return; }
      setRegSuccess(data.message || 'Registration successful! You can now log in.');
      setRegName(''); setRegEmail(''); setRegPhone(''); setRegPassword(''); setRefCode('');
    } catch {
      setRegError('Network error. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // Check for existing token on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      authFetch('/api/auth/me')
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          setUser(data.user as User);
          setActiveTab('Dashboard');
          // Subscribe to push after restoring session
          if ('Notification' in window && Notification.permission === 'granted') {
            subscribeToPush();
          }
        })
        .catch(() => clearToken())
        .finally(() => setIsCheckingAuth(false));
    } else {
      setIsCheckingAuth(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'Login failed');
        setLoginLoading(false);
        return;
      }

      setToken(data.token);
      setUser(data.user as User);
      setActiveTab('Dashboard');

      // Request push notification permission
      if ('Notification' in window && 'serviceWorker' in navigator) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          await subscribeToPush();
        }
      }
    } catch {
      setLoginError('Network error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setActiveTab('Dashboard');
    setLoginEmail('');
    setLoginPassword('');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-wolves-plum animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-4 sm:p-6" style={{ paddingTop: 'env(safe-area-inset-top, 16px)' }}>
        <Card className="max-w-md w-full p-6 sm:p-8 text-center">
          <img src="/wolves-logo.png" alt="Wolves Academy" className="w-20 h-20 rounded-3xl mx-auto mb-6 object-cover" />
          <h1 className="text-2xl font-bold mb-2">Wolves Sports Academy</h1>
          <p className="text-gray-500 mb-8">Digital Transformation Platform</p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-wolves-plum focus:border-transparent outline-none"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-wolves-plum focus:border-transparent outline-none pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{loginError}</div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-wolves-plum text-white hover:bg-wolves-plum-dark rounded-xl px-6 py-3 font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loginLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="text-sm text-wolves-plum font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <UserPlus size={14} /> Have a referral code? Register here
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-400">Amman, Jordan • Wolves Sports Academy</p>
        </Card>

        {/* Registration Modal */}
        <AnimatePresence>
          {showRegister && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={(e) => { if (e.target === e.currentTarget) setShowRegister(false); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <Card className="max-w-md w-full p-6 sm:p-8 relative">
                  <button onClick={() => setShowRegister(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1">
                    <X size={20} />
                  </button>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-wolves-plum-light rounded-lg text-wolves-plum">
                      <UserPlus size={20} />
                    </div>
                    <h2 className="text-xl font-bold">Join Wolves Academy</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">Register with a referral code to get a bonus session!</p>

                  {regSuccess ? (
                    <div className="text-center py-4">
                      <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
                      <p className="text-green-600 font-medium mb-4">{regSuccess}</p>
                      <button onClick={() => { setShowRegister(false); setRegSuccess(''); }} className="bg-wolves-plum text-white rounded-xl px-6 py-3 font-semibold hover:bg-wolves-plum-dark transition-all">
                        Go to Login
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-3 text-left">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code</label>
                        <input
                          type="text"
                          value={refCode}
                          onChange={e => setRefCode(e.target.value.toUpperCase())}
                          placeholder="WLV-XXXX"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-wolves-plum focus:border-transparent outline-none font-mono tracking-wider"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={regName}
                          onChange={e => setRegName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-wolves-plum focus:border-transparent outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-wolves-plum focus:border-transparent outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400">(optional)</span></label>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={e => setRegPhone(e.target.value)}
                          placeholder="+962 7X XXX XXXX"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-wolves-plum focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          placeholder="Create a password"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-wolves-plum focus:border-transparent outline-none"
                          required
                          minLength={6}
                        />
                      </div>
                      {regError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{regError}</div>}
                      <button
                        type="submit"
                        disabled={regLoading}
                        className="w-full bg-wolves-plum text-white hover:bg-wolves-plum-dark rounded-xl px-6 py-3 font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                      >
                        {regLoading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                        {regLoading ? 'Registering...' : 'Register'}
                      </button>
                    </form>
                  )}
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'coach', 'player'] },
    { icon: Calendar, label: 'Schedule', roles: ['admin', 'coach', 'player'] },
    { icon: Users, label: 'Players', roles: ['admin'] },
    { icon: ClipboardCheck, label: 'Attendance', roles: ['admin', 'coach'] },
    { icon: TrendingUp, label: 'Performance', roles: ['admin', 'coach', 'player'] },
    { icon: CreditCard, label: 'Payments', roles: ['admin', 'player'] },
    { icon: Gift, label: 'Referrals', roles: ['admin'] },
    { icon: Settings, label: 'Settings', roles: ['admin', 'coach', 'player'] },
  ].filter(item => item.roles.includes(user.role));

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        if (user.role === 'admin') return <AdminDashboard />;
        if (user.role === 'coach') return <CoachView user={user} />;
        return <PlayerView user={user} />;
      case 'Schedule':
        return <ScheduleView />;
      case 'Players':
        return <PlayersView />;
      case 'Attendance':
        return <AttendanceView role={user.role} />;
      case 'Performance':
        return <PerformanceView role={user.role} user={user} />;
      case 'Payments':
        return <PaymentsView role={user.role} user={user} />;
      case 'Referrals':
        return <ReferralsView />;
      case 'Settings':
        return <SettingsView user={user} />;
      default:
        return <AdminDashboard />;
    }
  };

  const handleNavClick = (label: string) => {
    setActiveTab(label);
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FA] flex">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isMobile ? 280 : (isSidebarOpen ? 280 : 80),
          x: isMobile ? (isSidebarOpen ? 0 : -280) : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white border-r border-gray-100 flex flex-col fixed h-full z-50"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="p-6 flex items-center justify-between">
          {(isSidebarOpen || isMobile) && (
            <div className="flex items-center gap-3">
              <img src="/wolves-logo.png" alt="Wolves" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-bold text-lg tracking-tight">Wolves</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 min-w-[44px] min-h-[44px] flex items-center justify-center">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => handleNavClick(item.label)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all group min-h-[44px] ${
                activeTab === item.label ? 'bg-wolves-plum-light text-wolves-plum' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} className={activeTab === item.label ? 'text-wolves-plum' : 'group-hover:text-wolves-plum'} />
              {(isSidebarOpen || isMobile) && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all min-h-[44px]"
          >
            <XCircle size={20} />
            {(isSidebarOpen || isMobile) && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : (isSidebarOpen ? 'ml-[280px]' : 'ml-[80px]')}`}>
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 min-h-16 md:min-h-20" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center">
                <Menu size={22} />
              </button>
            )}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search anything..."
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-wolves-plum outline-none w-48 md:w-64"
              />
            </div>
            {isMobile && (
              <div className="flex items-center gap-2">
                <img src="/wolves-logo.png" alt="Wolves" className="w-7 h-7 rounded-md object-cover" />
                <span className="font-bold text-sm tracking-tight">Wolves</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-6 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{user.name}</p>
                <p className="text-[10px] font-bold text-wolves-plum uppercase tracking-widest">{user.role}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-wolves-plum-light flex items-center justify-center text-wolves-plum font-bold">
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </nav>

        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
          {renderContent()}
        </div>
      </main>

      <Chatbot userId={user.id} />
    </div>
  );
}
