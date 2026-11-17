import { SpaceBackground } from "@/components/SpaceBackground";
import { GameShell } from "@/components/game/GameShell";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SpaceBackground />
      <GameShell>{children}</GameShell>
    </>
  );
}
