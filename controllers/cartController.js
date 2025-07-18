// Controlador de carrito (demo en memoria)
let carritos = {};

const saveCart = (req, res) => {
  const { userId, carrito } = req.body;
  if (!userId || !Array.isArray(carrito)) {
    return res.status(400).json({ message: 'Datos inválidos' });
  }
  carritos[userId] = carrito;
  res.json({ message: 'Carrito guardado' });
};

const getCart = (req, res) => {
  const { userId } = req.params;
  if (!carritos[userId]) {
    return res.status(404).json({ message: 'Carrito no encontrado' });
  }
  res.json(carritos[userId]);
};

const deleteCartItem = (req, res) => {
  const { userId, productId } = req.params;
  if (!carritos[userId]) return res.status(404).json({ message: 'Carrito no encontrado' });
  carritos[userId] = carritos[userId].filter(item => item.id !== productId);
  res.json({ message: 'Producto eliminado del carrito' });
};

module.exports = { saveCart, getCart, deleteCartItem }; 