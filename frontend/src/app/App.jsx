import GameLayout from '../ui/layout/GameLayout.jsx';
import { useGameSession } from '../hooks/useGameSession.js';

export default function App() {
  const { session, start, submit } = useGameSession();

  return (
    <GameLayout
      session={session}
      onStart={start}
      onSubmitCell={submit}
    />
  );
}
