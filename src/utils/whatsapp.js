/**
 * Genera un enlace de WhatsApp con el detalle del pedido
 * @param {string} whatsappNumber - Número en formato internacional (ej: 573137733408)
 * @param {Object} order - Datos del pedido
 * @returns {string} URL de WhatsApp
 */
const generateWhatsAppLink = (whatsappNumber, order) => {
  const { customerName, items, total } = order;

  let message = `🛒 *Nuevo Pedido - Daily Mart*\n\n`;
  message += `👤 *Cliente:* ${customerName}\n`;
  message += `📅 *Fecha:* ${new Date().toLocaleString('es-CO')}\n\n`;
  message += `📦 *Productos:*\n`;

  items.forEach((item, i) => {
    message += `${i + 1}. ${item.productName} x${item.quantity} — $${item.subtotal.toLocaleString('es-CO')}\n`;
  });

  message += `\n💰 *Total:* $${total.toLocaleString('es-CO')}\n`;
  message += `\n_Pedido generado desde la tienda virtual._`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${whatsappNumber}?text=${encoded}`;
};

module.exports = { generateWhatsAppLink };
