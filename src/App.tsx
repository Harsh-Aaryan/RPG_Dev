import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BattlePage } from "./pages/BattlePage";
import { CreateBattlePage } from "./pages/CreateBattlePage";
import { LandingPage } from "./pages/LandingPage";
import { QuestPage } from "./pages/QuestPage";
import { VictoryPage } from "./pages/VictoryPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateBattlePage />} />
        <Route path="/battle/:battleId" element={<BattlePage />} />
        <Route path="/quest/:questId" element={<QuestPage />} />
        <Route path="/victory/:battleId" element={<VictoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}
