const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Añadido para manejo de carpetas
const app = express();

// --- CONFIGURACIONES BÁSICAS ---
app.set('view engine', 'ejs'); // Usaremos EJS para las vistas
app.use(express.urlencoded({ extended: false })); // Para entender los datos de los formularios
app.use(express.static(path.join(__dirname, 'public'))); // Carpeta pública para estilos y fotos

// --- CONFIGURACIÓN DE LA BASE DE DATOS (TiDB Cloud / Nube) ---
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    user: process.env.DB_USER || '2RMXZeriWc8NC2X.root',
    password: process.env.DB_PASSWORD || '1xwFjRrANpB1P7l4',
    database: process.env.DB_NAME || 'test',
    port: process.env.DB_PORT || 4000,
    ssl: {
        rejectUnauthorized: false // Requisito obligatorio para TiDB Cloud
    }
});

db.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('¡Conectado a la base de datos MySQL exitosamente!');
});

// --- CONFIGURACIÓN DE MULTER PARA SUBIR FOTOS ---
// Nos aseguramos de que la carpeta exista (esto previene el error en Render)
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Las fotos se guardarán en esta carpeta
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Le damos un nombre único a la foto para que no se sobreescriba
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- RUTAS DE LA APLICACIÓN ---

// Ruta principal (Inicio)
app.get('/', (req, res) => {
    res.render('index'); // Renderiza views/index.ejs
});

// ==========================================
// CRUD PARA VENDEDORES
// ==========================================

// 1. Listar Vendedores (Read)
app.get('/vendedores', (req, res) => {
    const query = 'SELECT * FROM vendedores';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('vendedores/index', { vendedores: results });
    });
});

// 2. Mostrar formulario para Crear Vendedor
app.get('/vendedores/crear', (req, res) => {
    res.render('vendedores/create');
});

// 3. Guardar nuevo Vendedor en BD (Create) - ¡Aquí usamos upload.single para la foto!
app.post('/vendedores/crear', upload.single('foto_vendedor'), (req, res) => {
    const { nombre } = req.body;
    // Si el usuario subió una foto, guardamos el nombre del archivo, sino 'default.jpg'
    const foto = req.file ? req.file.filename : 'default.jpg';

    const query = 'INSERT INTO vendedores (nombre, foto_vendedor) VALUES (?, ?)';
    db.query(query, [nombre, foto], (err, results) => {
        if (err) throw err;
        res.redirect('/vendedores'); // Redirigimos a la lista
    });
});

// 4. Mostrar formulario para Editar Vendedor
app.get('/vendedores/editar/:id', (req, res) => {
    const id = req.params.id;
    const query = 'SELECT * FROM vendedores WHERE id_vendedor = ?';
    db.query(query, [id], (err, results) => {
        if (err) throw err;
        // Pasamos los datos del vendedor a la vista
        res.render('vendedores/edit', { vendedor: results[0] });
    });
});

// 5. Actualizar Vendedor en BD (Update)
app.post('/vendedores/editar/:id', upload.single('foto_vendedor'), (req, res) => {
    const id = req.params.id;
    const { nombre } = req.body;
    let query, params;

    // Verificamos si subió una foto nueva
    if (req.file) {
        query = 'UPDATE vendedores SET nombre = ?, foto_vendedor = ? WHERE id_vendedor = ?';
        params = [nombre, req.file.filename, id];
    } else {
        // Si no subió foto, solo actualizamos el nombre
        query = 'UPDATE vendedores SET nombre = ? WHERE id_vendedor = ?';
        params = [nombre, id];
    }

    db.query(query, params, (err, results) => {
        if (err) throw err;
        res.redirect('/vendedores');
    });
});

// 6. Eliminar Vendedor (Delete)
// Usamos GET para simplificar en lugar de un formulario con method DELETE (ya que somos novatos)
app.get('/vendedores/eliminar/:id', (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM vendedores WHERE id_vendedor = ?';
    db.query(query, [id], (err, results) => {
        if (err) throw err;
        res.redirect('/vendedores');
    });
});

// ==========================================
// CRUD PARA VENTAS (fotoVentas)
// ==========================================

// 1. Listar Ventas (Read) - Usando INNER JOIN
app.get('/ventas', (req, res) => {
    // Aquí hacemos el INNER JOIN para obtener el nombre del vendedor
    const query = `
        SELECT fotoVentas.id_venta, fotoVentas.fecha, fotoVentas.total, vendedores.nombre AS nombre_vendedor
        FROM fotoVentas
        INNER JOIN vendedores ON fotoVentas.id_vendedor = vendedores.id_vendedor
    `;
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('ventas/index', { ventas: results });
    });
});

// 2. Mostrar formulario para Crear Venta
app.get('/ventas/crear', (req, res) => {
    // Necesitamos los vendedores para mostrarlos en el desplegable (select)
    const query = 'SELECT * FROM vendedores';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('ventas/create', { vendedores: results });
    });
});

// 3. Guardar nueva Venta (Create)
app.post('/ventas/crear', (req, res) => {
    const { fecha, total, id_vendedor } = req.body;
    const query = 'INSERT INTO fotoVentas (fecha, total, id_vendedor) VALUES (?, ?, ?)';
    db.query(query, [fecha, total, id_vendedor], (err, results) => {
        if (err) throw err;
        res.redirect('/ventas');
    });
});

// 4. Mostrar formulario para Editar Venta
app.get('/ventas/editar/:id', (req, res) => {
    const id = req.params.id;
    const queryVenta = 'SELECT * FROM fotoVentas WHERE id_venta = ?';
    const queryVendedores = 'SELECT * FROM vendedores';

    // Ejecutamos las dos consultas
    db.query(queryVenta, [id], (err, resultVenta) => {
        if (err) throw err;
        db.query(queryVendedores, (err, resultVendedores) => {
            if (err) throw err;
            res.render('ventas/edit', {
                venta: resultVenta[0],
                vendedores: resultVendedores
            });
        });
    });
});

// 5. Actualizar Venta (Update)
app.post('/ventas/editar/:id', (req, res) => {
    const id = req.params.id;
    const { fecha, total, id_vendedor } = req.body;

    const query = 'UPDATE fotoVentas SET fecha = ?, total = ?, id_vendedor = ? WHERE id_venta = ?';
    db.query(query, [fecha, total, id_vendedor, id], (err, results) => {
        if (err) throw err;
        res.redirect('/ventas');
    });
});

// 6. Eliminar Venta (Delete)
app.get('/ventas/eliminar/:id', (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM fotoVentas WHERE id_venta = ?';
    db.query(query, [id], (err, results) => {
        if (err) throw err;
        res.redirect('/ventas');
    });
});

// --- INICIAR EL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor en puerto${PORT}`);
});
