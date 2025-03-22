// utils/emailUtils.js
export const getWelcomeEmailContent = (subscriberName, unsubscribeLink) => {
  return `
    <html>
      <body>
        <h1>Welcome to Our Newsletter, ${subscriberName}!</h1>
        <p>Thank you for subscribing to our newsletter. We're excited to have you on board!</p>
        <p>If you wish to unsubscribe, click <a href="${unsubscribeLink}">here</a>.</p>
      </body>
    </html>
  `;
};

export const renderTemplate = (template, data) => {
  // First replace all template variables
  let renderedTemplate = template.replace(/{{(\w+)}}/g, (_, key) => data[key] || '');
  
  // If tracking is needed, add tracking pixel before closing body tag
  if (data.newsletterId && data.apiUrl) {
    const trackingPixel = `<img src="${data.apiUrl}/newsletter/track/${data.newsletterId}" width="1" height="1" alt="" style="display:none;" />`;
    renderedTemplate = renderedTemplate.replace('</body>', `${trackingPixel}</body>`);
  }
  
  return renderedTemplate;
};