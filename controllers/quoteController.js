const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

let cotizaciones = [];

// Función para probar la conectividad de Resend
async function testEmailConnectivity() {
    console.log('Verificando conectividad del servicio de correo...');
    
    try {
        // Intentar hacer una petición simple a Resend
        const response = await fetch('https://api.resend.com/v1/emails', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            }
        });

        if (response.ok) {
            console.log('Conectividad con servicio de correo verificada');
            return true;
        } else {
            console.error('Error conectando con servicio de correo:', response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Error verificando conectividad:', error);
        return false;
    }
}

const sendQuote = async (req, res) => {
  console.log('Iniciando pruebas de conectividad...');
  
  // Verificar conectividad del servicio de correo
  const emailConnectivity = await testEmailConnectivity();
  console.log('Resultado de prueba de conectividad:', emailConnectivity ? 'EXITOSA' : 'FALLIDA');
  
  // Mostrar información del ambiente
  console.log('Variables de entorno:', {
    MAIL_SERVICE: process.env.MAIL_SERVICE,
    MAIL_PORT: process.env.MAIL_PORT,
    MAIL_SECURE: process.env.MAIL_SECURE,
    MAIL_USER: process.env.MAIL_USER ? '***configurado***' : 'NO CONFIGURADO',
    MAIL_PASS: process.env.MAIL_PASS ? '***configurado***' : 'NO CONFIGURADO',
    NODE_ENV: process.env.NODE_ENV
  });

  const { carrito, nombre, telefono, servicio, descripcion } = req.body;
  console.log('Iniciando sendQuote con datos:', { carrito: carrito ? carrito.length : 0, nombre, telefono, servicio });

  // Validación más detallada de los datos recibidos
  if (!carrito || !Array.isArray(carrito) || carrito.length === 0) {
    console.log('Carrito inválido o vacío en sendQuote');
    return res.status(400).json({ 
      message: 'El carrito está vacío o es inválido',
      success: false 
    });
  }

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    console.log('Nombre inválido en sendQuote');
    return res.status(400).json({ 
      message: 'El nombre es requerido',
      success: false 
    });
  }

  if (!telefono || typeof telefono !== 'string' || telefono.trim().length === 0) {
    console.log('Teléfono inválido en sendQuote');
    return res.status(400).json({ 
      message: 'El teléfono es requerido',
      success: false 
    });
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
  const correosServicio = correosPorServicio[servicio] || ['cesar_urrutia_dev4383@proton.me'];
  console.log('Correos de servicio:', correosServicio);

  // Combinar con correos adicionales del body si existen
  let correosDestino = [...correosServicio];
  if (req.body.destinoCorreo) {
    if (Array.isArray(req.body.destinoCorreo)) {
      correosDestino = [...correosDestino, ...req.body.destinoCorreo];
    } else {
      correosDestino.push(req.body.destinoCorreo);
    }
  }
  console.log('Correos destino finales:', correosDestino);

  // Guardar cotización en memoria
  const cotizacion = { carrito, nombre, telefono, fecha: new Date(), servicio, correosDestino };
  cotizaciones.push(cotizacion);

  // Generar PDF en memoria
  try {
    console.log('Generando PDF...');
    const pdfBuffer = await generarPDFCotizacionBuffer({ carrito, nombreCliente: nombre, telefonoCliente: telefono, servicio, descripcion });
    console.log('PDF generado exitosamente, tamaño:', pdfBuffer.length);

    // Si la petición incluye ?descargar=1, solo devolver el PDF
    if (req.query.descargar === '1') {
      console.log('Descargando PDF en lugar de enviar correo');
      // Configurar headers CORS específicos para la descarga del PDF
      res.setHeader('Access-Control-Allow-Origin', 'https://nt-catalog.vercel.app');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="NT_Cotizacion_${nombre}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    }

    // Enviar correo a todos los correos destino
    console.log('Iniciando envío de correos...');
    let errores = [];
    let exitos = [];

    for (const correo of correosDestino) {
      console.log(`Enviando correo a: ${correo}`);
      try {
        await enviarCorreo({
          to: correo,
          subject: `Neumatics Tool || Cotización de ${servicio || 'Servicio'} Entrante`,
          text: `Cotización Entrante\n\nCliente: ${nombre}\nTeléfono: ${telefono}\nServicio: ${servicio}\n\nSe adjunta PDF con los detalles.`,
          pdfBuffer
        });
        console.log(`Correo enviado exitosamente a: ${correo}`);
        exitos.push(correo);
      } catch (emailErr) {
        console.error(`Error enviando correo a ${correo}:`, emailErr);
        errores.push({ correo, error: emailErr.message });
      }
    }

    console.log('Envío de correos completado');
    
    if (errores.length > 0 && exitos.length === 0) {
      return res.status(500).json({
        message: 'Error al enviar todos los correos',
        errores,
        success: false
      });
    }

    res.json({
      message: exitos.length === correosDestino.length ? 'Cotización enviada correctamente' : 'Cotización enviada parcialmente',
      success: true,
      errores: errores.length > 0 ? errores : undefined,
      exitosos: exitos
    });
  } catch (err) {
    console.error('Error general en sendQuote:', err);
    res.status(500).json({ message: 'Error enviando correo', error: err.message });
  }
};

function generarPDFCotizacionBuffer({ carrito, nombreCliente, telefonoCliente, servicio, descripcion }) {
  return new Promise((resolve, reject) => {
    console.log('Iniciando generación de PDF con datos:', {
      productos: carrito.length,
      cliente: nombreCliente,
      servicio
    });

    const doc = new PDFDocument({ 
      margin: 40,
      size: 'A4',
      info: {
        Title: `Cotización para ${nombreCliente}`,
        Author: 'Neumatics Tool',
        Subject: `Cotización de ${servicio}`,
        Keywords: 'cotización, neumatics tool',
        CreationDate: new Date()
      }
    });

    const buffers = [];
    
    doc.on('data', chunk => {
      buffers.push(chunk);
    });

    doc.on('end', () => {
      try {
        const pdfData = Buffer.concat(buffers);
        console.log('PDF generado exitosamente, tamaño:', pdfData.length, 'bytes');
        resolve(pdfData);
      } catch (error) {
        console.error('Error al concatenar buffers del PDF:', error);
        reject(error);
      }
    });

    doc.on('error', (error) => {
      console.error('Error durante la generación del PDF:', error);
      reject(error);
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
  console.log(`Preparando envío de correo a: ${to}`);
  
  const fecha = new Date().toLocaleDateString('es-MX');
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Intento ${attempt} de ${maxRetries} para enviar correo a: ${to}`);
      
      // Usar Resend para enviar el correo
      const { data, error } = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [to],
        subject: subject,
        text: text,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF8F1C;">Nueva Cotización - Neumatics Tool</h2>
            <div style="border-left: 4px solid #FF8F1C; padding-left: 15px; margin: 20px 0;">
              <p><strong>Cliente:</strong> ${text.split('\n')[2].replace('Cliente: ', '')}</p>
              <p><strong>Teléfono:</strong> ${text.split('\n')[3].replace('Teléfono: ', '')}</p>
              <p><strong>Servicio:</strong> ${text.split('\n')[4].replace('Servicio: ', '')}</p>
              <p><strong>Fecha:</strong> ${fecha}</p>
            </div>
            <p>Se adjunta PDF con los detalles de la cotización.</p>
            <br>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Este es un correo automático, por favor no responder.<br>
              Neumatics Tool © ${new Date().getFullYear()}
            </p>
          </div>
        `,
        attachments: [{
          filename: `NT_Cotizacion_${fecha.replace(/\//g, '-')}.pdf`,
          content: pdfBuffer.toString('base64')
        }]
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`Correo enviado exitosamente a ${to} en el intento ${attempt}`);
      return data;
    } catch (error) {
      console.error(`Error en intento ${attempt}/${maxRetries}:`, {
        message: error.message
      });
      
      if (attempt < maxRetries) {
        const waitTime = Math.min(attempt * 5000, 15000);
        console.log(`Esperando ${waitTime/1000} segundos antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw new Error(`Error al enviar el correo después de ${maxRetries} intentos: ${error.message}`);
      }
    }
  }
}

module.exports = { sendQuote };