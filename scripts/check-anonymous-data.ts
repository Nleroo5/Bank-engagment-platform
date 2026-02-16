import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAnonymousCampaigns() {
  const anonymousCampaigns = await prisma.surveyCampaign.count({
    where: { isAnonymous: true, deletedAt: null },
  });

  const anonymousResponses = await prisma.anonymousResponse.count({
    where: { completedAt: { not: null } },
  });

  const pendingAnonymous = await prisma.anonymousResponse.count({
    where: { completedAt: null },
  });

  const trackedInvitations = await prisma.invitation.count({
    where: {
      campaign: { deletedAt: null },
    },
  });

  const pendingInvitations = await prisma.invitation.count({
    where: {
      campaign: { deletedAt: null },
      status: { in: ['SENT', 'OPENED'] },
    },
  });

  const completedInvitations = await prisma.invitation.count({
    where: {
      campaign: { deletedAt: null },
      status: 'COMPLETED',
    },
  });

  console.log('\n=== Dashboard Metrics Debug ===\n');
  console.log('Anonymous Campaigns:', anonymousCampaigns);
  console.log('Completed Anonymous Responses:', anonymousResponses);
  console.log('Pending Anonymous Responses:', pendingAnonymous);
  console.log('\nTracked Invitations (Total):', trackedInvitations);
  console.log('Pending Tracked Invitations:', pendingInvitations);
  console.log('Completed Tracked Invitations:', completedInvitations);
  console.log('\n=== What Dashboard Currently Shows ===');
  console.log(
    'Pending Responses (Dashboard):',
    pendingInvitations,
    '(Missing',
    pendingAnonymous,
    'anonymous)'
  );
  console.log(
    'Completion Rate:',
    trackedInvitations > 0
      ? Math.round((completedInvitations / trackedInvitations) * 100) + '%'
      : '0%',
    '(Not counting anonymous)'
  );

  await prisma.$disconnect();
}

checkAnonymousCampaigns().catch((e) => {
  console.error(e);
  process.exit(1);
});
