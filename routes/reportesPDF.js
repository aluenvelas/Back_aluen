const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Venta = require('../models/Venta');

// Función helper para formatear moneda
const formatCurrency = (amount) => {
  return `$${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

// Función helper para formatear fecha
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// GET /api/reportes-pdf/ventas - Generar PDF de reporte de ventas
router.get('/ventas', async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    // Construir query
    const query = { estado: 'completada' };
    if (fechaInicio || fechaFin) {
      query.fecha = {};
      if (fechaInicio) query.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) query.fecha.$lte = new Date(fechaFin);
    }
    
    // Obtener datos
    const ventas = await Venta.find(query)
      .populate('items.receta', 'nombre')
      .populate('items.frasco', 'nombre')
      .sort({ fecha: -1 });
    
    // Si no hay ventas, generar PDF con mensaje
    if (ventas.length === 0) {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=reporte-ventas-sin-datos-${Date.now()}.pdf`);
      
      doc.pipe(res);
      
      doc.fontSize(20).font('Helvetica-Bold').text('VELAS ARTESANALES', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).text('REPORTE DE VENTAS', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica').text('No hay ventas registradas en el periodo seleccionado.', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(10).text(`Fecha de generacion: ${formatDate(new Date())}`, { align: 'center' });
      
      doc.end();
      return;
    }
    
    // Estadísticas
    const totalVentas = ventas.length;
    const ingresosTotales = ventas.reduce((sum, v) => sum + v.total, 0);
    
    // Productos más vendidos
    const productosMap = {};
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        if (item.receta && item.receta._id) {
          const key = item.receta._id.toString();
          if (!productosMap[key]) {
            productosMap[key] = {
              nombre: item.receta.nombre || 'Sin nombre',
              cantidad: 0,
              ingresos: 0
            };
          }
          productosMap[key].cantidad += item.cantidad || 0;
          productosMap[key].ingresos += item.subtotal || 0;
        }
      });
    });
    
    const productosMasVendidos = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
    
    // Ventas por método de pago
    const metodoPagoMap = {};
    ventas.forEach(venta => {
      const metodo = venta.metodoPago || 'efectivo';
      if (!metodoPagoMap[metodo]) {
        metodoPagoMap[metodo] = { count: 0, total: 0 };
      }
      metodoPagoMap[metodo].count++;
      metodoPagoMap[metodo].total += venta.total || 0;
    });
    
    // Crear PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-ventas-${Date.now()}.pdf`);
    
    doc.pipe(res);
    
    // Encabezado
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('VELAS ARTESANALES', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(16)
       .text('REPORTE DE VENTAS', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Fecha de generacion: ${formatDate(new Date())}`, { align: 'center' });
    
    if (fechaInicio || fechaFin) {
      const periodo = `Periodo: ${fechaInicio ? formatDate(fechaInicio) : 'Inicio'} - ${fechaFin ? formatDate(fechaFin) : 'Hoy'}`;
      doc.text(periodo, { align: 'center' });
    }
    
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);
    
    // Resumen Ejecutivo
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('RESUMEN EJECUTIVO', { underline: true });
    
    doc.moveDown(0.5);
    doc.fontSize(11)
       .font('Helvetica');
    
    const startY = doc.y;
    
    // Columna izquierda
    doc.text('Total de Ventas:', 50, startY);
    doc.text('Ingresos Totales:', 50, startY + 20);
    doc.text('Ticket Promedio:', 50, startY + 40);
    
    // Columna derecha
    doc.font('Helvetica-Bold');
    doc.text(totalVentas.toString(), 200, startY);
    doc.text(formatCurrency(ingresosTotales), 200, startY + 20);
    doc.text(formatCurrency(totalVentas > 0 ? ingresosTotales / totalVentas : 0), 200, startY + 40);
    
    doc.moveDown(4);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);
    
    // Productos Más Vendidos
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('TOP 10 PRODUCTOS MÁS VENDIDOS');
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica-Bold');
    
    const tableTop = doc.y;
    doc.text('Producto', 50, tableTop);
    doc.text('Cantidad', 300, tableTop, { width: 80, align: 'right' });
    doc.text('Ingresos', 400, tableTop, { width: 100, align: 'right' });
    
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
    
    doc.font('Helvetica');
    let yPos = tableTop + 20;
    
    productosMasVendidos.forEach((producto, index) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      doc.text(`${index + 1}. ${producto.nombre}`, 50, yPos, { width: 240 });
      doc.text(producto.cantidad.toString(), 300, yPos, { width: 80, align: 'right' });
      doc.text(formatCurrency(producto.ingresos), 400, yPos, { width: 100, align: 'right' });
      
      yPos += 20;
    });
    
    doc.moveDown(2);
    yPos = doc.y;
    doc.moveTo(50, yPos).lineTo(545, yPos).stroke();
    doc.moveDown(1);
    
    // Ventas por Método de Pago
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('VENTAS POR MÉTODO DE PAGO');
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica-Bold');
    
    const metodosY = doc.y;
    doc.text('Método', 50, metodosY);
    doc.text('Cantidad', 250, metodosY, { width: 100, align: 'right' });
    doc.text('Total', 400, metodosY, { width: 100, align: 'right' });
    
    doc.moveTo(50, metodosY + 15).lineTo(545, metodosY + 15).stroke();
    
    doc.font('Helvetica');
    yPos = metodosY + 20;
    
    const metodosNombres = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      otro: 'Otro'
    };
    
    Object.entries(metodoPagoMap).forEach(([metodo, datos]) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      doc.text(metodosNombres[metodo] || metodo, 50, yPos);
      doc.text(datos.count.toString(), 250, yPos, { width: 100, align: 'right' });
      doc.text(formatCurrency(datos.total), 400, yPos, { width: 100, align: 'right' });
      
      yPos += 20;
    });
    
    // Nueva página para detalle de ventas
    doc.addPage();
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('DETALLE DE VENTAS');
    
    doc.moveDown(1);
    
    // Tabla de ventas
    ventas.slice(0, 50).forEach((venta, index) => {
      if (doc.y > 700) {
        doc.addPage();
      }
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text(`${venta.numeroVenta || 'S/N'} - ${formatDate(venta.fecha)}`);
      
      doc.fontSize(9)
         .font('Helvetica')
         .text(`Cliente: ${venta.cliente?.nombre || 'Sin cliente'}`);
      
      const metodo = venta.metodoPago || 'efectivo';
      doc.text(`Metodo: ${metodosNombres[metodo] || metodo} | Total: ${formatCurrency(venta.total || 0)}`);
      
      doc.moveDown(0.5);
    });
    
    // Pie de página (simplificado para evitar errores)
    doc.fontSize(8)
       .font('Helvetica')
       .text(
         'Reporte generado por Sistema de Velas Artesanales',
         50,
         doc.page.height - 50,
         { align: 'center' }
       );
    
    doc.end();
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    
    // Si ya se empezaron a enviar headers, no podemos enviar JSON
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      // Si ya se empezó a enviar el PDF, solo logueamos el error
      console.error('Error durante la generacion del PDF, headers ya enviados');
    }
  }
});

module.exports = router;
