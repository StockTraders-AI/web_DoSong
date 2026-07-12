import DoSongThiTruong from "./components/DoSongThiTruong";
import AdminUsers from "./components/AdminUsers";

function App() {
  return window.location.pathname === "/admin" ? <AdminUsers /> : <DoSongThiTruong />;
}

export default App;