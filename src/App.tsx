import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  ArrowUpRight,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
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
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600'
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
  useEffect(() => {
    fetch('/api/sessions').then(res => res.json()).then(setSessions);
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Academy Schedule</h1>
          <p className="text-gray-500 mt-1">Manage and view all basketball sessions</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Filter</Button>
          <Button><Plus size={18} /> Add Session</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center py-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{day}</span>
          </div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => {
          const daySessions = sessions.filter(s => new Date(s.start_time).getDate() === (i % 31) + 1);
          return (
            <div key={i} className="min-h-[120px] bg-white border border-gray-100 rounded-xl p-2 hover:shadow-md transition-shadow">
              <span className="text-xs font-medium text-gray-400">{(i % 31) + 1}</span>
              <div className="mt-2 space-y-1">
                {daySessions.map(s => (
                  <div key={s.id} className="text-[10px] p-1 bg-blue-50 text-blue-600 rounded font-bold truncate">
                    {new Date(s.start_time).getHours()}:00 - {s.group_name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlayersView = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    fetch('/api/players').then(res => res.json()).then(setPlayers);
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Player Directory</h1>
          <p className="text-gray-500 mt-1">Manage all 240+ academy members</p>
        </div>
        <Button><Plus size={18} /> Register Player</Button>
      </header>

      <Card>
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <Button variant="secondary" className="text-sm">All Players</Button>
            <Button variant="ghost" className="text-sm">Trial Requests</Button>
            <Button variant="ghost" className="text-sm">Inactive</Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, email, or group..." 
              className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-80"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-4">Player</th>
                <th className="pb-4">Group</th>
                <th className="pb-4">Sessions</th>
                <th className="pb-4">Balance</th>
                <th className="pb-4">Loyalty</th>
                <th className="pb-4">Status</th>
                <th className="pb-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {players.map(player => (
                <tr key={player.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
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
                    <div className="flex items-center gap-1 text-orange-500 font-bold">
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
    fetch('/api/sessions').then(res => res.json()).then(setSessions);
    fetch('/api/players').then(res => res.json()).then(setPlayers);
  }, []);

  const markAttendance = async (playerId: number, status: 'present' | 'absent') => {
    if (!selectedSession) return;
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: selectedSession.id, playerId, status })
    });
    // Refresh players to see session deduction
    fetch('/api/players').then(res => res.json()).then(setPlayers);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendance Tracking</h1>
        <p className="text-gray-500 mt-1">Mark attendance for today's sessions</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Select Session</h2>
          {sessions.map(s => (
            <Card 
              key={s.id} 
              onClick={() => setSelectedSession(s)}
              className={`${selectedSession?.id === s.id ? 'border-blue-500 ring-2 ring-blue-500/10' : ''}`}
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
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Performance Analytics</h1>
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
                  className="w-full bg-blue-500 rounded-t-lg"
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
                  <div className="h-full bg-blue-500" style={{ width: `${skill.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Attendance Streak', value: '12 Days', icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Total Badges', value: '8 Earned', icon: Trophy, color: 'text-orange-600' },
          { label: 'Coach Rating', value: '4.8/5.0', icon: MessageSquare, color: 'text-blue-600' },
          { label: 'Rank in Group', value: '#3 of 24', icon: TrendingUp, color: 'text-purple-600' }
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
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Management</h1>
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
                  <div className={`p-2 rounded-lg ${txn.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
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
          <Card className="bg-blue-600 text-white border-none">
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
                { label: 'CliQ', value: 45, color: 'bg-blue-500' },
                { label: 'Credit Card', value: 30, color: 'bg-purple-500' },
                { label: 'Apple Pay', value: 15, color: 'bg-black' },
                { label: 'Cash', value: 10, color: 'bg-green-500' }
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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and academy preferences</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-24 h-24 rounded-3xl bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold mb-4">
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
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${pref.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
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
    fetch('/api/stats').then(res => res.json()).then(setStats);
    fetch('/api/players').then(res => res.json()).then(setPlayers);
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Academy Overview</h1>
          <p className="text-gray-500 mt-1">Real-time performance metrics</p>
        </div>
        <Button><Plus size={18} /> New Session</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
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
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <Calendar size={20} />
            </div>
            <Badge color="orange">Busy</Badge>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Upcoming Sessions</h3>
          <p className="text-2xl font-bold mt-1">{stats?.upcomingSessions?.count || 18}</p>
        </Card>
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
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
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-bottom border-gray-100">
                  <th className="pb-4">Player</th>
                  <th className="pb-4">Group</th>
                  <th className="pb-4">Sessions</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {players.map(player => (
                  <tr key={player.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
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
                            className="h-full bg-blue-500" 
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
                  activity.type === 'payment' ? 'bg-green-500' : 
                  activity.type === 'attendance' ? 'bg-blue-500' : 'bg-orange-500'
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
    </div>
  );
};

const CoachView = ({ user }: { user: User }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    fetch('/api/sessions').then(res => res.json()).then(setSessions);
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Coach Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user.name}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold">Today's Sessions</h2>
          {sessions.map(session => (
            <Card key={session.id} className="hover:border-blue-200 transition-colors cursor-pointer" onClick={() => setSelectedSession(session)}>
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
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
          
          <Card className="bg-blue-600 text-white border-none">
            <h3 className="font-bold mb-2">My Payouts</h3>
            <p className="text-blue-100 text-sm mb-4">You have 12 unclaimed sessions this month.</p>
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
    fetch('/api/players').then(res => res.json()).then(players => {
      const p = players.find((pl: any) => pl.user_id === user.id);
      setPlayerData(p);
    });
  }, [user.id]);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome, {user.name}</h1>
          <p className="text-gray-500 mt-1">Group {playerData?.group_name || 'G1'} • Wolves Academy</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loyalty Points</p>
            <p className="text-xl font-bold text-blue-600">{playerData?.loyalty_points || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Trophy size={24} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-lg font-medium text-blue-100 mb-1">Sessions Remaining</h2>
            <div className="text-5xl font-bold mb-6">{playerData?.sessions_remaining || 0}</div>
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
                <Calendar size={18} className="text-blue-600" />
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
              { label: 'Shooting', value: 85, color: 'bg-blue-500' },
              { label: 'Dribbling', value: 72, color: 'bg-green-500' },
              { label: 'Footwork', value: 90, color: 'bg-orange-500' },
              { label: 'IQ', value: 65, color: 'bg-purple-500' }
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, userId })
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
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm">Wolves AI</p>
                  <p className="text-[10px] text-blue-100">Online • Amman, Jordan</p>
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
                    msg.isBot ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'
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
                className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleSend}
                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-blue-700 transition-all active:scale-90"
      >
        <MessageSquare size={24} />
      </button>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Simple login simulation
  const login = (role: Role) => {
    const mockUsers = {
      admin: { id: 1, name: 'Admin User', email: 'admin@wolves.jo', role: 'admin' },
      coach: { id: 2, name: 'Coach Sam', email: 'coach@wolves.jo', role: 'coach' },
      player: { id: 3, name: 'Ahmad Jordan', email: 'player@wolves.jo', role: 'player' }
    };
    setUser(mockUsers[role] as User);
    setActiveTab('Dashboard');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white">
            <Trophy size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Wolves Sports Academy</h1>
          <p className="text-gray-500 mb-8">Digital Transformation Platform</p>
          
          <div className="space-y-3">
            <Button className="w-full" onClick={() => login('admin')}>Login as Admin</Button>
            <Button className="w-full" variant="outline" onClick={() => login('coach')}>Login as Coach</Button>
            <Button className="w-full" variant="outline" onClick={() => login('player')}>Login as Player/Parent</Button>
          </div>
          
          <p className="mt-8 text-xs text-gray-400">Amman, Jordan • Powered by AI Studio</p>
        </Card>
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
      case 'Settings':
        return <SettingsView user={user} />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-gray-100 flex flex-col fixed h-full z-40"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Trophy size={18} />
              </div>
              <span className="font-bold text-lg tracking-tight">Wolves</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item, i) => (
            <button 
              key={i}
              onClick={() => setActiveTab(item.label)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all group ${
                activeTab === item.label ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} className={activeTab === item.label ? 'text-blue-600' : 'group-hover:text-blue-600'} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => setUser(null)}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
          >
            <XCircle size={20} />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-[280px]' : 'ml-[80px]'}`}>
        <nav className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{user.name}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{user.role}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </nav>

        <div className="p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      <Chatbot userId={user.id} />
    </div>
  );
}
