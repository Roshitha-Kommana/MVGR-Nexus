import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users as UsersIcon, 
  FileText, 
  Download, 
  AlertTriangle, 
  Ban, 
  Check, 
  Megaphone, 
  ShieldAlert, 
  Award, 
  Trash2, 
  Star,
  RefreshCw,
  FolderLock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ElephantLoader from '../components/ElephantLoader.js';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const Admin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dbUser, isLoading: isUserLoading } = useCurrentUser();

  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'materials' | 'reports' | 'rejected' | 'announcements'>('metrics');

  // Search/Filters in tables
  const [userSearch, setUserSearch] = useState('');
  const [materialRegFilter, setMaterialRegFilter] = useState('all');

  // Announcement inputs
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Enforce Access Control: Admin only
  useEffect(() => {
    if (!isUserLoading && dbUser) {
      if (dbUser.role !== 'admin') {
        alert('Access Denied: Admin role required.');
        navigate('/');
      }
    }
  }, [dbUser, isUserLoading, navigate]);

  // 1. Fetch Admin stats & analytics
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    }
  });

  // 2. Fetch User list
  const { data: usersData, isLoading: isUsersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers', userSearch],
    queryFn: async () => {
      const res = await api.get(`/admin/users?search=${userSearch}`);
      return res.data;
    }
  });

  // 3. Fetch Materials list
  const { data: materialsData, isLoading: isMaterialsLoading, refetch: refetchMaterials } = useQuery({
    queryKey: ['adminMaterials'],
    queryFn: async () => {
      const res = await api.get('/materials?limit=100'); // Load large set for management
      return res.data;
    }
  });

  // 4. Fetch Reports queue
  const { data: reportsData, isLoading: isReportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['adminReports'],
    queryFn: async () => {
      const res = await api.get('/reports');
      return res.data;
    }
  });

  // 5. Fetch Rejected Upload logs
  const { data: rejectedData, isLoading: isRejectedLoading, refetch: refetchRejected } = useQuery({
    queryKey: ['adminRejected'],
    queryFn: async () => {
      const res = await api.get('/admin/rejected-uploads');
      return res.data;
    }
  });

  // 6. Action Mutations
  const toggleBanMutation = useMutation({
    mutationFn: async (payload: { clerkId: string; isBanned: boolean }) => {
      await api.patch(`/users/${payload.clerkId}/ban`, { isBanned: payload.isBanned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    }
  });

  const changeRoleMutation = useMutation({
    mutationFn: async (payload: { clerkId: string; role: string }) => {
      await api.patch(`/users/${payload.clerkId}/role`, { role: payload.role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    }
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: async (payload: { materialId: string; isFeatured: boolean }) => {
      await api.patch(`/materials/${payload.materialId}/feature`, { isFeatured: payload.isFeatured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMaterials'] });
    }
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
    }
  });

  const resolveReportMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/reports/${id}`, { status: 'resolved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
    }
  });

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;

    setIsBroadcasting(true);
    try {
      await api.post('/admin/announcements', {
        title: annTitle.trim(),
        body: annBody.trim()
      });
      alert('Site-wide announcement broadcasted successfully!');
      setAnnTitle('');
      setAnnBody('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to broadcast.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (isUserLoading || isStatsLoading) {
    return <ElephantLoader fullscreen text="Loading admin analytics dashboard..." />;
  }

  // Formatting chart stats data
  const branchData = statsData?.analytics?.branchStats?.map((b: any) => ({
    name: b.branch,
    Uploads: b.count
  })) || [];

  const regulationData = statsData?.analytics?.regulationStats?.map((r: any) => ({
    name: r.regulation,
    Uploads: r.count
  })) || [];

  const COLORS = ['#2F80ED', '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

  const metrics = statsData?.stats || {
    totalUsers: 0,
    totalMaterials: 0,
    totalDownloads: 0,
    pendingReports: 0,
    rejectedCount: 0
  };

  const usersList = usersData?.users || [];
  const rawMaterialsList = materialsData?.materials || [];
  
  const materialsList = materialRegFilter === 'all' 
    ? rawMaterialsList 
    : rawMaterialsList.filter((m: any) => m.regulation.toUpperCase() === materialRegFilter.toUpperCase());

  const reportsList = reportsData?.reports || [];
  const rejectedList = rejectedData?.rejectedUploads || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-background-borderLight dark:border-background-borderDark pb-5">
        <div className="flex items-center gap-2">
          <ShieldAlert size={28} className="text-red-500" />
          <h1 className="font-heading font-black text-2xl text-text-light dark:text-text-dark tracking-tight leading-none">
            Admin Dashboard
          </h1>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-2 rounded-xl transition border ${activeTab === 'metrics' ? 'bg-primary border-primary text-white' : 'border-background-borderLight dark:border-background-borderDark text-text-lightMuted'}`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-2 rounded-xl transition border ${activeTab === 'users' ? 'bg-primary border-primary text-white' : 'border-background-borderLight dark:border-background-borderDark text-text-lightMuted'}`}
          >
            Users ({metrics.totalUsers})
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-3 py-2 rounded-xl transition border ${activeTab === 'materials' ? 'bg-primary border-primary text-white' : 'border-background-borderLight dark:border-background-borderDark text-text-lightMuted'}`}
          >
            Materials ({metrics.totalMaterials})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-2 rounded-xl transition border ${activeTab === 'reports' ? 'bg-primary border-primary text-white' : 'border-background-borderLight dark:border-background-borderDark text-text-lightMuted'}`}
          >
            Flags ({metrics.pendingReports} Pending)
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3 py-2 rounded-xl transition border ${activeTab === 'rejected' ? 'bg-primary border-primary text-white' : 'border-background-borderLight dark:border-background-borderDark text-text-lightMuted'}`}
          >
            Auto-Rejected ({metrics.rejectedCount})
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-3 py-2 rounded-xl transition border ${activeTab === 'announcements' ? 'bg-primary border-primary text-white' : 'border-background-borderLight dark:border-background-borderDark text-text-lightMuted'}`}
          >
            Broadcast
          </button>
        </div>
      </div>

      {/* Grid counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Users */}
        <div className="bg-background-cardLight dark:bg-background-cardDark border border-background-borderLight dark:border-background-borderDark p-4 rounded-xl shadow-md text-center">
          <span className="text-[10px] font-bold text-text-lightMuted dark:text-text-darkMuted uppercase block">Users</span>
          <span className="text-xl font-heading font-black mt-1 block">{metrics.totalUsers}</span>
        </div>
        {/* Materials */}
        <div className="bg-background-cardLight dark:bg-background-cardDark border border-background-borderLight dark:border-background-borderDark p-4 rounded-xl shadow-md text-center">
          <span className="text-[10px] font-bold text-text-lightMuted dark:text-text-darkMuted uppercase block">Resources</span>
          <span className="text-xl font-heading font-black mt-1 block">{metrics.totalMaterials}</span>
        </div>
        {/* Downloads */}
        <div className="bg-background-cardLight dark:bg-background-cardDark border border-background-borderLight dark:border-background-borderDark p-4 rounded-xl shadow-md text-center">
          <span className="text-[10px] font-bold text-text-lightMuted dark:text-text-darkMuted uppercase block">Downloads</span>
          <span className="text-xl font-heading font-black mt-1 block">{metrics.totalDownloads}</span>
        </div>
        {/* Reports */}
        <div className="bg-background-cardLight dark:bg-background-cardDark border border-background-borderLight dark:border-background-borderDark p-4 rounded-xl shadow-md text-center">
          <span className="text-[10px] font-bold text-text-lightMuted dark:text-text-darkMuted uppercase block">Reported Flags</span>
          <span className="text-xl font-heading font-black mt-1 text-red-500 block">{metrics.pendingReports}</span>
        </div>
        {/* Rejected uploads */}
        <div className="bg-background-cardLight dark:bg-background-cardDark border border-background-borderLight dark:border-background-borderDark p-4 rounded-xl shadow-md text-center col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-text-lightMuted dark:text-text-darkMuted uppercase block">Failed PDFs</span>
          <span className="text-xl font-heading font-black mt-1 text-yellow-500 block">{metrics.rejectedCount}</span>
        </div>
      </div>

      {/* Main Tab Views */}

      {/* 1. Analytics tab */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Branch bar chart */}
          <div className="border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-heading font-bold text-sm text-text-light dark:text-text-dark">Upload Count per Department Branch</h3>
            <div className="h-64">
              {branchData.length === 0 ? (
                <div className="text-center py-20 text-xs italic">No data recorded.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(47, 128, 237, 0.05)' }} />
                    <Bar dataKey="Uploads" fill="#2F80ED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Regulation Pie chart */}
          <div className="border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-heading font-bold text-sm text-text-light dark:text-text-dark">Curriculum Regulation Statistics</h3>
            <div className="h-64 flex items-center justify-center">
              {regulationData.length === 0 ? (
                <div className="text-center py-20 text-xs italic">No data recorded.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={regulationData}
                      cx="50%"
                      cy="50%"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="Uploads"
                    >
                      {regulationData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. User list management */}
      {activeTab === 'users' && (
        <div className="border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search users by name, email, roll number..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="flex-1 text-xs px-4 py-2 border border-background-borderLight dark:border-background-borderDark bg-background-light dark:bg-background-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none"
            />
          </div>

          {isUsersLoading ? (
            <ElephantLoader size="sm" text="Loading users database..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-background-borderLight dark:border-background-borderDark text-text-lightMuted dark:text-text-darkMuted font-bold">
                    <th className="py-2.5">Name / Email</th>
                    <th className="py-2.5">Branch</th>
                    <th className="py-2.5">Role</th>
                    <th className="py-2.5">Uploads</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((user: any) => (
                    <tr key={user.id} className="border-b border-background-borderLight/30 dark:border-background-borderDark/30">
                      <td className="py-3">
                        <div className="font-bold">{user.name}</div>
                        <div className="text-[10px] text-text-lightMuted dark:text-text-darkMuted">{user.email}</div>
                      </td>
                      <td className="py-3">{user.branch} (Sem {user.semester})</td>
                      <td className="py-3">
                        <select
                          value={user.role}
                          onChange={(e) => changeRoleMutation.mutate({ clerkId: user.supabaseUserId, role: e.target.value })}
                          className="px-2 py-1 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded text-[10px] font-bold"
                        >
                          <option value="student">Student</option>
                          <option value="educator">Educator</option>
                          <option value="admin">Admin</option>
                          <option value="contributor">Contributor (Legacy)</option>
                        </select>
                      </td>
                      <td className="py-3 font-bold">{user.totalUploads}</td>
                      <td className="py-3">
                        {user.isBanned ? (
                          <span className="text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded text-[10px]">Banned</span>
                        ) : (
                          <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">Active</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => toggleBanMutation.mutate({ clerkId: user.supabaseUserId, isBanned: !user.isBanned })}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                            user.isBanned 
                              ? 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10' 
                              : 'border-red-500/30 text-red-500 hover:bg-red-500/10'
                          }`}
                        >
                          {user.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Material list management */}
      {activeTab === 'materials' && (
        <div className="border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex gap-3 items-center justify-between">
            <span className="text-xs font-bold text-text-lightMuted dark:text-text-darkMuted">Filter Regulation</span>
            <select
              value={materialRegFilter}
              onChange={(e) => setMaterialRegFilter(e.target.value)}
              className="text-xs px-3 py-2 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-lg"
            >
              <option value="all">All Regulations</option>
              <option value="R21">R21</option>
              <option value="R20">R20</option>
              <option value="R19">R19</option>
              <option value="A3">A3</option>
              <option value="PLACEMENT">Placement</option>
            </select>
          </div>

          {isMaterialsLoading ? (
            <ElephantLoader size="sm" text="Loading library resources..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-background-borderLight dark:border-background-borderDark text-text-lightMuted dark:text-text-darkMuted font-bold">
                    <th className="py-2.5">Title / Subject</th>
                    <th className="py-2.5">Curriculum Scope</th>
                    <th className="py-2.5">Uploaded By</th>
                    <th className="py-2.5">Stats</th>
                    <th className="py-2.5">Featured</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materialsList.map((mat: any) => (
                    <tr key={mat.id} className="border-b border-background-borderLight/30 dark:border-background-borderDark/30">
                      <td className="py-3">
                        <Link to={`/material/${mat.id}`} className="font-bold hover:text-primary transition">{mat.title}</Link>
                        <div className="text-[10px] text-text-lightMuted dark:text-text-darkMuted">{mat.subject} • <span className="font-semibold text-primary">{mat.materialType}</span></div>
                      </td>
                      <td className="py-3">{mat.regulation} {mat.branch} Sem {mat.semester}</td>
                      <td className="py-3">{mat.uploaderName}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1"><Download size={10} /> {mat.downloadCount}</div>
                        <div className="flex items-center gap-1 mt-0.5"><Star size={10} className="fill-yellow-400 text-yellow-400" /> {mat.averageRating}</div>
                      </td>
                      <td className="py-3">
                        <input
                          type="checkbox"
                          checked={mat.isFeatured}
                          onChange={(e) => toggleFeatureMutation.mutate({ materialId: mat.id, isFeatured: e.target.checked })}
                          className="w-4 h-4 rounded accent-primary bg-background-light dark:bg-background-dark border-background-borderLight dark:border-background-borderDark"
                        />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm('Delete this resource permanently?')) {
                              deleteMaterialMutation.mutate(mat.id);
                            }
                          }}
                          className="text-text-lightMuted hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition"
                          title="Delete File"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Flagged reports queue */}
      {activeTab === 'reports' && (
        <div className="border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-heading font-bold text-sm text-text-light dark:text-text-dark">Flagged Materials Queue</h3>

          {isReportsLoading ? (
            <ElephantLoader size="sm" text="Loading report queue..." />
          ) : reportsList.length === 0 ? (
            <div className="text-center py-12 text-xs italic text-text-lightMuted dark:text-text-darkMuted">No flagged files pending review.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-background-borderLight dark:border-background-borderDark text-text-lightMuted dark:text-text-darkMuted font-bold">
                    <th className="py-2.5">Flagged Item</th>
                    <th className="py-2.5">Reason</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsList.map((rep: any) => (
                    <tr key={rep.id} className="border-b border-background-borderLight/30 dark:border-background-borderDark/30">
                      <td className="py-3">
                        <Link to={`/material/${rep.materialId}`} className="font-bold hover:text-primary transition">Open Material Details</Link>
                        <div className="text-[10px] text-text-lightMuted dark:text-text-darkMuted">ID: {rep.materialId}</div>
                      </td>
                      <td className="py-3 max-w-xs">{rep.reason}</td>
                      <td className="py-3">
                        {rep.status === 'pending' ? (
                          <span className="text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded text-[10px]">Pending</span>
                        ) : (
                          <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">Resolved</span>
                        )}
                      </td>
                      <td className="py-3">{new Date(rep.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-right flex justify-end gap-2">
                        {rep.status === 'pending' && (
                          <button
                            onClick={() => resolveReportMutation.mutate(rep.id)}
                            className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] transition"
                          >
                            Resolve / Keep Notes
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Delete flagged file?')) {
                              deleteMaterialMutation.mutate(rep.materialId);
                            }
                          }}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-[10px] transition"
                        >
                          Delete Resource
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Auto-Rejected Upload Logs */}
      {activeTab === 'rejected' && (
        <div className="border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-heading font-bold text-sm text-text-light dark:text-text-dark flex items-center gap-1.5">
            <FolderLock className="text-yellow-500" /> Auto-Rejected PDF Upload Log
          </h3>

          {isRejectedLoading ? (
            <ElephantLoader size="sm" text="Loading auto-rejected logs..." />
          ) : rejectedList.length === 0 ? (
            <div className="text-center py-12 text-xs italic text-text-lightMuted dark:text-text-darkMuted">No rejected logs recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-background-borderLight dark:border-background-borderDark text-text-lightMuted dark:text-text-darkMuted font-bold">
                    <th className="py-2.5">Original File Name</th>
                    <th className="py-2.5">Uploader</th>
                    <th className="py-2.5">Rejection Reason</th>
                    <th className="py-2.5">Details</th>
                    <th className="py-2.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedList.map((log: any) => (
                    <tr key={log.id} className="border-b border-background-borderLight/30 dark:border-background-borderDark/30 text-text-lightMuted dark:text-text-darkMuted">
                      <td className="py-3 font-bold text-text-light dark:text-text-dark">{log.originalFilename || 'unnamed.pdf'}</td>
                      <td className="py-3">{log.uploaderName || 'Unknown'}</td>
                      <td className="py-3 text-red-500 font-bold">{log.rejectionReason}</td>
                      <td className="py-3">Pages: {log.pageCount || 0} • Text Length: {log.extractedTextLength || 0} chars</td>
                      <td className="py-3">{new Date(log.rejectedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Site-wide Announcements */}
      {activeTab === 'announcements' && (
        <form onSubmit={handleBroadcast} className="border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark rounded-2xl p-6 shadow-xl space-y-4 max-w-lg mx-auto">
          <div>
            <h3 className="font-heading font-black text-lg text-text-light dark:text-text-dark flex items-center gap-1.5">
              <Megaphone className="text-primary animate-pulse" /> Dispatch Site-Wide Announcement
            </h3>
            <p className="text-[10px] text-text-lightMuted dark:text-text-darkMuted mt-0.5">This will send a high-priority alert notification to all users in the system.</p>
          </div>

          <div className="space-y-4 text-xs font-semibold text-text-light dark:text-text-dark">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold">Broadcast Subject / Title</label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="w-full p-2.5 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl focus:outline-none"
                placeholder="E.g., Server Maintenance, Upcoming Campus Drive Notes"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold">Alert Message Description</label>
              <textarea
                required
                rows={4}
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                className="w-full p-3 bg-background-light dark:bg-background-dark border border-background-borderLight dark:border-background-borderDark rounded-xl focus:outline-none"
                placeholder="Type the detailed bulletin text here..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isBroadcasting}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-heading font-bold text-xs transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/10"
          >
            {isBroadcasting ? (
              <>
                <div className="w-4 h-4 shrink-0 overflow-hidden flex items-center justify-center">
                  <DotLottieReact src="/logo.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
                </div>
                <span>Distributing bulletins...</span>
              </>
            ) : (
              <>
                Send Alert Broadcast <Megaphone size={14} />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default Admin;
