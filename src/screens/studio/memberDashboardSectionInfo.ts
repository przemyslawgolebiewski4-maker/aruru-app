/** Labels and member-facing explanations for member dashboard section keys. */

export type MemberDashboardSectionInfo = {
  label: string;
  desc: string;
};

export const MEMBER_DASHBOARD_SECTION_INFO: Record<
  string,
  MemberDashboardSectionInfo
> = {
  events: {
    label: 'Events',
    desc: 'Members see upcoming studio events and can sign up directly in the app.',
  },
  bookings: {
    label: 'Bookings',
    desc: 'Members can book studio time and see who else has booked today.',
  },
  kiln: {
    label: 'Kilns',
    desc: 'Members see their kiln firing history and cost breakdown per session.',
  },
  materials: {
    label: 'Materials',
    desc: 'Members can browse and buy from your studio materials catalogue.',
  },
  costs: {
    label: 'Costs & billing',
    desc: 'Members see their monthly cost summary and previous months. No live costs — only end-of-month.',
  },
  tasks: {
    label: 'Tasks',
    desc: 'Members see tasks assigned to them and can log hours.',
  },
  privateKilns: {
    label: 'Private kilns',
    desc: 'Members can request a private kiln session. You approve or reject each request.',
  },
  membershipPlans: {
    label: 'Membership plans',
    desc: 'Members can see available membership plans and their current plan.',
  },
};

export function getMemberDashboardSectionInfo(
  key: string
): MemberDashboardSectionInfo {
  const hit = MEMBER_DASHBOARD_SECTION_INFO[key];
  if (hit) return hit;
  return {
    label: key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim(),
    desc: '',
  };
}
