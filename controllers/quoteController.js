const PDFDocument = require('pdfkit');

let cotizaciones = [];

/**
 * ========================================
 * CONFIGURACIÓN DE CORREOS ELECTRÓNICOS
 * ========================================
 * 
 * Este objeto mapea cada tipo de servicio a una lista de correos destinatarios.
 * 
 * INSTRUCCIONES PARA CONFIGURAR CORREOS:
 * 
 * 1. Modifica los arrays de correos según el tipo de servicio:
 *    - 'venta': Correos que recibirán cotizaciones de venta
 *    - 'servicio de mantenimiento': Correos para solicitudes de mantenimiento
 *    - 'renta': Correos para solicitudes de renta
 * 
 * 2. Puedes agregar múltiples correos en cada array:
 *    Ejemplo: 'venta': ['ventas@neumaticstool.com', 'gerente@neumaticstool.com']
 * 
 * 3. Para agregar nuevos tipos de servicio, simplemente añade una nueva línea:
 *    Ejemplo: 'instalacion': ['instalacion@neumaticstool.com']
 * 
 * 25. IMPORTANTE: Revisa también la línea 346 donde hay un override forzado para pruebas.
 */
const correosPorServicio = {
  'venta': ['arturo.lopez@neumaticstool.com', 'divisionmineria@neumaticstool.com'],
  'servicio de mantenimiento': ['divisionmineria@neumaticstool.com', 'ntservicios@neumaticstool.com'],
  'renta': ['divisionmineria@neumaticstool.com']
};

// El controlador ahora delega el envío de correos al frontend.
// Esta versión genera el PDF y lo devuelve como descarga (si ?descargar=1)
// o como base64 en JSON para que el frontend pueda enviar correos con el adjunto.

