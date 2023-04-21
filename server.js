const cryptography = require('./cryptography.js');
const multer = require('multer');
const path = require('path');
const express = require('express');
const app = express();
const port = 8000;
const cookieParser = require('cookie-parser');
const mysql = require('mysql');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/resources/');
    },
    filename: function (req, file, cb) {
      const extension = file.mimetype.split('/')[1];
      cb(null, `${file.fieldname}-${Date.now()}.${extension}`);
    },
  });
  

const upload = multer({ storage: storage });


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'CloudBrainTreasure'
});


app.get('/', (req, res) => {
    var id_user = req.cookies.id;
    if(id_user){
        connection.query('SELECT * FROM users WHERE id = ?', [id_user], function (error, results, fields) {
            if(results[0].fa_enabled != 1){
                res.redirect('/2fa_autentication');
            }else{
                res.render("dashboard", {message: ""})
            }
        });
    }else{
        res.redirect('/login');
    }
});


app.get('/login', (req, res) => {
    res.render('login');
});


app.post('/login', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    if (username && password) {
        connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], function (error, results, fields) {
            if (results.length == 1) {
                res.cookie('id', results[0].id);
                res.redirect('/');
            } else {
                res.send('Incorrect Username and/or Password!');
            }
        });
    } else {
        res.send('Please enter Username and Password!');
    }
});


app.get('/register', (req, res) => {
    res.render('register');
});


app.post('/register', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;
    if (username && password && email) {
        connection.query("INSERT INTO `users` (`id`, `username`, `password`, `email`, `fa_enabled`) VALUES (NULL, ?, ?, ?, '0');", [username, password, email], function (error, results, fields) {
            res.redirect('/login');
        });
    } else {
        res.send('Please fill all the inputs!');
    }
    
});


app.get('/dashboard', (req, res) => {
    if (req.cookies.id) {
        connection.query('SELECT * FROM users WHERE id = ?', [req.cookies.id], function (error, results, fields) {
            if(results[0].fa_enabled != 1){
                res.redirect('/2fa_autentication');
            }
            if (results.length == 1) {
                res.render('dashboard');
            } else {
                res.redirect('/login');
            }
        });
    } else {
        res.redirect('/login');
    }
});


app.get('/2fa_autentication', (req, res) => {
    var code = cryptography.generateRandomNumber();
    console.log(code);
    if (req.cookies.id) {
        connection.query('SELECT * FROM users WHERE id = ?', [req.cookies.id], function (error, results, fields) {
            var fa_enabled = results[0].fa_enabled;
            if (results.length == 1) {
                if (fa_enabled == 1) {
                    res.redirect('/');
                } else if (fa_enabled == 0) {
                    res.cookie('code', code);
                    res.render('2fa_autentication');
                }
            } else {
                res.redirect('/');
            }
        });
    }
});


app.post('/2fa_autentication', (req, res) => {
    var auth_code = req.body.code;
    var code = req.cookies.code;

    if (auth_code == code) {
        connection.query('UPDATE users SET fa_enabled = 1 WHERE id = ?', [req.cookies.id], function (error, results, fields) {
            res.redirect('/');
        });
    } else {
        res.send('Incorrect code!');
        app.render('2fa_autentication');
    }
});


app.get('/add_recurso', (req, res) => {
    if(req.cookies.id){
        connection.query('SELECT * FROM users WHERE id = ?', [req.cookies.id], function (error, results, fields) {
            if(results[0].fa_enabled != 1){
                res.redirect('/2fa_autentication');
            }
            if (results.length == 1) {
                connection.query("SELECT * FROM disciplinas", function (error, results, fields) {
                    res.render('add_recurso', {disciplinas: results, error: ""});
                });
            } else {
                res.redirect('/');
            }
        });
}
});


