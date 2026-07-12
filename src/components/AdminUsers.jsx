import { useEffect, useState } from 'react';
import '../styles/AdminUsers.css';

// Đổi API_BASE nếu backend chạy ở domain/port khác
const API_BASE = '/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch {
      // giữ danh sách rỗng nếu chưa nối được backend
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username || !form.email || !form.password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Thêm user thất bại');
        return;
      }
      setForm({ username: '', email: '', password: '' });
      fetchUsers();
    } catch {
      setError('Không thể kết nối tới server');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá user này?')) return;
    await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchUsers();
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('vi-VN');

  return (
    <div className="au-page">
      <div className="au-card">
        <h1 className="au-title">Quản lý user</h1>
        <p className="au-subtitle">Thêm tài khoản để họ đăng nhập xem dữ liệu</p>

        <form onSubmit={handleAdd}>
          <div className="au-form-grid">
            <input
              className="au-input"
              placeholder="Tên đăng nhập"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <input
              className="au-input"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="au-input"
              type="password"
              placeholder="Mật khẩu"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button className="au-btn" type="submit" disabled={loading}>
              {loading ? 'Đang thêm...' : 'Thêm user'}
            </button>
          </div>
        </form>

        {error && <p className="au-error">{error}</p>}

        <table className="au-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Ngày tạo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id || u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{formatDate(u.createdAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="au-delete-btn" onClick={() => handleDelete(u._id || u.id)}>
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="au-empty">
                  Chưa có user nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
