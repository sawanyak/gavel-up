import { describe, expect, it } from "vitest";
import * as publicGame from "@/app/api/public/game/route";
import { Game } from "@/lib/server/models";
import { Client, setupGame } from "../helpers";

describe("Phase 2 · public How-to-Play info", () => {
  it("exposes configured rules and point values (no player data)", async () => {
    const { game } = await setupGame();
    await Game.updateOne(
      { _id: game._id },
      { $set: { "config.impostorWinThreshold": 3, "config.detectiveInvestigationLimit": 2, "config.points.correctPrediction": 40 } },
    );
    const r = await new Client().call(publicGame.GET);
    expect(r.status).toBe(200);
    expect(r.body.rules).toEqual({ crewNeedsToCatch: 3, detectiveInvestigationLimit: 2, maxMeetings: 1, alliesVisible: true });
    expect(r.body.points).toEqual({ taskDefault: 10, correctInternalVotePerVoter: 10, correctPrediction: 40, wrongPrediction: -15 });
    expect(Object.keys(r.body).sort()).toEqual(["code", "name", "phase", "points", "registrationOpen", "rules", "teams"]);
  });
});
