import { ProcessStep } from './types';

export const STEPS: ProcessStep[] = [
  {
    id: 1,
    title: "Initial Interest",
    subtitle: "Let's Get Acquainted",
    description: "The journey begins with your curiosity. This first phase is about getting to know each other to see if we're a good fit. Complete the tasks below to move forward.",
    tasks: [
      {
        id: "1-1",
        text: "Schedule and complete the initial introductory call.",
        description: "Someone from our team should be reaching out to you soon. You can also feel free to email us at info@creationcoffee.com"
      },
      { id: "1-2", text: "Review the initial information packet provided." },
    ],
  },
  {
    id: 2,
    title: "Brand Discovery",
    subtitle: "Diving into the Creation Coffee Story",
    description: "In this phase, you'll get a deeper understanding of our brand, our mission, and what makes Creation Coffee a unique opportunity. We'll share our vision and the story behind our success.",
    tasks: [
      { id: "2-1", text: "Attend the Brand Presentation." },
      { id: "2-2", text: "Learn the Founder's Story and our company values." },
      { id: "2-3", text: "Submit the official franchise application at www.creationcoffee.com/franchiseapp" },
    ],
  },
  {
    id: 3,
    title: "Franchise Information",
    subtitle: "Understanding the Agreement",
    description: "We'll provide our Franchise Disclosure Document (FDD). This crucial document details our franchise system. We recommend a thorough review with legal and financial advisors.",
    tasks: [
      { id: "3-1", text: "Receive and acknowledge FDD receipt." },
      { id: "3-2", text: "Complete a thorough review of the FDD." },
      { id: "3-3", text: "Discuss the Franchise Agreement with our team." },
      { id: "3-4", text: "Schedule and attend the Internicola Meeting (or legal review call)." },
    ],
  },
  {
    id: 4,
    title: "Qualification",
    subtitle: "Background & Financial Verification",
    description: "This is a standard step to ensure a strong partnership. We'll work with a third party to verify credit and background information to confirm financial viability.",
    tasks: [
      { id: "4-1", text: "Connect with our team to initiate the verification process." },
      { id: "4-2", text: "Submit required documents for financial viability check." },
      { id: "4-3", text: "Complete the background and credit check." },
    ],
  },
  {
    id: 5,
    title: "Finalization",
    subtitle: "The Home Stretch to Ownership",
    description: "This is your chance to experience Creation Coffee firsthand and finalize your decision. You'll be invited for a Discovery Day to meet our team, see our operations, and ask any final questions before signing.",
    tasks: [
      { id: "5-1", text: "Schedule and attend your Discovery Day visit." },
      { id: "5-2", text: "Participate in the final Q&A session with the leadership team." },
      { id: "5-3", text: "Sign the Franchise Agreement and other closing paperwork." },
      { id: "5-4", text: "Submit payment for the initial franchise fee." },
    ],
  },
  {
    id: 6,
    title: "Kickoff & Planning",
    subtitle: "Weeks 1-3: Building Your Foundation",
    description: "Now that the agreement is signed, we'll kick off the launch process. This phase focuses on the essential legal, financial, and logistical planning to get your business off the ground.",
    tasks: [
      { id: "6-1", text: "Schedule and attend onboarding call with the Creation Coffee support team." },
      { id: "6-2", text: "Establish business entity and EIN (e.g., LLC)." },
      { id: "6-3", text: "Secure funding or finalize investment partners." },
      { id: "6-4", text: "Begin researching potential locations using LoopNet, Crexi, or a local agent." },
    ],
  },
  {
    id: 7,
    title: "Buildout Prep",
    subtitle: "Weeks 4-6: From Blueprint to Reality",
    description: "With a location in sight, it's time to prepare for construction. This phase involves finalizing your lease, hiring your team, and getting the necessary approvals to start building.",
    tasks: [
        { id: "7-1", text: "Finalize lease and submit to Creation Coffee for approval (including rider)." },
        { id: "7-2", text: "Hire architect or general contractor from the approved partners list." },
        { id: "7-3", text: "Submit site plan and initial buildout ideas to HQ for layout collaboration." },
        { id: "7-4", text: "Apply for all necessary city/building permits." },
        { id: "7-5", text: "Begin sourcing interior finishes and furniture per brand standards." },
    ]
  },
  {
    id: 8,
    title: "Construction & Core Training",
    subtitle: "Weeks 7-15: Building Your Store and Your Skills",
    description: "While your physical store takes shape, you and your manager will undergo comprehensive training. This is a crucial period for construction management and learning the Creation Coffee operational standards.",
    tasks: [
        { id: "8-1", text: "Get bids and hire a local contractor to begin the construction process." },
        { id: "8-2", text: "Coordinate plumbing, electrical, HVAC, and inspections." },
        { id: "8-3", text: "Order equipment (espresso machine, grinders, etc.) using the provided checklist." },
        { id: "8-4", text: "Install major branding and signage elements." },
        { id: "8-5", text: "Stay in regular contact with the contractor for progress updates." },
        { id: "8-6", text: "Schedule initial training sessions with the Creation Team to prepare." },
    ]
  },
  {
    id: 9,
    title: "Team Building & Final Touches",
    subtitle: "Weeks 16-20: Assembling Your Crew",
    description: "Your store is almost ready. Now it's time to build the team that will bring the Creation Coffee experience to life. This phase focuses on hiring, payroll, and setting up your in-store systems.",
    tasks: [
        { id: "9-1", text: "Post job listings using provided Creation Coffee templates." },
        { id: "9-2", text: "Begin interviews for baristas, shift leads, and store manager." },
        { id: "9-3", text: "Set up Homebase for team communication and scheduling." },
        { id: "9-4", text: "Initiate payroll setup (Square or approved provider)." },
        { id: "9-5", text: "Set up POS systems, menus, music, etc. (Square POS recommended)." },
        { id: "9-6", text: "Set training dates with the Creation Coffee support team." },
    ]
  },
  {
    id: 10,
    title: "Operations Training",
    subtitle: "Weeks 21-24: Perfecting the Craft",
    description: "With your team hired, it's time for intensive hands-on training. This phase ensures everyone is confident with our recipes, workflow, and hospitality standards before you open your doors.",
    tasks: [
        { id: "10-1", text: "Train new hires using the Creation Coffee barista training program." },
        { id: "10-2", text: "Practice drink builds, register flow, and hospitality standards." },
        { id: "10-3", text: "Run mock shifts and assign roles to simulate a real day." },
        { id: "10-4", text: "Finalize inventory systems, ordering, and stockroom setup." },
        { id: "10-5", text: "Ensure health department approval and food safety training is complete." },
    ]
  },
  {
    id: 11,
    title: "Launch & Grand Opening",
    subtitle: "Weeks 25-30: Opening Your Doors",
    description: "The moment has arrived! This final phase is about creating buzz, testing your systems with a soft launch, and celebrating your official Grand Opening with the community.",
    tasks: [
        { id: "11-1", text: "Host a friends & family night or soft open event." },
        { id: "11-2", text: "Test all systems, staff readiness, and customer flow." },
        { id: "11-3", text: "Push Grand Opening promotions on social media and email." },
        { id: "11-4", text: "Celebrate your launch with local press, influencers, and customers." },
        { id: "11-5", text: "Schedule a post-launch review call with Creation Coffee HQ." },
    ]
  }
];