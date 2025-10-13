const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
// fs y path eliminados porque ya no se usan

let cotizaciones = [];

const sendQuote = async (req, res) => {
  const { carrito, nombre, telefono, servicio, descripcion } = req.body;
  if (!carrito || !nombre || !telefono) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  // Definir correos por servicio para que la cotizacion sea enviada segun corresponda
  const correosPorServicio = {
    'venta': ['cesar_urrutia_dev4383@proton.me'],
    'mantenimiento': ['cesar_urrutia_dev4383@proton.me','cesar_urrutia_dev4383@proton.me'],
    'renta': ['cesar_urrutia_dev4383@proton.me']
    /*'venta': ['arturo.lopez@neumaticstool.com'],
    'mantenimiento': ['ventasnt@neumaticstool.com','serviciosnt@neumaticstool.com'],
    'renta': ['divisionmineria@neumaticstool.com']*/
  };

  // Obtener correos del servicio, o default si no coincide
  const correosServicio = correosPorServicio[servicio] || ['contacto@neumaticstool.com'];

  // Combinar con correos adicionales del body si existen
  let correosDestino = [...correosServicio];
  if (req.body.destinoCorreo) {
    if (Array.isArray(req.body.destinoCorreo)) {
      correosDestino = [...correosDestino, ...req.body.destinoCorreo];
    } else {
      correosDestino.push(req.body.destinoCorreo);
    }
  }

  // Guardar cotización en memoria
  const cotizacion = { carrito, nombre, telefono, fecha: new Date(), servicio, correosDestino };
  cotizaciones.push(cotizacion);

  // Generar PDF en memoria
  try {
    const pdfBuffer = await generarPDFCotizacionBuffer({ carrito, nombreCliente: nombre, telefonoCliente: telefono, servicio, descripcion });
    // Si la petición incluye ?descargar=1, solo devolver el PDF
    if (req.query.descargar === '1') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="NT_Cotizacion.pdf"+"nombre"');
      return res.end(pdfBuffer);
    }
    // Enviar correo a todos los correos destino
    for (const correo of correosDestino) {
      await enviarCorreo({ to: correo, subject: `Neumatics Tool || Cotización de ${servicio || 'Servicio'} Entrante`, text: 'Cotizacion Entrante de: ' + nombre + ' - ' + telefono, pdfBuffer });
    }
    res.json({ message: 'Cotización enviada correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error enviando correo', error: err });
  }
};

function generarPDFCotizacionBuffer({ carrito, nombreCliente, telefonoCliente, servicio, descripcion }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Cabecera
    doc.fontSize(20).font('Helvetica-Bold').text('Neumatics Tool');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').text('Dirección: Blvd. Luis Donaldo Colosio #1007, 34217, Durango, México');
    doc.text('Tel: 618 818 21 82  | contacto@neumaticstool.com');
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#FF8F1C').font('Helvetica-Bold').text('COTIZACIÓN');
    doc.fillColor('black').fontSize(11).font('Helvetica');
    doc.moveDown(0.5);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
    doc.text(`Cliente: ${nombreCliente}`);
    doc.text(`Teléfono: ${telefonoCliente}`);
    doc.moveDown(1.5);

    // Tabla de productos dinámica
    doc.fontSize(12).font('Helvetica-Bold').text('Productos:', { underline: true });
    doc.moveDown(0.5);

    // Determinar columnas dinámicamente
    const allKeys = carrito.reduce((keys, item) => {
      Object.keys(item).forEach(k => {
        if (!keys.includes(k)) keys.push(k);
      });
      return keys;
    }, []);
    const columns = allKeys;
    const colCount = columns.length;
    const totalWidth = 480;
    const colWidth = totalWidth / colCount;
    const startX = doc.x;
    let y = doc.y;

    // Encabezados
    doc.lineWidth(1.2);
    doc.rect(startX, y, totalWidth, 24).stroke();
    columns.forEach((col, i) => {
      doc.text(col.charAt(0).toUpperCase() + col.slice(1), startX + i * colWidth + 5, y + 7, { width: colWidth - 10, align: 'center' });
      // Línea vertical entre columnas del encabezado
      if (i < columns.length - 1) {
        doc.moveTo(startX + (i + 1) * colWidth, y).lineTo(startX + (i + 1) * colWidth, y + 24).stroke();
      }
    });
    doc.font('Helvetica');
    y += 24;

    // Filas de productos
    carrito.forEach((item) => {
      let maxHeight = 20;
      const cellHeights = columns.map((col) => {
        const text = item[col] !== undefined ? String(item[col]) : '';
        return doc.heightOfString(text, { width: colWidth - 10, align: 'center' });
      });
      maxHeight = Math.max(...cellHeights, 20);

      // Dibuja el rectángulo de la fila
      doc.rect(startX, y, totalWidth, maxHeight).stroke();

      // Dibuja cada celda en su área correspondiente
      columns.forEach((col, i) => {
        const text = item[col] !== undefined ? String(item[col]) : '';
        doc.text(text, startX + i * colWidth + 5, y + 6, {
          width: colWidth - 10,
          align: 'center',
          height: maxHeight - 12
        });
        // Línea vertical entre columnas de la fila
        if (i < columns.length - 1) {
          doc.moveTo(startX + (i + 1) * colWidth, y).lineTo(startX + (i + 1) * colWidth, y + maxHeight).stroke();
        }
      });

      y += maxHeight + 2;
    });

    // Línea final de la tabla de productos
    doc.moveTo(startX, y).lineTo(startX + totalWidth, y).stroke();
    y += 20;

    // Sincroniza la posición vertical antes de la descripción
    doc.y = y;

    // Tabla de descripción de servicio (solo si existe descripción)
    if (descripcion && descripcion.trim() !== '') {
      doc.moveDown(1);

      const anchoTabla = totalWidth;
      const altoTitulo = 25;
      const startXDesc = startX;
      const startYDesc = doc.y;

      doc.lineWidth(2);
      // Rectángulo del título
      doc.rect(startXDesc, startYDesc, anchoTabla, altoTitulo).stroke();

      doc.fillColor('#FF8F1C').font('Helvetica-Bold').fontSize(14);
      doc.text('Descripción del Servicio Solicitado', startXDesc + 10, startYDesc + 8, {
        width: anchoTabla - 20,
        align: 'center'
      });

      // Posición para el texto de la descripción
      const descY = startYDesc + altoTitulo + 10;
      doc.y = descY; // Mueve el cursor a la posición correcta
      doc.fillColor('black').font('Helvetica').fontSize(11);

      // Opciones para el texto
      const descOptions = {
        width: anchoTabla - 30,
        align: 'justify'
      };

      // Guarda la posición inicial antes de escribir el texto
      const descTextStartY = doc.y;
      doc.text(descripcion, startXDesc + 15, doc.y, descOptions);
      // Calcula el alto real del texto
      const descTextEndY = doc.y;
      const descHeight = descTextEndY - descTextStartY + 20;

      // Dibuja el rectángulo alrededor del texto de la descripción
      doc.rect(startXDesc, descTextStartY - 10, anchoTabla, descHeight).stroke();

      // Actualiza la posición vertical para el siguiente contenido
      doc.y = descTextStartY - 10 + descHeight + 10;
    }

    // Usa doc.y para el resto del contenido
    y = doc.y;

    // Total de productos
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