interface FirstBloodWebhookInput {
  teamName: string;
  challengeId: string;
  challengeName: string;
}

interface MultiAccountIpWebhookInput {
  ipAddress: string;
  teamName: string;
  otherTeamNames: string[];
  userAgent?: string | null;
}

export async function sendFirstBloodWebhook(input: FirstBloodWebhookInput) {
  const webhookUrl = process.env.DISCORD_FIRST_BLOOD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const challengeLabel = `${input.challengeName} (${input.challengeId})`;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username: process.env.DISCORD_FIRST_BLOOD_WEBHOOK_USERNAME || 'CTF First Blood',
      content: `First blood: **${input.teamName}** solved **${challengeLabel}**.`,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Discord webhook failed with ${response.status}: ${text}`);
  }
}

export async function sendMultiAccountIpWebhook(input: MultiAccountIpWebhookInput) {
  const webhookUrl = process.env.DISCORD_ADMIN_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const otherTeams = input.otherTeamNames.length > 0 ? input.otherTeamNames.join(', ') : 'Unknown team';
  const userAgent = input.userAgent ? `\nUser-Agent: ${input.userAgent}` : '';

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username: process.env.DISCORD_ADMIN_ALERT_WEBHOOK_USERNAME || 'CTF Admin Alert',
      content: `Admin alert: IP **${input.ipAddress}** logged into **${input.teamName}** while active sessions also exist for **${otherTeams}**.${userAgent}`,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Discord admin webhook failed with ${response.status}: ${text}`);
  }
}
