export async function onRequestGet(context) {
  const env = (context && context.env) || {};
  const recaptchaSiteKey = String(
    env.RECAPTCHA_ENTERPRISE_SITE_KEY ||
      env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ||
      env.RECAPTCHA_SITE_KEY ||
      "6LeSXjIuAAAAAMpqoXPJBXXsdrVsKOBR38GLAWdi"
  ).trim();

  return new Response(
    JSON.stringify({
      ok: true,
      recaptchaEnabled: Boolean(recaptchaSiteKey),
      recaptchaSiteKey,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}

