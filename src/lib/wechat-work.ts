// WeChat Work (企业微信) Bot Integration

const WECHAT_WORK_CORP_ID = 'ww8bd429f5b618a57e';
const WECHAT_WORK_BOT_ID = 'aibfn23p9PFXJWjxbzkCJoyHZVbxdOq80N3';
const WECHAT_WORK_SECRET = 'KCHVNlqmuiJ791kspuFGBlJ6CzwdlP8SHkawr2XS4ii';

interface WeChatTokenResponse {
  errcode: number;
  errmsg: string;
  access_token: string;
  expires_in: number;
}

interface WeChatMessageResponse {
  errcode: number;
  errmsg: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${WECHAT_WORK_CORP_ID}&corpsecret=${WECHAT_WORK_SECRET}`;

  try {
    const response = await fetch(url);
    const data: WeChatTokenResponse = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`WeChat Work API error: ${data.errmsg}`);
    }

    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    };

    return data.access_token;
  } catch (error) {
    console.error('Failed to get WeChat Work access token:', error);
    throw error;
  }
}

export async function sendWeChatNotification(
  title: string,
  content: string,
  mentionAll = false
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const url = `https://qyapi.weixin.qq.com/cgi-bin/appchat/send?access_token=${token}`;

    const message = {
      chatid: WECHAT_WORK_BOT_ID,
      msgtype: 'markdown',
      markdown: {
        content: `## ${title}\n\n${content}${mentionAll ? '\n\n<@all>' : ''}`,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const data: WeChatMessageResponse = await response.json();

    if (data.errcode !== 0) {
      console.error('WeChat Work send message error:', data.errmsg);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send WeChat Work notification:', error);
    return false;
  }
}

export async function sendReportNotification(
  weekLabel: string,
  summary: string
): Promise<boolean> {
  const title = `📊 CSM 周报已生成 - ${weekLabel}`;
  const content = `
> ${summary}

**请登录 CSM 周报智能体查看完整报告**
`;

  return sendWeChatNotification(title, content);
}
