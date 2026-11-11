export interface ContactPerson {
  role: string;
  title: string;
  name: string;
  color: string; // Among us crewmate color
  crewmateColorHex: string;
  phone: string;
  email: string;
  whatsapp: string;
  bio: string;
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
  date: "Date TBA (Coming Soon)",
  time: "Time TBA",
  venue: "SLIIT Main Campus, Malabe",
  registrationClosingDate: "To Be Announced",
  
  // Replace this with your actual Google Form URL when ready:
  googleFormUrl: "https://docs.google.com/forms/d/e/your-form-id-here/viewform",
  
  // Countdown target date (Update to your event launch date)
  countdownTarget: "2026-11-25T09:00:00+05:30",
  
  contacts: [
    {
      role: "Club President",
      title: "President",
      name: "President Name TBA",
      color: "red",
      crewmateColorHex: "#C51111",
      phone: "+94 77 123 4567",
      email: "president.sliitgavel@gmail.com",
      whatsapp: "https://wa.me/94771234567",
      bio: "Chief Commander of SLIIT Gavel Club. Leads the spaceship and ensures all crewmates find their authentic voice.",
    },
    {
      role: "Vice President Membership",
      title: "VP Membership",
      name: "VP Membership Name TBA",
      color: "cyan",
      crewmateColorHex: "#38FEDC",
      phone: "+94 71 234 5678",
      email: "vpm.sliitgavel@gmail.com",
      whatsapp: "https://wa.me/94712345678",
      bio: "Gatekeeper of new crewmates. In charge of orientation, membership registrations, and welcoming new talent aboard.",
    },
    {
      role: "Assistant Vice President Membership",
      title: "Assistant VP Membership",
      name: "Assistant VP Name TBA",
      color: "yellow",
      crewmateColorHex: "#F5F557",
      phone: "+94 76 345 6789",
      email: "avpm.sliitgavel@gmail.com",
      whatsapp: "https://wa.me/94763456789",
      bio: "Deputy Intake Officer. Ready to assist you with registration queries, campus meetup locations, and event guidelines.",
    },
  ],
};