const sendQuote = async (req, res) => {
  // Nota: el backend ya no envía correos. Solo genera el PDF y lo devuelve.

  const { carrito, nombre, telefono, email, servicio, descripcion } = req.body;
  console.log('Iniciando sendQuote con datos:', { carrito: carrito ? carrito.length : 0, nombre, telefono, email, servicio });

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
  // Agregar el correo del cliente si existe y no está ya incluido
  if (email && typeof email === 'string' && email.trim() !== '') {
    const clientEmail = email.trim();
    if (!correosDestino.some(dest => dest.toLowerCase() === clientEmail.toLowerCase())) {
      correosDestino.push(clientEmail);
    }
  }

  console.log('Correos destino finales:', correosDestino);

  // Guardar cotización en memoria
  const cotizacion = { carrito, nombre, telefono, email, fecha: new Date(), servicio, correosDestino };
  cotizaciones.push(cotizacion);

  // Generar PDF en memoria
  try {
    console.log('Generando PDF...');
    const pdfBuffer = await generarPDFCotizacionBuffer({ carrito, nombreCliente: nombre, telefonoCliente: telefono, emailCliente: email, servicio, descripcion });
    console.log('PDF generado exitosamente, tamaño:', pdfBuffer.length);

    // Si la petición incluye ?descargar=1, devolver el PDF como attachment (download)
    if (req.query.descargar === '1') {
      console.log('Descargando PDF en lugar de enviar correo');
      // Compatibilidad con descarga directa y seguridad CORS/iframe.
      // Permitimos explícitamente el dominio principal y algunos orígenes
      // de desarrollo. Evitamos usar '*' para Access-Control-Allow-Origin
      // cuando el contenido puede contener datos sensibles.
      const allowedOrigins = [
        'https://www.neumaticstool.com',
        'http://localhost:5173',
        'http://localhost:5174',
        'https://nt-catalog.vercel.app'
      ];
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        // Fallback a dominio principal para peticiones desde navegadores
        res.setHeader('Access-Control-Allow-Origin', 'https://www.neumaticstool.com');
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      // Incluir Access-Control-Allow-Origin aquí solo para cubrir preflight si
      // el cliente lo envía por error. Idealmente el cliente NO debe enviar
      // este header; el servidor lo establece en la respuesta.
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Access-Control-Allow-Origin');
      // No exponemos cookies ni credenciales en este endpoint
      res.setHeader('Access-Control-Allow-Credentials', 'false');

      // Permitir que este recurso (PDF) sea embebido en iframes desde el dominio
      // autorizado. Si quieres permitir más orígenes, añádelos a allowedOrigins
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://www.neumaticstool.com");

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="NT_Cotizacion_${nombre}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    }

    // Para uso desde el frontend: devolver el PDF en base64 y los correos destino
    const pdfBase64 = pdfBuffer.toString('base64');
    return res.json({
      message: 'PDF generado, el frontend debe gestionar el envío de correos',
      success: true,
      pdfBase64,
      nombre,
      telefono,
      email,
      servicio,
      correosDestino
    });
  } catch (err) {
    console.error('Error general en sendQuote:', err);
    res.status(500).json({ message: 'Error enviando correo', error: err.message });
  }
};

function generarPDFCotizacionBuffer({ carrito, nombreCliente, telefonoCliente, emailCliente, servicio, descripcion }) {
  return new Promise((resolve, reject) => {
    console.log('Iniciando generación de PDF con datos:', {
      productos: carrito.length,
      cliente: nombreCliente,
      email: emailCliente,
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
    if (emailCliente) {
      doc.text(`Email: ${emailCliente}`);
    }
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
  // Legacy placeholder — no-op. Use sendEmailServer endpoint instead for server-side sending.
  throw new Error('enviarCorreo ya no está soportado en el backend. Use POST /routes/quote/send');
}

/**
 * Envia por correo la cotización (PDF en base64) desde el servidor usando Brevo.
 * Espera en el body: { pdfBase64, nombre, telefono, servicio, correosDestino }
 */
async function sendEmailServer(req, res) {
  const { pdfBase64, nombre, telefono, email, servicio, correosDestino, carrito, descripcion } = req.body;
  try {
    let buffer;

    if (pdfBase64 && typeof pdfBase64 === 'string') {
      buffer = Buffer.from(pdfBase64, 'base64');
    } else if (carrito && Array.isArray(carrito) && carrito.length > 0) {
      // Generar PDF desde el carrito recibido
      buffer = await generarPDFCotizacionBuffer({ carrito, nombreCliente: nombre, telefonoCliente: telefono, emailCliente: email, servicio, descripcion });
    } else {
      return res.status(400).json({ success: false, message: 'Se requiere pdfBase64 o carrito para generar el PDF' });
    }

    // Determinar destinatarios: usar correosDestino si viene, sino mapear por servicio, sino fallback a env
    let destinatarios = [];
    if (Array.isArray(correosDestino) && correosDestino.length > 0) destinatarios = correosDestino;
    else if (typeof correosDestino === 'string' && correosDestino.trim() !== '') destinatarios = [correosDestino.trim()];
    else if (servicio && correosPorServicio[servicio]) destinatarios = correosPorServicio[servicio];
    else if (process.env.TO_MAIL_USER) destinatarios = [process.env.TO_MAIL_USER];

    // Asegurarse de que el email del cliente esté en los destinatarios si se proporciona en el body (redundancia por seguridad)
    /*
    if (email && typeof email === 'string' && email.trim() !== '') {
      const clientEmail = email.trim();
      if (!destinatarios.some(d => d.toLowerCase() === clientEmail.toLowerCase())) {
        destinatarios.push(clientEmail);
      }
    }
    */

    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay destinatarios configurados' });
    }

    // ========================================================================
    // ⚠️  OVERRIDE DE DESTINATARIOS PARA PRUEBAS - LEER ANTES DE PRODUCCIÓN ⚠️
    // ========================================================================
    // 
    // ESTA LÍNEA SOBRESCRIBE TODOS LOS DESTINATARIOS Y ENVÍA TODOS LOS CORREOS
    // A LA CUENTA DE PRUEBAS: cesar_urrutia_dev4383@proton.me
    // 
    // 🔧 PARA ACTIVAR EN PRODUCCIÓN:
    // 
    // 1. COMENTA O ELIMINA la siguiente línea (línea 346):
    //    destinatarios = ['cesar_urrutia_dev4383@proton.me'];
    // 
    // 2. COMENTA O ELIMINA el console.log de la línea 347
    // 
    // 3. Los correos se enviarán según la configuración de 'correosPorServicio'
    //    definida al inicio de este archivo (líneas 6-24)
    // 
    // 4. Verifica que los correos en 'correosPorServicio' sean los correctos
    //    antes de desplegar a producción
    // 
    // ========================================================================
    // destinatarios = ['cesar_urrutia_dev4383@proton.me']; // ⚠️ COMENTAR ESTA LÍNEA PARA PRODUCCIÓN
    //console.log('📨 Enviando correos a los siguientes destinatarios:', destinatarios);
    // ========================================================================

    // Configuración de Brevo
    const brevo = require('@getbrevo/brevo');
    const apiInstance = new brevo.TransactionalEmailsApi();

    // Configurar API Key
    const apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    if (!process.env.BREVO_API_KEY) {
      return res.status(500).json({ success: false, message: 'BREVO_API_KEY no configurada en el servidor' });
    }

    // Preparar el archivo adjunto en base64
    const pdfBase64Content = buffer.toString('base64');
    const fileName = `NT_Cotizacion_${(nombre || 'cotizacion').replace(/\s+/g, '_')}.pdf`;

    // Preparar el email
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || 'Neumatics Tool',
      email: process.env.BREVO_SENDER_EMAIL || 'contacto@neumaticstool.com'
    };

    sendSmtpEmail.to = destinatarios.map(email => ({ email }));

    sendSmtpEmail.subject = `Cotización - ${nombre || 'Cliente'}`;

    sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #FF8F1C;">Nueva Cotización - Neumatics Tool</h2>
            <p>Se ha generado una nueva cotización con los siguientes datos:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Cliente:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${nombre || 'No especificado'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Teléfono:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${telefono || 'No especificado'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${email || 'No especificado'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Servicio:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${servicio || 'No especificado'}</td>
              </tr>
            </table>
            <p>El PDF con los detalles de la cotización se encuentra adjunto a este correo.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
              <strong>Neumatics Tool</strong><br>
              Blvd. Luis Donaldo Colosio #1007, 34217, Durango, México<br>
              Tel: 618 818 21 82 | contacto@neumaticstool.com
            </p>
          </div>
        </body>
      </html>
    `;

    sendSmtpEmail.attachment = [{
      content: pdfBase64Content,
      name: fileName
    }];

    // Enviar el email
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Correo enviado desde servidor con Brevo, info:', data);
    return res.json({ success: true, info: data });
  } catch (err) {
    console.error('Error en sendEmailServer con Brevo:', err);
    return res.status(500).json({ success: false, message: 'Error enviando correo desde servidor', error: err.message });
  }
}

module.exports = { sendQuote, sendEmailServer };