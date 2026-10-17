import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ScrollToTop } from './components/ui/ScrollToTop';
import { setHostToken } from './lib/api-client';
import { BattlePage } from './pages/BattlePage';
import { CreateBattlePage } from './pages/CreateBattlePage';
import { LandingPage } from './pages/LandingPage';
import { QuestPage } from './pages/QuestPage';
import { VictoryPage } from './pages/VictoryPage';
import { useBattleStore } from './store/useBattleStore';

export default function App() {
  const hostToken = useBattleStore((s) => s.hostToken);
  useEffect(() => setHostToken(hostToken), [hostToken]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateBattlePage />} />
        <Route path="/battle/:battleId" element={<BattlePage />} />
        <Route path="/quest/:battleId/:questId" element={<QuestPage />} />
        <Route path="/victory/:battleId" element={<VictoryPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
