import React from "react";
import ReactDOM from "react-dom/client";
import VongTronDoSong from "../../VongTronDoSong_1.jsx";

document.body.style.margin = "0";
document.body.style.background = "#0A0D14";
document.body.style.padding = "20px";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <VongTronDoSong />
  </React.StrictMode>
);
