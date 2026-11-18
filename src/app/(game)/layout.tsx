import { SpaceBackground } from "@/components/SpaceBackground";
import { GameShell } from "@/components/game/GameShell";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="print:hidden">
        <SpaceBackground />
      </div>
      <GameShell>{children}</GameShell>
    </>
  );
}
