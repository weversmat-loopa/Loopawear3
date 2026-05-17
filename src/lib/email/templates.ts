/**
 * HTML email templates. Each template function returns the subject and
 * a complete HTML document ready to be passed to sendEmail().
 *
 * Style choices for cross-client compatibility:
 *   - Table-based layout (Outlook on Windows still doesn't reliably
 *     render flex/grid).
 *   - All styles inline (most clients strip <style> blocks).
 *   - 560px max width — wider than mobile, narrower than typical
 *     desktop, reads well in both.
 *   - User-supplied strings go through escapeHtml() before
 *     interpolation. Subjects are plain text and don't need it.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseLayout({
  preheader,
  contentHtml,
}: {
  preheader: string;
  contentHtml: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Loopawear</title>
</head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#27272a;">
  <div style="display:none;font-size:1px;color:#fafafa;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fafafa;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #f4f4f5;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#18181b;letter-spacing:-0.01em;">Loopawear</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">${contentHtml}</td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;line-height:1.5;">You're receiving this because of activity on your Loopawear account.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:9999px;">${escapeHtml(label)}</a>`;
}

function detailsRow(
  label: string,
  value: string,
  options: { last?: boolean; emphasize?: boolean } = {}
): string {
  const border = options.last ? "" : "border-bottom:1px solid #f4f4f5;";
  const valueStyle = options.emphasize
    ? "font-size:14px;color:#18181b;font-weight:700;"
    : "font-size:13px;color:#27272a;font-weight:500;";
  return `
    <tr>
      <td style="padding:14px 16px;${border}font-size:13px;color:#71717a;">${escapeHtml(label)}</td>
      <td align="right" style="padding:14px 16px;${border}${valueStyle}">${escapeHtml(value)}</td>
    </tr>`;
}

// ---- Templates ----

export function designApprovedEmail({
  designTitle,
  designUrl,
}: {
  designTitle: string;
  designUrl: string;
}): { subject: string; html: string } {
  const safeTitle = escapeHtml(designTitle);
  return {
    subject: `Your design "${designTitle}" is live`,
    html: baseLayout({
      preheader: `${designTitle} has been approved and is now in the marketplace.`,
      contentHtml: `
        <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#18181b;">Your design is live</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b;">
          <strong style="color:#27272a;">${safeTitle}</strong> has been approved and is now visible in the marketplace.
        </p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">
          Buyers can find it, share it, and order it from now on.
        </p>
        ${ctaButton("View design →", designUrl)}
      `,
    }),
  };
}

export function designRejectedEmail({
  designTitle,
  workspaceUrl,
}: {
  designTitle: string;
  workspaceUrl: string;
}): { subject: string; html: string } {
  const safeTitle = escapeHtml(designTitle);
  return {
    subject: `Your design "${designTitle}" wasn't approved`,
    html: baseLayout({
      preheader: `${designTitle} needs changes before it can go live.`,
      contentHtml: `
        <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#18181b;">Design not approved</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b;">
          <strong style="color:#27272a;">${safeTitle}</strong> wasn't approved for the marketplace and has been moved back to your drafts.
        </p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">
          You can edit the design and resubmit it for review when you're ready.
        </p>
        ${ctaButton("Open in workspace →", workspaceUrl)}
      `,
    }),
  };
}

export function newSaleEmail({
  designTitle,
  size,
  quantity,
  earningsCents,
  dashboardUrl,
}: {
  designTitle: string;
  size: string;
  quantity: number;
  earningsCents: number;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const safeTitle = escapeHtml(designTitle);
  const earnings = `€${(earningsCents / 100).toFixed(2)}`;
  return {
    subject: `New sale on Loopawear — ${earnings}`,
    html: baseLayout({
      preheader: `${designTitle} just sold. Your earnings: ${earnings}.`,
      contentHtml: `
        <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#18181b;">You made a sale</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b;">
          Someone just bought <strong style="color:#27272a;">${safeTitle}</strong>.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;border:1px solid #e4e4e7;border-radius:12px;">
          ${detailsRow("Size", size)}
          ${detailsRow("Quantity", String(quantity))}
          ${detailsRow("Your earnings", earnings, { last: true, emphasize: true })}
        </table>
        ${ctaButton("Open creator dashboard →", dashboardUrl)}
      `,
    }),
  };
}

export function orderConfirmationEmail({
  designTitle,
  size,
  quantity,
  totalCents,
  orderId,
  orderUrl,
}: {
  designTitle: string;
  size: string;
  quantity: number;
  totalCents: number;
  orderId: string;
  /** Null for guest buyers — they have no account to view it from. */
  orderUrl: string | null;
}): { subject: string; html: string } {
  const safeTitle = escapeHtml(designTitle);
  const total = `€${(totalCents / 100).toFixed(2)}`;
  const shortId = orderId.slice(0, 8).toUpperCase();

  return {
    subject: `Order #${shortId} confirmed`,
    html: baseLayout({
      preheader: `Your order of ${designTitle} is confirmed. Total: ${total}.`,
      contentHtml: `
        <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#18181b;">Order confirmed</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b;">
          Thanks for your purchase. Your order <strong style="color:#27272a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">#${shortId}</strong> for <strong style="color:#27272a;">${safeTitle}</strong> has been received and is being prepared.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;border:1px solid #e4e4e7;border-radius:12px;">
          ${detailsRow("Size", size)}
          ${detailsRow("Quantity", String(quantity))}
          ${detailsRow("Total", total, { last: true, emphasize: true })}
        </table>
        <p style="margin:0 0 ${orderUrl ? "24px" : "0"};font-size:14px;line-height:1.6;color:#52525b;">
          We'll email you again with tracking info as soon as your order ships.
        </p>
        ${orderUrl ? ctaButton("View order →", orderUrl) : ""}
      `,
    }),
  };
}