app.post('/add_recurso', upload.single('file'), (req, res) => {
    var titulo = req.body.title;
    var descricao = req.body.description;
    var disciplina = req.body.discipline;
    var id_user = req.cookies.id;
    var data = new Date();
    var data_str = data.getDate() + "-" + (data.getMonth()+1) + "-" + data.getFullYear();
    var file = req.file;
    var file_name = file.filename;
    var file_type = file.mimetype;
    var file_path = file.path;
    console.log(file_name);

    if (disciplina == "other"){
        var disciplina = req.body.other_discipline;
        connection.query("SELECT * FROM disciplinas WHERE nome = ?", [disciplina], function (error, results, fields) {
            if(results.length == 0){
                connection.query("INSERT INTO `disciplinas` (`id`, `nome`) VALUES (NULL, ?);", [disciplina], function (error, results, fields) {
                    if(error)throw error;
                });
        }else{
            connection.query("SELECT * FROM disciplinas", function (error, results, fields) {
                res.render('add_recurso', {disciplinas: results, error: "Disciplina já existente!"});
            });
        }
    });
    }
    connection.query("SELECT * FROM resources WHERE title = ?", [titulo], function (error, results, fields) {
        if(error) throw error;
        if(results.length == 1){
            res.render('dashboard', {message: "Recurso não inserido, já existe um recurso com o mesmo titulo!"});
        }});
    connection.query("INSERT INTO `resources` (`id`, `discipline_id`, `user_id`, `title`, `description`, `file_type`, `file_path`, `likes`, `reports`, `upload_date`) VALUES (NULL, ?, ?, ?, ?, ?, ?, '0', '0', ?);", [disciplina, id_user, titulo, descricao, file_type, file_path, data_str], function (error, results, fields) {
        if(error)throw error;
        res.render('dashboard', {message: "Recurso Inserido com sucesso!"});
    });

  
    // Do something with the file
  
    
});


app.get('/search_resource', (req, res) => {
    res.render('search_resource', { searchResults: "" });
  });
  
app.post('/search_resource', (req, res) => {
    const search = req.body.search;
    if (search === "") {
      res.render('search_resource', { searchResults: [] });
    } else {
      connection.query("SELECT * FROM resources WHERE title LIKE ? OR description LIKE ? ORDER BY likes DESC", ['%' + search + '%', '%' + search + '%'], function (error, results, fields) {
        if (error) {
          throw error;
        } else {
          res.render('search_resource', { searchResults: results });
        }
      });
    }
});
  

app.get('/view_resource/:id', (req, res) => {
    const resourceId = req.params.id;
    connection.query("SELECT * FROM resources WHERE id = ?", [resourceId], function (error, results, fields) {
        if (error) throw error;
        const file_path = results[0].file_path;
        const file_name = file_path.split("/").pop();
        res.render('view_resource', {resource: results[0], file_name: file_name});
    });
});
  


app.get('/logout', (req, res) => {
    res.clearCookie('id');
    res.redirect('/');
});


app.get('/report_recurso', (req, res) => {
    connection.query('SELECT * from disciplinas', function(error, results, fields) {
		if (error) throw error;
		
		res.render('report_recurso', {categories: results, subcategories: []});
	});
});


app.get('/get_subcategories/:category_id', (req, res) => {
    const categoryId = req.params.category_id;
    connection.query("SELECT * FROM resources WHERE discipline_id = ?;", [categoryId], function (error, results, fields) {
        if (error) throw error;
        res.send(results);
    });
});


app.post('/report_recurso', (req, res) => {
 var recurso = req.body.subcategory;
connection.query("UPDATE resources SET reports = reports + 1 WHERE id = ?", [recurso], function (error, results, fields) {
    if(error) throw error;
    res.render('dashboard', {message: "Recurso reportado com sucesso!"});
});
});


app.get('/likes/:id', (req, res) => {
    const resourceId = req.params.id;
    connection.query("UPDATE resources SET likes = likes + 1 WHERE id = ?", [resourceId], function (error, results, fields) {
        if (error) throw error;
    });
    connection.query("SELECT * FROM resources WHERE id = ?", [resourceId], function (error, results, fields) {
        const file_path2 = results[0].file_path;
        const file_name2 = file_path2.split("/").pop();
        res.render('view_resource', {resource: results[0], file_name: file_name2});
    });
});



app.get('/reports/:id', (req, res) => {
    const resourceId = req.params.id;
    connection.query("UPDATE resources SET reports = reports + 1 WHERE id = ?", [resourceId], function (error, results, fields) {
        if (error) throw error;
    });
    connection.query("SELECT * FROM resources WHERE id = ?", [resourceId], function (error, results, fields) {
        const file_path2 = results[0].file_path;
        const file_name2 = file_path2.split("/").pop();
        res.render('view_resource', {resource: results[0], file_name: file_name2});
    });
});

app.get('/ver_disciplinas', (req, res) => {
    connection.query("SELECT * FROM disciplinas", function (error, results, fields) {
        if (error) throw error;
        res.render('ver_disciplinas', {disciplinas: results});
    });
});


app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening at http://192.168.1.76:${port}`);
});
