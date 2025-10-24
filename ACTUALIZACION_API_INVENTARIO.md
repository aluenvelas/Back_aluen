# Actualización del servicio API - Eliminar Inventario

## Archivo: `Front_aluen/src/services/api.js`

Agregar el método `delete` en el objeto `inventarioAPI`:

```javascript
export const inventarioAPI = {
  getAll: (params = {}) => api.get('/inventario', { params }),
  getById: (id) => api.get(`/inventario/${id}`),
  update: (id, data) => api.put(`/inventario/${id}`, data),
  delete: (id) => api.delete(`/inventario/${id}`), // 👈 AGREGAR ESTA LÍNEA
  getBajoStock: () => api.get('/inventario/alerta/bajo-stock'),
};
```

## Archivo: `Front_aluen/src/pages/Inventario.js`

### 1. Agregar estado para confirmación de eliminación:

Después de la línea donde defines los estados, agregar:

```javascript
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [itemAEliminar, setItemAEliminar] = useState(null);
```

### 2. Agregar función para eliminar:

```javascript
const handleOpenDeleteModal = (item) => {
  if (item.stockActual > 0) {
    alert('⚠️ No se puede eliminar un producto con stock disponible.\n\nPrimero ajusta el stock a 0.');
    return;
  }
  setItemAEliminar(item);
  setShowDeleteModal(true);
};

const handleConfirmDelete = async () => {
  if (!itemAEliminar) return;

  try {
    const response = await inventarioAPI.delete(itemAEliminar._id);
    alert(`✅ ${response.data.mensaje}\n\nProducto: ${response.data.nombreVela}\nCódigo: ${response.data.codigo}`);
    setShowDeleteModal(false);
    setItemAEliminar(null);
    fetchInventario(); // Recargar el inventario
  } catch (err) {
    console.error('Error al eliminar:', err);
    alert('❌ Error: ' + (err.response?.data?.error || err.message));
  }
};

const handleCloseDeleteModal = () => {
  setShowDeleteModal(false);
  setItemAEliminar(null);
};
```

### 3. Agregar botón de eliminar en la tabla:

En la columna de "Stock Actual", después del botón de ajustar, agregar:

```javascript
{usuario?.rol === 'admin' && item.stockActual === 0 && (
  <Button
    size="sm"
    variant="outline-danger"
    onClick={() => handleOpenDeleteModal(item)}
    title="Eliminar del inventario"
    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
  >
    🗑️
  </Button>
)}
```

### 4. Agregar modal de confirmación:

Al final del componente, antes del cierre del `</Container>`, agregar:

```javascript
{/* Modal de Confirmación de Eliminación */}
<Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
  <Modal.Header closeButton>
    <Modal.Title>⚠️ Confirmar Eliminación</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {itemAEliminar && (
      <>
        <Alert variant="warning">
          <strong>¿Estás seguro que deseas eliminar este producto del inventario?</strong>
        </Alert>
        <div className="mb-3">
          <p><strong>Código:</strong> {itemAEliminar.receta?.codigo || 'N/A'}</p>
          <p><strong>Nombre:</strong> {itemAEliminar.nombreVela}</p>
          <p><strong>Stock actual:</strong> {itemAEliminar.stockActual} unidades</p>
        </div>
        <Alert variant="info">
          <small>
            ℹ️ Esta acción eliminará el registro del inventario. Si produces esta vela nuevamente, 
            se creará un nuevo registro.
          </small>
        </Alert>
      </>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleCloseDeleteModal}>
      Cancelar
    </Button>
    <Button variant="danger" onClick={handleConfirmDelete}>
      🗑️ Sí, Eliminar
    </Button>
  </Modal.Footer>
</Modal>
```

---

## ✅ Funcionalidad Implementada

- **Validación**: Solo se puede eliminar productos con stock = 0
- **Botón visible**: Solo aparece cuando el stock es 0 y el usuario es admin
- **Confirmación**: Modal de seguridad antes de eliminar
- **Logs**: Registro en consola del backend
- **Feedback**: Mensaje de confirmación al usuario


