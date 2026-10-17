import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CrestDefs } from './components/art/Crest';
import { ScrollToTop } from './components/ui/ScrollToTop';
import { setHostToken } from './lib/api-client';
import { BattlePage } from './pages/BattlePage';
import { CreateBattlePage } from './pages/CreateBattlePage';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { QuestPage } from './pages/QuestPage';
import { VictoryPage } from './pages/VictoryPage';
import { useBattleStore } from './store/useBattleStore';

export default function App() {
  const hostToken = useBattleStore((s) => s.hostToken);
  const reducedMotion = useBattleStore((s) => s.reducedMotion);
  useEffect(() => setHostToken(hostToken), [hostToken]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <CrestDefs />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateBattlePage />} />
          <Route path="/battle/:battleId" element={<BattlePage />} />
          <Route path="/quest/:battleId/:questId" element={<QuestPage />} />
          <Route path="/victory/:battleId" element={<VictoryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}
