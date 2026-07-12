import DoSongThiTruong from "./components/DoSongThiTruong";
import AdminUsers from "./components/AdminUsers";

function App() {
  return window.location.pathname === "/hp" ? <AdminUsers /> : <DoSongThiTruong />;
}

export default App;