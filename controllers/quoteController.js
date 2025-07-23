const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
// fs y path eliminados porque ya no se usan

let cotizaciones = [];

const sendQuote = async (req, res) => {
  const { carrito, nombre, telefono } = req.body;
  // Fijar destinatario para pruebas
  //const correoDestino = process.env.TO_MAIL_USER;
  if (!carrito || !nombre || !telefono) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }
  // Guardar cotización en memoria
  const cotizacion = { carrito, nombre, telefono, fecha: new Date(), destinoCorreo: req.body.destinoCorreo };
  cotizaciones.push(cotizacion);

  // Generar PDF en memoria
  try {
    const pdfBuffer = await generarPDFCotizacionBuffer({ carrito, nombreCliente: nombre, telefonoCliente: telefono });
    // Si la petición incluye ?descargar=1, solo devolver el PDF
    if (req.query.descargar === '1') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="NT_Cotizacion.pdf"+"nombre"');
      return res.end(pdfBuffer);
    }
    // Enviar correo normalmente
    if (Array.isArray(req.body.destinoCorreo)) {
      for (const correo of req.body.destinoCorreo) {
        await enviarCorreo({ to: correo, subject: `Neumaticos Tool || Cotización de ${req.body.servicio} Entrante`, text: 'Cotizacion Entrante de: ' + nombre + ' - ' + telefono, pdfBuffer });
      }
    } else {
      await enviarCorreo({ to: correoDestino, subject: `Neumaticos Tool || Cotización de ${req.body.servicio} Entrante`, text: 'Cotizacion Entrante de: ' + nombre + ' - ' + telefono, pdfBuffer });
    }
    res.json({ message: 'Cotización enviada correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error enviando correo', error: err });
  }
};

function generarPDFCotizacionBuffer({ carrito, nombreCliente, telefonoCliente }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    // Cabecera
    doc.fontSize(18).font('Helvetica-Bold').text('Neumatics Tool');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').text('Dirección: Calle Ejemplo 123, Ciudad');
    doc.text('Tel: 555-123-4567 | contacto@neumaticstool.com');
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#FF8F1C').font('Helvetica-Bold').text('COTIZACIÓN');
    doc.fillColor('black').fontSize(11).font('Helvetica');
    doc.moveDown(0.5);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
    doc.text(`Cliente: ${nombreCliente}`);
    doc.text(`Teléfono: ${telefonoCliente}`);
    doc.moveDown(1.5);
    // Tabla de productos
    doc.fontSize(12).font('Helvetica-Bold').text('Productos:', { underline: true });
    doc.moveDown(0.5);
    // Tabla
    const colWidths = [180, 100, 120, 80]; // Producto, Marca, Propósito, Cantidad
    const totalWidth = colWidths.reduce((a, b) => a + b);
    const startX = doc.x;
    let y = doc.y;
    // Encabezados
    doc.lineWidth(1.2);
    doc.rect(startX, y, totalWidth, 24).stroke();
    doc.text('Producto', startX + 5, y + 7, { width: colWidths[0] - 10 });
    doc.text('Marca', startX + colWidths[0] + 5, y + 7, { width: colWidths[1] - 10 });
    doc.text('Propósito', startX + colWidths[0] + colWidths[1] + 5, y + 7, { width: colWidths[2] - 10 });
    doc.text('Cantidad', startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, y + 7, { width: colWidths[3] - 10 });
    doc.font('Helvetica');
    y += 24;
    // Filas
    carrito.forEach((item) => {
      doc.rect(startX, y, totalWidth, 20).stroke();
      doc.text(item.nombre, startX + 5, y + 6, { width: colWidths[0] - 10 });
      doc.text(item.marca, startX + colWidths[0] + 5, y + 6, { width: colWidths[1] - 10 });
      doc.text(item.proposito, startX + colWidths[0] + colWidths[1] + 5, y + 6, { width: colWidths[2] - 10 });
      doc.text(item.cantidad.toString(), startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, y + 6, { width: colWidths[3] - 10, align: 'center' });
      y += 20;
    });
    // Total
    doc.moveTo(startX, y).lineTo(startX + totalWidth, y).stroke();
    doc.font('Helvetica-Bold').text(`Total de productos: ${carrito.reduce((sum, item) => sum + (item.cantidad || 0), 0)}`, startX, y + 10);
    doc.font('Helvetica').fillColor('gray').text('Gracias por su preferencia. La empresa se pondrá en contacto con usted.', startX, y + 35);
    doc.end();
  });
}

async function enviarCorreo({ to, subject, text, pdfBuffer }) {
  // Configura tu transporte SMTP real aquí
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject,
    text,
    attachments: [{ filename: 'Cotizacion.pdf', content: pdfBuffer }]
  });
}

module.exports = { sendQuote }; 