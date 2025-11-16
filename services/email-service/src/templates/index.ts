import Handlebars from 'handlebars';
import juice from 'juice';

const templates = {
  'order-confirmation': `
    <html><body style="font-family: Arial, sans-serif;">
      <h1>Order Confirmation</h1>
      <p>Hi {{customerName}},</p>
      <p>Your order <strong>{{orderNumber}}</strong> has been confirmed.</p>
      <p>Total: ${{total}}</p>
      <p>Thank you for your purchase!</p>
    </body></html>
  `,
  'payment-success': `
    <html><body style="font-family: Arial, sans-serif;">
      <h1>Payment Successful</h1>
      <p>Hi {{customerName}},</p>
      <p>Your payment of ${{amount}} has been processed successfully.</p>
      <p>Order: {{orderNumber}}</p>
    </body></html>
  `,
  'shipment-notification': `
    <html><body style="font-family: Arial, sans-serif;">
      <h1>Your Order Has Shipped!</h1>
      <p>Hi {{customerName}},</p>
      <p>Your order {{orderNumber}} has been shipped.</p>
      <p>Tracking number: {{trackingNumber}}</p>
    </body></html>
  `,
  'welcome': `
    <html><body style="font-family: Arial, sans-serif;">
      <h1>Welcome to E-Commerce!</h1>
      <p>Hi {{username}},</p>
      <p>Welcome to our platform. We're excited to have you!</p>
    </body></html>
  `,
};

export function renderTemplate(templateName: string, variables: Record<string, any>): string {
  const template = templates[templateName as keyof typeof templates];
  if (!template) throw new Error(`Template ${templateName} not found`);

  const compiled = Handlebars.compile(template);
  const html = compiled(variables);
  return juice(html); // Inline CSS
}
