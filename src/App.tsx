import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { APP_NAME } from "./brand";
import { useStore } from "./state/store";
import { Shell } from "./ui/Shell";
import Dashboard from "./pages/Dashboard";
import Classroom from "./pages/Classroom";
import LessonPage from "./pages/Lesson";
import Roadmap from "./pages/Roadmap";
import Practice from "./pages/Practice";
import Playground from "./pages/Playground";
import { ChallengeRun, Challenges, QuizRun, Quizzes } from "./pages/Challenges";
import Mistakes from "./pages/Mistakes";
import Analytics from "./pages/Analytics";
import Audit from "./pages/Audit";
import Functions from "./pages/Functions";
import Settings from "./pages/Settings";
import Planned from "./pages/Planned";
import Datasets from "./pages/Datasets";
import Coverage from "./pages/Coverage";
import Login from "./pages/Login";

export const ROUTE_PATTERNS = ["/", "/classroom", "/lesson/:id", "/roadmap", "/practice", "/playground", "/challenges", "/challenges/:id", "/quizzes", "/quizzes/:id", "/mistakes", "/analytics", "/audit", "/datasets", "/coverage", "/functions", "/settings"];

function ThemeSync() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    const dark = theme === "dark" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [theme]);
  useEffect(() => { document.title = APP_NAME; }, []);
  return null;
}

export function AppRoutes() {
  const signedIn = useStore((s) => s.auth.signedIn);
  if (!signedIn) return <Login />;
  return (
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="classroom" element={<Classroom />} />
          <Route path="lesson/:id" element={<LessonPage />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="practice" element={<Practice />} />
          <Route path="playground" element={<Playground />} />
          <Route path="challenges" element={<Challenges />} />
          <Route path="challenges/:id" element={<ChallengeRun />} />
          <Route path="quizzes" element={<Quizzes />} />
          <Route path="quizzes/:id" element={<QuizRun />} />
          <Route path="mistakes" element={<Mistakes />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="audit" element={<Audit />} />
          <Route path="datasets" element={<Datasets />} />
          <Route path="coverage" element={<Coverage />} />
          <Route path="functions" element={<Functions />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Planned title="Page not found" what="There is no page at this address. Use the menu to go somewhere that exists." />} />
        </Route>
      </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ThemeSync />
      <AppRoutes />
    </HashRouter>
  );
}
