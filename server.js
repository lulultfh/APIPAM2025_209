const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/product');
const orderRoutes = require('./routes/order');
const itemOrderRoutes = require('./routes/order-item');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/user', userRoutes);
app.use('/product', productRoutes); 
app.use('/pesanan', orderRoutes);
app.use('/pesanan-item', itemOrderRoutes);
app.listen(3000,'0.0.0.0', () => {
    console.log("Server berjalan di port 3000");
});