import React from "react";
import ReactDOM from "react-dom/client";
import LichSuDoSong from "../../LichSuDoSong_1.jsx";

document.body.style.margin = "0";
document.body.style.background = "#0A0D14";
document.body.style.padding = "20px";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LichSuDoSong />
  </React.StrictMode>
);
