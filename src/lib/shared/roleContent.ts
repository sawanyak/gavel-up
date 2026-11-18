// Static, public text for each character. Which role a player HAS only ever comes
// from the server; this file just describes what each role means.
import type { Role } from "./constants";

export interface GameRules {
  /** The crew wins if at least this many impostors are voted out (config.impostorWinThreshold). */
  crewNeedsToCatch: number;
  detectiveInvestigationLimit: number;
  maxMeetings: number;
  /** Impostors see each other (config.impostorsSeeEachOther). */
  alliesVisible: boolean;
}

export interface RoleContent {
  role: Role;
  title: string;
  tagline: string;
  description: string;
  objective: string;
  abilities: string[];
  howToScore: string[];
  instructions: string[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function getRoleContent(role: Role, rules: GameRules): RoleContent {
  const sharedScoring = [
    "All points are TEAM points — everything you do adds to your team's total.",
    "Complete the tasks shown on your phone when the hosts reveal them.",
    "Join in table topics, Q&A and icebreakers — Team Managers award points for great participation.",
  ];

  switch (role) {
    case "impostor":
      return {
        role,
        title: "IMPOSTOR",
        tagline: "There is an impostor among us… it's you.",
        description:
          "You are secretly working against the crew. Blend in with your team, do tasks like everyone else, and eliminate crewmates without getting caught.",
        objective: `Avoid being voted out. The impostors win if fewer than ${plural(rules.crewNeedsToCatch, "impostor is", "impostors are")} voted out by the end of the meeting.`,
        abilities: [
          "Eliminate players discreetly by sticking a red sticker on them (follow the hosts' sticker rules).",
          rules.alliesVisible ? "You can see who the other impostors are (listed below)." : "You work alone — you don't know the other impostors.",
          "You still vote in your team's emergency meeting, so you can steer suspicion away from yourself.",
        ],
        howToScore: [...sharedScoring, "Doing tasks for your team is the best disguise."],
        instructions: [
          "Never show this screen to anyone.",
          "Don't get caught placing a sticker — act natural.",
          "No eliminations during the emergency meeting.",
        ],
      };
    case "detective":
      return {
        role,
        title: "DETECTIVE",
        tagline: "Trust no one. Ask the right question.",
        description:
          "You are a crewmate with a special power: you can secretly ask a host whether one person is an impostor.",
        objective: "Help your team find and vote out its impostor during the emergency meeting.",
        abilities: [
          `You can investigate ${plural(rules.detectiveInvestigationLimit, "person", "people")} during the game: quietly go to a host and ask "Is <name> an impostor?". The host will answer only you.`,
          "Use what you learn to guide your team's vote — but be careful, the impostor may target you if you're too obvious.",
        ],
        howToScore: sharedScoring,
        instructions: [
          "Never show this screen to anyone.",
          "Ask your question privately, away from other players.",
          "If you get a red sticker, you become a ghost: you can still do tasks but can't vote.",
        ],
      };
    case "crewmate":
    default:
      return {
        role: "crewmate",
        title: "CREWMATE",
        tagline: "Do your tasks. Watch your back.",
        description: "You are a loyal member of the crew. Earn points for your team and work out who the impostor is.",
        objective: "Help your team earn the most points and vote out your team's impostor in the emergency meeting.",
        abilities: [
          "Vote for the suspected impostor in your team during the emergency meeting.",
          "Optionally predict an impostor in another team — correct guesses earn bonus points, wrong guesses cost points.",
        ],
        howToScore: sharedScoring,
        instructions: [
          "Keep your role secret.",
          "If someone puts a red sticker on you, you've been eliminated: tell your Team Manager. As a ghost you can still do tasks but can't vote.",
        ],
      };
  }
}
