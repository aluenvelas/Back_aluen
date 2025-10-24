/**
 * Script para probar el endpoint de Puntos de Venta
 * Verifica que el backend esté respondiendo correctamente
 */

const https = require('https');

const API_URL = 'https://back-aluen-ohbk.onrender.com';

// Función para hacer peticiones HTTP
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

async function testPuntosVenta() {
  console.log('\n🔍 DIAGNÓSTICO DE PUNTOS DE VENTA\n');
  console.log('='.repeat(60));
  
  // Test 1: Verificar la ruta raíz
  console.log('\n1️⃣ Verificando ruta raíz del backend...');
  try {
    const rootResponse = await makeRequest({
      hostname: 'back-aluen-ohbk.onrender.com',
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Estado:', rootResponse.statusCode);
    console.log('📋 Endpoints disponibles:');
    
    if (rootResponse.data.endpoints) {
      Object.keys(rootResponse.data.endpoints).forEach(key => {
        const icon = key === 'puntosVenta' ? '📍' : '  ';
        console.log(`   ${icon} ${key}: ${rootResponse.data.endpoints[key]}`);
      });
      
      if (rootResponse.data.endpoints.puntosVenta) {
        console.log('\n✅ ¡Endpoint de puntos de venta encontrado!');
      } else {
        console.log('\n❌ ¡ERROR! Endpoint de puntos de venta NO encontrado');
        console.log('   El backend no se ha actualizado en Render.');
      }
    }
  } catch (error) {
    console.error('❌ Error al conectar con el backend:', error.message);
  }
  
  // Test 2: Verificar health check
  console.log('\n2️⃣ Verificando health check...');
  try {
    const healthResponse = await makeRequest({
      hostname: 'back-aluen-ohbk.onrender.com',
      path: '/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Estado:', healthResponse.statusCode);
    console.log('📋 Respuesta:', healthResponse.data);
  } catch (error) {
    console.error('❌ Error en health check:', error.message);
  }
  
  // Test 3: Probar endpoint de puntos de venta (sin autenticación)
  console.log('\n3️⃣ Probando endpoint de puntos de venta...');
  try {
    const puntosResponse = await makeRequest({
      hostname: 'back-aluen-ohbk.onrender.com',
      path: '/api/puntos-venta',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Código de estado:', puntosResponse.statusCode);
    
    if (puntosResponse.statusCode === 401) {
      console.log('✅ Endpoint existe (requiere autenticación) ✓');
    } else if (puntosResponse.statusCode === 404) {
      console.log('❌ Endpoint NO encontrado (404)');
      console.log('   El backend NO se ha actualizado en Render.');
    } else {
      console.log('📋 Respuesta:', puntosResponse.data);
    }
  } catch (error) {
    console.error('❌ Error al probar endpoint:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 RESUMEN:');
  console.log('   - Si ves "404" o "Endpoint NO encontrado" → Render no se actualizó');
  console.log('   - Si ves "401" o "requiere autenticación" → Backend actualizado ✓');
  console.log('   - Render puede tardar 5-10 minutos en desplegar');
  console.log('\n');
}

testPuntosVenta().catch(console.error);

