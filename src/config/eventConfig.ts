export interface ContactPerson {
  role: string;
  title: string;
  name: string;
  color: string; // Among us crewmate color
  crewmateColorHex: string;
  phone: string;
  bio: string;
  image?: string; // Path or URL to organizer image (e.g. "/images/organizers/president.jpg")
}

export interface EventDetails {
  title: string;
  subTitle: string;
  tagline: string;
  organization: string;
  parentOrganization: string;
  date: string;
  time: string;
  venue: string;
  registrationClosingDate: string;
  googleFormUrl: string;
  membershipGoogleFormUrl: string; // Google Form to collect details from students joining the club
  countdownTarget: string; // ISO date string for countdown timer
  contacts: ContactPerson[];
}

export const eventConfig: EventDetails = {
  title: "GAVEL UP",
  subTitle: "SLIIT GAVEL CLUB",
  tagline: "Break The Silence. Find Your Voice. Survive The Meeting.",
  organization: "SLIIT Gavel Club",
  parentOrganization: "Affiliated with Toastmasters International",
  
  // NOTE: You can update these details anytime right here!
  date: "21st of November 2026",
  time: "From 11:00 AM",
  venue: "G606, SLIIT Malabe",
  registrationClosingDate: "To Be Announced",
  
  // Replace this with your actual Google Form URL for the Gavel Up event when ready:
  googleFormUrl: "https://forms.gle/L9BjHbABk1NHFXBN8",
  
  // Replace this with your actual Google Form URL to get details from members joining the club:
  membershipGoogleFormUrl: "https://bit.ly/sliit-gavel",
  
  // Countdown target date (Update to your event launch date)
  countdownTarget: "2026-11-21T11:00:00+05:30",
  
  contacts: [
    {
      role: "Club President",
      title: "President",
      name: "Pavan Kumarage",
      color: "red",
      crewmateColorHex: "#C51111",
      phone: "+94 71 356 0640",
      image: "/images/organizers/pavan-kumarage.jpg",
      bio: "Chief Commander of SLIIT Gavel Club. Leads the spaceship and ensures all crewmates find their authentic voice.",
    },
    {
      role: "Vice President Membership",
      title: "VP Membership",
      name: "Dilni Nishshanka",
      color: "cyan",
      crewmateColorHex: "#38FEDC",
      phone: "+94 76 320 1664",
      image: "/images/organizers/dilni-nishshanka.jpg",
      bio: "Gatekeeper of new crewmates. In charge of orientation, membership registrations, and welcoming new talent aboard.",
    },
    {
      role: "Assistant Vice President Membership",
      title: "Assistant VP Membership",
      name: "Sawanya Kodagoda",
      color: "yellow",
      crewmateColorHex: "#F5F557",
      phone: "+94 70 233 0851",
      image: "/images/organizers/sawanya-kodagoda.jpg",
      bio: "Deputy Intake Officer. Ready to assist you with registration queries, campus meetup locations, and event guidelines.",
    },
  ],
};
